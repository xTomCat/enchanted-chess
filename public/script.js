//const { text } = require("express")

let chessBoard = null
let whiteTexture, blackTexture
let mousePressedInBoard = false
let guiGraphics
let gl
let socket
let nickname = "Anonymous"
let gameData = null
let mouseClickedLoc
let availableMoves = null
let color = "unset!"
let debug = false
let check
let time = 0.0
let timeUntilLeaving = null
let cam
let guiRenderer
let framesSinceMouseMoved = 0
let fps = 0
let canvas2d
let camY
let deltaTime = 0
let lastFrameTime = performance.now()
let totalTime = 0
let totalTimeFloor = 0
let targetFrameRate = 60
let selectedThisClick = false
let cardImages = {}
let gameFont
let camAngle = null, camTarget = 0
let statusHoldUntil = 0
let baseStatus = ""

function setStatus(text, holdSeconds = 0) {
  if (!guiRenderer || !guiRenderer.ingameGuiElements.statusText) return
  if (holdSeconds) statusHoldUntil = totalTime + holdSeconds
  else {
    baseStatus = text
    if (totalTime < statusHoldUntil) return
  }
  guiRenderer.ingameGuiElements.statusText.updateText(text)
}

function setCancelHint(text) {
  if (!guiRenderer || !guiRenderer.ingameGuiElements.cancelHint) return
  if (guiRenderer.ingameGuiElements.cancelHint.getText() === text) return
  guiRenderer.ingameGuiElements.cancelHint.updateText(text)
}
const cardHeight = 435
const cardWidth = 313

function trackLoads() {
  const pct = document.querySelector("#loading-screen .loading-pct")
  let total = 0, done = 0
  for (const name of ["loadImage", "loadFont", "loadModel"]) {
    const load = window[name]
    window[name] = path => (total++, load(path, () => {
      if (pct) pct.textContent = Math.round(++done / total * 100) + "%"
    }))
  }
}

function hideLoadingScreen() {
  const screen = document.getElementById("loading-screen")
  screen.classList.add("loaded")
  screen.addEventListener("transitionend", () => screen.remove(), {once: true})
}

function preload() {
  trackLoads()
  whiteTexture = loadImage("Assets/whiteMarble.jpg");
  blackTexture = loadImage("Assets/blackMarble.jpg");
  gameFont = loadFont("Assets/BubblegumSans-Regular.ttf");
  bishopModel = loadModel('Assets/models/chessBishop.obj');
  rookModel = loadModel('Assets/models/chessCastle.obj');
  knightModel = loadModel('Assets/models/chessKnight.obj');
  pawnModel = loadModel('Assets/models/chessPawn.obj');
  queenModel = loadModel('Assets/models/chessQueen.obj');
  kingModel = loadModel('Assets/models/chessKing.obj');
  title = loadImage('Assets/title.png');
  backofcard = loadImage('Assets/backofcard.png');
  menubackground = loadImage('Assets/background.jpg')
  personicon = loadImage('Assets/personicon.png')
  hamburgericon = loadImage('Assets/Hamburger_icon.svg.png')
  manadiamondred = loadImage('Assets/manadiamondred.png')
  manadiamondblue = loadImage('Assets/manadiamondblue.png')
  manadiamondgrey = loadImage('Assets/manadiamondgrey.png')
  manaorb = loadImage('Assets/manaorb.png')
  for (const card of CardDefinitions.CARDS) cardImages[card.name] = loadImage(card.image)

  
}

