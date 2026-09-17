const Demo = (function () {
  const VALUE = {pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000}
  const PAUSE = {select: 700, move: 900, restart: 4000}
  const CAST = {card: 950, origin: 850, choice: 1200, hold: 1700}
  const RECENT_MOVES = 6

  // What a target must be worth before the card is spent on it. The floor is ignored
  // once energy reaches CAST_FORCE_ENERGY.
  const CAST_FLOOR = {Fireball: 320, Transmute: 200, Blink: 140, "Summon Pawn": Infinity}
  const CAST_FORCE_ENERGY = 5

  const DEMO_NAME = "Challenger"
  const FILM = {width: 960, height: 600, density: 2}
  const SHOT = {radius: 284, height: -200, fov: 0.70, angle: 0.30, spin: -0.10}

  const events = []
  const recent = []
  const history = []

  let script = null, beat = 0
  let running = false, filming = false
  let orbitAngle = null, orbitClock = 0
  let timer = null

  const after = (ms, fn) => { timer = setTimeout(fn, ms) }
  const inGame = () => guiRenderer && guiRenderer.getState() === "game"
  const log = (event, detail) =>
    events.push(Object.assign({at: performance.now() / 1000, event}, detail))

  // Files a-h run along x; ranks 1-8 run up the board from the white side, which is y=7.
  const tileOf = name => ({x: name.charCodeAt(0) - 97, y: 8 - Number(name[1])})
  const tileName = tile => String.fromCharCode(97 + tile.x) + (8 - tile.y)
  const holds = (tiles, tile) => tiles.some(each => each.x === tile.x && each.y === tile.y)
  const centre = tile => (3.5 - Math.abs(3.5 - tile.x)) + (3.5 - Math.abs(3.5 - tile.y))
  const rank = tile => color === "white" ? 6 - tile.y : tile.y - 1
  const targets = (card, origin) =>
    CardDefinitions.getPlayTiles(card.name, chessBoard, color, origin)

  const eachPiece = (colour, visit) => {
    for (let x = 0; x < chessBoard.getWidth(); x++) {
      for (let y = 0; y < chessBoard.getHeight(); y++) {
        const piece = chessBoard.getTileData(x, y).piece
        if (piece && piece.getColor() === colour) visit(piece, x, y)
      }
    }
  }

  function legalMoves() {
    const moves = []
    eachPiece(color, (piece, x, y) => {
      for (const to of piece.getAvailableMoves(chessBoard, x, y)) moves.push({from: {x, y}, to, piece})
    })
    return moves
  }

  function attackedByOpponent() {
    const attacked = new Set()
    eachPiece(color === "white" ? "black" : "white", (piece, x, y) => {
      if (piece.getType() !== "pawn") {
        for (const to of PieceMovement.getAvailableMoves(chessBoard, x, y, piece)) {
          attacked.add(to.x + "," + to.y)
        }
        return
      }
      const forward = piece.getColor() === "white" ? -1 : 1
      attacked.add((x - 1) + "," + (y + forward))
      attacked.add((x + 1) + "," + (y + forward))
    })
    return attacked
  }

  // Deliberately shallow: it trades pieces off readily, and captures are where the
  // energy, and so the cards, come from.
  function score(move, attacked) {
    const target = chessBoard.getTileData(move.to.x, move.to.y).piece
    const gain = target ? VALUE[target.getType()] : 0
    const risk = attacked.has(move.to.x + "," + move.to.y) ? VALUE[move.piece.getType()] : 0
    let value = (gain - risk) * 10 + centre(move.to)
    if (move.piece.getType() !== "pawn" && move.from.y === (color === "white" ? 7 : 0)) value += 8
    if (recent.includes(tileName(move.to) + tileName(move.from))) value -= 40
    value += (color === "white" ? move.from.y - move.to.y : move.to.y - move.from.y) * 3
    return value + Math.random() * 6
  }

  function pick(moves) {
    const attacked = attackedByOpponent()
    let best = null, bestScore = -Infinity
    for (const move of moves) {
      const value = score(move, attacked)
      if (value > bestScore) { bestScore = value; best = move }
    }
    return best
  }

  // One entry per card, turning the board into every play it could make. origin is the
  // piece Blink lifts; choice answers the prompt Transmute opens.
  const PLAYS = {
    Fireball: card => targets(card).map(tile => {
      const piece = chessBoard.getTileData(tile.x, tile.y).piece
      return {card, target: tile, describe: piece.getType(), value: VALUE[piece.getType()] + centre(tile)}
    }),

    Transmute: card => targets(card).map(tile => ({
      card, target: tile, choice: "knight", describe: "a pawn",
      value: VALUE.knight - VALUE.pawn + rank(tile) * 10 + centre(tile)
    })),

    Blink: card => {
      const attacked = attackedByOpponent()
      const plays = []
      for (const from of targets(card)) {
        const piece = chessBoard.getTileData(from.x, from.y).piece
        const cornered = attacked.has(from.x + "," + from.y)
        for (const to of targets(card, from)) {
          if (attacked.has(to.x + "," + to.y)) continue
          const jump = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))
          plays.push({card, origin: from, target: to, describe: piece.getType(),
            value: (cornered ? VALUE[piece.getType()] : 0) + jump * 80 + centre(to)})
        }
      }
      return plays
    },

    "Summon Pawn": card => targets(card).map(tile => ({
      card, target: tile, describe: "an empty tile",
      value: VALUE.pawn + rank(tile) * 12 + centre(tile)
    }))
  }

  function chooseCast() {
    const energy = guiRenderer.ingameGuiElements.playerEnergyBar.getEnergy()
    let best = null
    for (const card of cardDataManager.playerDeck) {
      if (card.cost > energy || !PLAYS[card.name]) continue
      for (const play of PLAYS[card.name](card)) {
        if (play.value < CAST_FLOOR[card.name] && energy < CAST_FORCE_ENERGY) continue
        if (!best || play.value > best.value) best = play
      }
    }
    return best
  }

  // Fireball and Summon Pawn are one click. Blink wants the piece first and the landing
  // square second. Transmute asks a question in between.
  function cast(play) {
    log("cast", {card: play.card.name, on: play.describe})
    const step = {cast: play.card.name, on: tileName(play.target)}
    if (play.origin) step.from = tileName(play.origin)
    if (play.choice) step.into = play.choice
    history.push(step)
    play.card.iconBuffer.toggleSelected()

    const land = () => {
      chessBoard.selectTile(play.target.x, play.target.y)
      if (!play.choice) return after(CAST.hold, tick)
      after(CAST.choice, () => { pickChoice(play); after(CAST.hold, tick) })
    }

    after(CAST.card, () => {
      if (!play.origin) return land()
      chessBoard.selectTile(play.origin.x, play.origin.y)
      after(CAST.origin, land)
    })
  }

  // An open prompt swallows every board click, so failing to find the button has to
  // close it rather than strand the demo behind it.
  function pickChoice(play) {
    const label = play.choice.charAt(0).toUpperCase() + play.choice.slice(1)
    const button = guiRenderer.ingameGuiElementNames
      .filter(name => name.startsWith("cardChoice"))
      .map(name => guiRenderer.ingameGuiElements[name])
      .find(element => element && element.text === label)
    if (button) button.onClickCallBack()
    else guiRenderer.closeCardChoice()
  }

  function playMove(move) {
    const target = chessBoard.getTileData(move.to.x, move.to.y).piece
    if (target) log("capture", {piece: target.getType()})
    const name = tileName(move.from) + tileName(move.to)
    history.push({move: name})
    recent.push(name)
    if (recent.length > RECENT_MOVES) recent.shift()

    chessBoard.selectTile(move.from.x, move.from.y)
    after(PAUSE.select, () => {
      chessBoard.selectTile(move.to.x, move.to.y)
      after(PAUSE.move, tick)
    })
  }

  function tick() {
    if (!running) return
    if (gameData && gameData.result) {
      log("result", {outcome: gameData.result})
      return after(PAUSE.restart, begin)
    }
    if (!gameData || gameData.state !== "started" || gameData.turn !== color) return after(250, tick)
    if (script) return runBeat()

    const play = chooseCast()
    if (play) return cast(play)
    const move = pick(legalMoves())
    if (!move) return after(1000, tick)
    playMove(move)
  }

  // Only white is scripted; black is the server bot, which shuffles equally-scored
  // replies. Each beat is checked against the live board first, and one that will not
  // go stops the take rather than improvising the rest of it.
  function runBeat() {
    const step = script[beat]
    if (!step) {
      log("script", {state: "finished", beats: beat})
      script = null
      return tick()
    }
    beat++
    return step.cast ? runCastBeat(step) : runMoveBeat(step)
  }

  function runMoveBeat(step) {
    const from = tileOf(step.move.slice(0, 2)), to = tileOf(step.move.slice(2, 4))
    const piece = chessBoard.getTileData(from.x, from.y).piece
    if (!piece || piece.getColor() !== color) return abort("no " + color + " piece on " + step.move.slice(0, 2))
    if (!holds(piece.getAvailableMoves(chessBoard, from.x, from.y), to)) return abort(step.move + " is not legal here")
    playMove({from, to, piece})
  }

  function runCastBeat(step) {
    const card = cardDataManager.playerDeck.find(each => each.name === step.cast)
    const energy = guiRenderer.ingameGuiElements.playerEnergyBar.getEnergy()
    if (!card) return abort(step.cast + " is not in hand")
    if (card.cost > energy) return abort(step.cast + " costs " + card.cost + ", energy is " + energy)

    const target = tileOf(step.on)
    const origin = step.from ? tileOf(step.from) : null
    if (origin && !holds(targets(card), origin)) return abort(step.cast + " cannot lift " + step.from)
    if (!holds(targets(card, origin), target)) return abort(step.cast + " cannot be played on " + step.on)

    const piece = chessBoard.getTileData(target.x, target.y).piece
    cast({card, target, origin, choice: step.into, describe: piece ? piece.getType() : "an empty tile"})
  }

  function abort(reason) {
    log("script", {state: "aborted", beat, reason})
    console.warn("Demo: script aborted on beat " + beat + " - " + reason)
    script = null
    stop()
  }

  const transcript = () => history.map(step => Object.assign({}, step))

  function play(beats) {
    script = beats && beats.length ? beats.slice() : null
    beat = 0
    running = true
    Settings.moveHints = true
    if (!gameData) return begin()
    clearTimeout(timer)
    closeRoom()
    waitForFreshGame()
  }

  function waitForFreshGame() {
    if (!running) return
    if (gameData) return after(300, waitForFreshGame)
    begin()
  }

  // Pre-hook: the camera has to be in place before the scene it films gets drawn.
  const drawScene = window.draw
  window.draw = function () {
    // camAngle is the turn-to-face-your-colour ease the game runs itself. Let that
    // finish, then pick the orbit up from where it left the camera rather than snapping.
    if (running && inGame() && camAngle === null) {
      if (orbitAngle === null) orbitClock = (Math.atan2(cam.eyeZ, cam.eyeX) - SHOT.angle) / SHOT.spin
      orbitClock += deltaTime
      orbitAngle = SHOT.angle + SHOT.spin * orbitClock
      const radius = filming ? SHOT.radius : Math.hypot(cam.eyeX, cam.eyeZ)
      cam.eyeX = radius * Math.cos(orbitAngle)
      cam.eyeZ = radius * Math.sin(orbitAngle)
      if (filming) cam.eyeY = SHOT.height
    }
    return drawScene.apply(this, arguments)
  }

  function applyCanvasSize(w, h) {
    resizeCanvas(w, h)
    canvas2d.resizeCanvas(w, h)
    guiRenderer.width = w
    guiRenderer.height = h
    guiRenderer.guiScale = Math.min(w / 1920, h / 1080)
    guiRenderer.layoutCardGallery()
    cardDataManager.updateCardPositions()
  }

  // p5 rescales the camera and rederives the FOV on resize, so filming sets all of it
  // by hand and holds the canvas against the window.
  function applyShot() {
    cam.perspective(SHOT.fov, FILM.width / FILM.height, 10, 5000)
    const angle = orbitAngle === null ? SHOT.angle : orbitAngle
    cam.eyeX = SHOT.radius * Math.cos(angle)
    cam.eyeZ = SHOT.radius * Math.sin(angle)
    cam.eyeY = SHOT.height
  }

  const resizeToWindow = window.windowResized
  window.windowResized = function () {
    if (!filming) return resizeToWindow.apply(this, arguments)
    applyCanvasSize(FILM.width, FILM.height)
    applyShot()
  }

  function film(on) {
    const wanted = on !== false
    if (wanted === filming) return
    filming = wanted
    if (filming) {
      Settings.showFps = false
      guiRenderer.fpsReadout.updateText("")
      pixelDensity(FILM.density)
      applyCanvasSize(FILM.width, FILM.height)
      applyShot()
    } else {
      pixelDensity(displayDensity())
      applyCanvasSize(windowWidth, windowHeight)
    }
    return {width: FILM.width, height: FILM.height, density: FILM.density}
  }

  function record(seconds, {fps = 30, bitrate = 30e6, mimeType = "video/webm;codecs=vp8"} = {}) {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(fps), {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : "video/webm",
      videoBitsPerSecond: bitrate
    })
    const chunks = []
    recorder.ondataavailable = chunk => { if (chunk.data.size) chunks.push(chunk.data) }

    return new Promise(resolve => {
      const started = performance.now() / 1000
      recorder.onstop = () => resolve({
        blob: new Blob(chunks, {type: "video/webm"}),
        seconds: performance.now() / 1000 - started,
        events: events.filter(entry => entry.at >= started).map(entry =>
          Object.assign({}, entry, {at: Math.round((entry.at - started) * 100) / 100}))
      })
      recorder.start()
      setTimeout(() => recorder.stop(), seconds * 1000)
    })
  }

  function begin() {
    if (!running) return
    if (!socket || !chessBoard || !cardDataManager || !guiRenderer) return after(200, begin)
    if (gameData && gameData.result) return after(500, begin)
    orbitAngle = null
    history.length = 0
    recent.length = 0
    if (!gameData) {
      if (nickname !== DEMO_NAME) socket.emit("nickname", DEMO_NAME, null)
      playSolo()
    }
    tick()
  }

  function start() {
    if (running) return
    running = true
    Settings.moveHints = true
    begin()
  }

  function stop() {
    running = false
    orbitAngle = null
    clearTimeout(timer)
    if (typeof cardDataManager !== "undefined" && cardDataManager) {
      const card = cardDataManager.getSelectedCard()
      if (card) card.iconBuffer.toggleSelected()
      cardDataManager.clearPendingPlay()
    }
  }

  return {start, stop, play, transcript, film, record, shot: SHOT, events,
    isRunning: () => running}
})()

if (document.readyState === "complete") Demo.start()
else addEventListener("load", () => Demo.start())