function setup() {
  Settings.load()
  socket = io()
  createCanvas(windowWidth, windowHeight, WEBGL)
  canvas2d = createGraphics(windowWidth, windowHeight)
  cam = createCamera()
  guiRenderer = new GuiRenderer(windowWidth, windowHeight, cam)
  chessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture).populateBoard()
  cardDataManager = new CardDataManager()
  const invitedRoom = new URLSearchParams(location.search).get('room')
  if (invitedRoom && /^[A-Za-z0-9]{1,12}$/.test(invitedRoom)) {
    socket.emit('joinGame', invitedRoom, cardDataManager.deckAsServerData())
    history.replaceState(null, '', location.pathname)
  }
  rectMode(CENTER)
  gl = this._renderer.GL;
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT)
  //cam.eyeY = -250
  cam._orbit(
    0, 0, -0.55
    );
  textFont(gameFont)
  textSize(5)
  textAlign(CENTER)
  imageMode(CORNERS)
  

  socket.on('move', (move) => {
    chessBoard.move(move)
  })

    socket.on('moveRejected', (data) => {
    // Resync board state from server
    if (gameData) {
      compareBoard(chessBoard, gameData.board)
    }
  })

  socket.on('nicknameChanged', (changedNickname) => {
    nickname = changedNickname
    if (guiRenderer) {
      guiRenderer.setButtonText("nickname", nickname)
      guiRenderer.setButtonText("playerNamePlate", nickname)
    }
  })

  socket.on('error', message => setStatus(message, 2))

  socket.on('receivePlayCard', (pColor, index, x, y, card, extra) => {
    if (pColor == color) {
      cardDataManager.playCard(index, x, y, extra)
     } else {
       const plate = guiRenderer.ingameGuiElements.opponentNamePlate
       cardDataManager.flyCard(card, plate.screenCenter(guiRenderer.guiScale), x, y, extra)
       cardDataManager.activateCardEffect(card, x, y, true)
     }
  })

  socket.on('roomCreated', (roomCode) => {
    room = roomCode
    if (guiRenderer) {
      guiRenderer.setScreen("game")
    }

  })
  

  function returnToMenu() {
    room = null
    statusHoldUntil = 0
    setStatus("Waiting for players...")
    timeUntilLeaving = null
    check = null
    setCancelHint("")
    if (chessBoard) chessBoard.clearBoard().populateBoard()
    color = "unset!"
    gameData = null
    cardDataManager.resetDeck()
    camAngle = null
    cam.eyeZ = Math.hypot(cam.eyeX, cam.eyeZ)
    cam.eyeX = 0
    if (guiRenderer) {
      guiRenderer.setScreen("menu")
    }
  }

  socket.on('roomClosed', () => {
    returnToMenu()
  })

  // The server forgets a game as soon as we drop, so a reconnect means the room
  // we were in is gone. Bail out to the menu rather than sitting in a dead game
  // where moves are silently ignored.
  let hasConnectedBefore = false

  socket.on('disconnect', () => {
    setStatus('Connection lost - reconnecting...', 60)
  })

  socket.on('connect', () => {
    if (hasConnectedBefore && gameData) {
      returnToMenu()
    }
    hasConnectedBefore = true
  })

  socket.on('gameData', (gameDataReceived) => { 
    gameData = gameDataReceived
    if (guiRenderer) {
      let opponentNamePlate = guiRenderer.ingameGuiElements.opponentNamePlate
      let roomCodeText = guiRenderer.ingameGuiElements.gameTime
      let opponent
      switch (color) {
        case "white":
          player = gameData.players[0]
          opponent = gameData.players[1]
          break;
        case "black":
          player = gameData.players[1]
          opponent = gameData.players[0]
          break;
        default:
          opponent = null
          break;
      }
      let roomCodeAsString = ""
      if (!gameData.solo) {
        roomCodeAsString = "Room code: " + gameData.roomCode.toString() +
          (gameData.state === "started" ? "" : " - click to copy invite")
      }
      if (roomCodeText.getText() !== roomCodeAsString) {
        roomCodeText.updateText(roomCodeAsString)
      }
      if (player.energy !== guiRenderer.ingameGuiElements.playerEnergyBar.energy) {
        guiRenderer.ingameGuiElements.playerEnergyBar.update(player.energy)
      }
      if (gameData.state == "started") {
        if (guiRenderer.getState() == "menu") {
          guiRenderer.setScreen("game")
        }
        if (opponentNamePlate.getText() !== opponent.name) {
          opponentNamePlate.updateText(opponent.name)
        }
        if (opponent.energy !== opponentNamePlate.energy) {
          opponentNamePlate.update(opponent.energy)
        }
        setStatus(gameData.turn == color ? "It's your turn!" : "It's " + opponent.name + "'s turn!")
        
        
        
    }
  }
    compareBoard(chessBoard, gameDataReceived.board)
    if (chessBoard && gameDataReceived.lastMove) {
      let piece = chessBoard.getTileData(gameDataReceived.lastMove.to.x, gameDataReceived.lastMove.to.y).piece;
       if (piece) {
        piece.lastMove = gameDataReceived.lastMove;
        
      }
    }
    check = gameData.check
  })


  socket.on('initBoard', (board) => {
    chessBoard.clearBoard()
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j].piece) {
          chessBoard.setTileData(i, j, {piece: new ChessPiece(board[i][j].piece.type, board[i][j].piece.color)})
        }
      }
    }
    chessBoardArray = chessBoard.getBoard()
  })

  socket.on('setColor', (setColor) => {
    color = setColor
    camAngle = HALF_PI
    camTarget = setColor === "black" ? PI : 0
  })

  socket.on('closeCancelled', () => {
    timeUntilLeaving = null
    setCancelHint("")
  })

  socket.on('leavingSoon', (count) => {
    timeUntilLeaving = count
    if (guiRenderer) {
      setStatus("Leaving in " + timeUntilLeaving + " seconds")
      setCancelHint(gameData && gameData.result ? "" : "Click again to cancel")
    }
    if (timeUntilLeaving == 0) {
      timeUntilLeaving = null
      setStatus("Leaving...")
    }
  })

}

function compareBoard(chessBoard, board) {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j].piece) {
        if (chessBoard.getTileData(i, j).piece) {
          if (chessBoard.getTileData(i, j).piece.lastMove || board[i][j].piece.lastMove) {
            if (chessBoard.getTileData(i, j).piece.lastMove !== board[i][j].piece.lastMove) {
              chessBoard.getTileData(i, j).piece.lastMove = board[i][j].piece.lastMove
            }
          }
          if (chessBoard.getTileData(i, j).piece.type !== board[i][j].piece.type || chessBoard.getTileData(i, j).piece.color !== board[i][j].piece.color) {
            chessBoard.setTileData(i, j, {piece: new ChessPiece(board[i][j].piece.type, board[i][j].piece.color)})
          }
        } else {
          chessBoard.setTileData(i, j, {piece: new ChessPiece(board[i][j].piece.type, board[i][j].piece.color)})
        }
      } else {
        chessBoard.setTileData(i, j, {piece: null})
      }
      
    }
  }
}

function closeRoom() {
  if (!gameData) {
    return
  }
  if (gameData.state === "closing") {
    if (gameData.result) return
    socket.emit('cancelCloseRoom', gameData.roomCode)
  } else {
    socket.emit('closeRoom', gameData.roomCode)
  }
}

function createRoom() {
  socket.emit('createRoom', cardDataManager.deckAsServerData())
}

function playSolo() {
  socket.emit('createRoom', cardDataManager.deckAsServerData(), true)
}

function askText(label, maxLength, inputMode) {
  const box = document.getElementById("ask")
  const input = document.getElementById("ask-input")
  document.getElementById("ask-label").textContent = label
  input.value = ""
  input.maxLength = maxLength
  input.inputMode = inputMode || "text"
  box.hidden = false
  return new Promise(resolve => {
    const close = result => { box.hidden = true; box.onclick = null; resolve(result) }
    box.onmousedown = event => event.stopPropagation()
    box.onsubmit = event => { event.preventDefault(); close(input.value.trim() || null) }
    input.onkeydown = event => { event.stopPropagation(); if (event.key === "Escape") close(null) }
    setTimeout(() => {
      input.focus()
      box.onclick = event => { if (event.target === box) close(null) }
    }, 0)
  })
}

function promptNickName() {
  askText("Enter your nickname", 20).then(nickname => {
    if (nickname) socket.emit('nickname', nickname, gameData ? gameData.roomCode : null)
  })
}

function copyInviteLink() {
  if (!gameData || gameData.solo) return
  const link = location.origin + location.pathname + '?room=' + gameData.roomCode
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => setStatus('Invite link copied!', 3), () => setStatus(link, 15))
  } else {
    setStatus(link, 15)
  }
}

function joinGameByRoomCode() {
  askText("Enter the room code", 6, "numeric").then(roomCode => {
    if (roomCode) socket.emit('joinGame', roomCode, cardDataManager.deckAsServerData())
  })
}

function easeOutElastic (t, b, c, d) {
  let s = 1.70158;
  let p = 0;
  let a = c;
  if (t == 0) return b;
  if ((t /= d) == 1) return b + c;
  if (!p) p = d * .3;
  if (a < Math.abs(c)) {
      a = c;
      s = p / 4;
  }
  else s = p / (2 * Math.PI) * Math.asin(c / a);
  return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
}

function easeOutQuad (t, b, c, d) {
  return -c * (t /= d) * (t - 2) + b;
}

const eased = t => easeOutQuad(constrain(t, 0, 1), 0, 1, 1)


function draw() {
  currentFrameTime = performance.now()
  deltaTime = (currentFrameTime - lastFrameTime)/1000
  lastFrameTime = currentFrameTime 
  totalTime += deltaTime
  if (statusHoldUntil && totalTime > statusHoldUntil) { statusHoldUntil = 0; setStatus(baseStatus) }
  framesSinceMouseMoved++
  background(100)
  guiRenderer.renderBackground()
  if (frameCount % targetFrameRate == 0) {
    fps = round(frameRate())
    if (Settings.showFps) guiRenderer.fpsReadout.updateText(fps + " FPS")
  }
  if (camAngle !== null && guiRenderer.getState() == "game") {
    camAngle += (camTarget - camAngle) * min(1, deltaTime * 4)
    const r = Math.hypot(cam.eyeX, cam.eyeZ)
    cam.eyeX = r * cos(camAngle)
    cam.eyeZ = r * sin(camAngle)
    if (abs(camTarget - camAngle) < 0.002) camAngle = null
  }
  cam.lookAt(0,0,0)
  ambientLight(62, 62, 72);
  directionalLight(255, 246, 228, -0.35, 0.9, -0.25);
  directionalLight(96, 116, 150, 0.45, -0.5, 0.6);
  lightFalloff(1, 0, 0)
  noStroke()

  orbit: if(!mousePressedInBoard){
    if (guiRenderer) {
        if (guiRenderer.getState() == "menu") {
          //cam.lookAt(50, 0, 0)
          //cam._orbit(0.005, 0, 0)
          push()
          scale(guiRenderer.guiScale)
          cam.eyeY = -100
          pop()
          break orbit;
        }
        else {

          const sensitivity = Settings.cameraSpeed * (Settings.invertCamera ? -1 : 1)
          orbitControl(sensitivity, sensitivity)
        }
    }
  }
  if (chessBoard) {
    chessBoard.renderBoard()
  }
  push()
  guiRenderer.renderGUI()
  //guiRenderer.guiRendererCanvas.clear()
  //image(guiRenderer.guiRendererCanvas, 0, 0, windowWidth-15, windowHeight-15)
  pop()

  if (frameCount === 1) hideLoadingScreen()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (canvas2d) {
    canvas2d.resizeCanvas(windowWidth, windowHeight)
  }
  if (guiRenderer) {
    guiRenderer.width = windowWidth;
    guiRenderer.height = windowHeight;
    const baseWidth = 1920;
    const baseHeight = 1080;
    guiRenderer.guiScale = Math.min(guiRenderer.width / baseWidth, guiRenderer.height / baseHeight);
    guiRenderer.layoutCardGallery()
}
if (cardDataManager) {
  cardDataManager.updateCardPositions()
}
}


function keyPressed() {
  if (key === "F2") {
    debug = !debug
  }
  if (keyCode === ESCAPE && guiRenderer) {
    guiRenderer.closeOverlay()
  }
}

function mousePressed() {
  if (chessBoard) {
    let hoveredTile = chessBoard.getSelectedTile(mouseX, mouseY)
  if (hoveredTile) {
    mousePressedInBoard = true
    chessBoard.selectTile(hoveredTile.x, hoveredTile.y)
  } else{
    mousePressedInBoard = false
  }
}
mouseClickedLoc = {x: mouseX, y: mouseY}
if (guiRenderer) {
  guiRenderer.clickGUIButton(mouseClickedLoc.x, mouseClickedLoc.y)
  if (cardDataManager) {
    for (let card of cardDataManager.playerDeck) {
      card.iconBuffer.handleClick(mouseClickedLoc.x, mouseClickedLoc.y, guiRenderer.guiScale)
    }
  }
}

}


function mouseReleased() {
  mousePressedInBoard = false
}

function mouseMoved() {
  framesSinceMouseMoved = 0
}

function mouseToHUDCoords(mouseX, mouseY) {
  // Convert mouse coordinates (top-left origin) to HUD coordinates (center origin)
  let hudX = (mouseX - windowWidth / 2)/8;
  let hudY = (mouseY - windowHeight / 2)/8;
  return { x: hudX, y: hudY };
}


function worldToBoardIndices(worldX, worldZ, chessBoardObject) {
  let tileSize = chessBoardObject.getTileSize();
  let boardWidth = chessBoardObject.getWidth();
  let boardHeight = chessBoardObject.getHeight();

  let halfBoardWidth = (boardWidth * tileSize) / 2;
  let halfBoardHeight = (boardHeight * tileSize) / 2;

  let boardZ = Math.floor((worldX + halfBoardWidth) / tileSize);
  let boardX = Math.floor((worldZ + halfBoardHeight) / tileSize);

  if (boardX >= 0 && boardX < boardWidth && boardZ >= 0 && boardZ < boardHeight) {
    return { x: boardX, y: boardZ };
  } else {
    return null;
  }
}

function boardToWorldCoords(boardX, boardY, chessBoardObject) {
  let tileSize = chessBoardObject.getTileSize();
  let boardWidth = chessBoardObject.getWidth();
  let boardHeight = chessBoardObject.getHeight();

  let halfBoardWidth = (boardWidth * tileSize) / 2;
  let halfBoardHeight = (boardHeight * tileSize) / 2;

  let worldX = (boardY * tileSize) - halfBoardWidth;
  let worldZ = (boardX * tileSize) - halfBoardHeight;

  return { x: worldX, z: worldZ };
}

function textWithShadow2dCanvas(string, x, y) {
  canvas2d.fill(0)
  canvas2d.text(string, x + 4, y + 4)
  canvas2d.fill(255)
  canvas2d.text(string, x, y)
}

function textWithShadow(string, x, y) {
  fill(0)
  text(string, x + 0.5, y + 0.5)
  fill(255)
  text(string, x, y)
}
