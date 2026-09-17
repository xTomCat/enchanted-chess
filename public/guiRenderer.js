
const OVERLAY_SECONDS = 0.9
// Biggest a card is allowed to get.
const CARD_GALLERY_SCALE = 0.45
const CARD_GALLERY_GAP = 55
const GALLERY_TOP = 210, GALLERY_BOTTOM = 950, CARD_LABELS = 110
const OVERLAY_MARGIN = 110
// Shown in the blurb line when no card is hovered.
const CARD_BLURB_HINT = "Hover a card to read what it does"
const OPTION_SPACING = 72
const OFF_ON = { values: [false, true], labels: ["Off", "On"] }
const SWATCH_SIZE = 76
// x, y, isDark for each quarter. Same crop on every swatch, so only the colour changes.
const SWATCH_CROPS = [[300, 0, true], [130, 40, false], [40, 130, false], [400, 300, true]]
// Where the board sits behind each overlay: x, y, z, tilt.
const OVERLAY_BOARD = { cards: [-80, 120, 0, 0.4], options: [40, 40, -40, 0.3] }
// label, Settings key, choices, tooltip
const OPTION_LIST = [
  ["Fullscreen", "fullscreen", OFF_ON, "Toggle fullscreen. Press ESC to close."],
  ["Show FPS", "showFps", OFF_ON, "Toggle the frame rate in the bottom corner."],
  ["Invert camera drag", "invertCamera", OFF_ON, "Flip which way the board turns as you drag."],
  ["Reduce motion", "reduceMotion", OFF_ON, "Stop the menu bouncing and the board spinning."],
  ["Move hints", "moveHints", OFF_ON, "Light up where a selected piece may legally go."],
  ["Camera speed", "cameraSpeed", { values: [0.5, 1, 2], labels: ["Low", "Medium", "High"] },
    "How far the board turns for the same drag."]
]

class GuiRenderer {
    constructor(width, height, cam) {
      this.width = width
      this.height = height
      this.cam = cam
      this.screenSwitchTimeStamp = 0
      this.currentScreen = ["menu"]
      this.guiScale = 1
      this.guiRendererCanvas = createGraphics(width, height)
      const baseWidth = 1920;
      const baseHeight = 1080;
      this.guiScale = Math.min(this.width / baseWidth, this.height / baseHeight);
      this.menuButtonNames = ["singlePlayer", "createARoom", "joinARoom", "cardDeck", "options", "nickname"];
      this.ingameGuiElementNames = ["hamburgerMenu", "gameTime",
        "opponentNamePlate", "playerNamePlate", "playerEnergyBar", "statusText",
        "cancelHint"]
        //"playerNamePlate", "playerEnergy", 
        //"card1", "card2", "card3", "card4", 
        //"chatBox", "chatInput"]
      this.ingameGuiElements = {}
      this.cardChoiceOpen = false
      this.menuButtons = {}
      this.menuButtons.singlePlayer =
        new TextButton(630, 50, 50, 620)
          .setHoverEffect(20, 0, 0.5)
          .setText("Single player")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(playSolo)
          .updateGraphics()
      this.menuButtons.createARoom = 
        new TextButton(630, 50, 50, 690)
          .setHoverEffect(20, 0, 0.5)
          .setText("Create a room")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(createRoom)
          .updateGraphics()
      this.menuButtons.joinARoom =
        new TextButton(470, 50, 50, 760)
          .setHoverEffect(20, 0, 0.5)
          .setText("Join a room")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(joinGameByRoomCode)
          .updateGraphics()
      this.menuButtons.cardDeck =
        new TextButton(380, 50, 50, 830)
          .setHoverEffect(20, 0, 0.5)
          .setText("Card Deck")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(() => this.openOverlay("cards"))
          .updateGraphics()
      this.menuButtons.options =
        new TextButton(330, 50, 50, 900)
          .setHoverEffect(20, 0, 0.5)
          .setText("Options")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(() => this.openOverlay("options"))
          .updateGraphics()
      this.menuButtons.nickname = 
        new TextButton(330, 50, -50, 40)
          .setHoverEffect(-20, 0, 0.5)
          .setText("Anonymous")
          .setTextSize(50)
          .setAlign(RIGHT)
          .onClick(promptNickName)
          .updateGraphics()
      let graphic = personicon.get(0, 0 , personicon.width, personicon.height)
      this.menuButtons.personIcon = 
        new ImageButton(graphic.width, graphic.height, -50, 10)
          .setImage(graphic)
          .setScale(0.19)
          .setBounceEffect(0, 10, 0.05)
          .setHoverEffect(0, -20, 0.5)
          .updateGraphics()
          .setShadow(true)
      this.menuButtons.nickname.addComponent(this.menuButtons.personIcon)

      this.overlay = null
      this.overlayAt = 0
      this.overlayFrom = 0
      this.overlayShut = false
      this.overlays = {}
      this.overlayBack =
        new TextButton(200, 50, 50, 40)
          .setHoverEffect(20, 0, 0.5)
          .setText("Back")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(() => this.closeOverlay())
          .updateGraphics()
      this.fpsReadout = new TextButton(200, 40, -50, -30)
        .setText("0 FPS")
        .setTextSize(32)
        .setAlign(RIGHT)
        .setColor(178, 196, 230)
        .anchorToBottom(true)
        .updateGraphics()
      this.registerOverlay("cards", "Your Cards", this.buildCardGallery())
      this.registerOverlay("options", "Options", this.buildOptions())


      
      this.menuLetters = []
      this.letterWidth = 100 //Width of the letter in pixels
      this.letterHeight = 242 //Height of the letter in pixels
      this.topLetters = 9 //Amount of letters on top of the image
      this.bottomLetters = 5 //Amount of letters on the bottom of the image
      let letterImage = title //PNG containing all the letters
      //Loop through the image and create a graphics object for each letter, based on their dimensions
      for (let i = 0; i <= this.topLetters; i++) {
        let letterX = 50 + ((100) * (i)); // X position of the letter
        let letterY = 80; // Y position of the letter
        let cutOut = letterImage.get(this.letterWidth * i, 0, this.letterWidth, this.letterHeight)
        let letter = new ImageButton(this.letterWidth, this.letterHeight, letterX, letterY)
          .setImage(cutOut)
          .setHoverEffect(0, -20, 0.5)
          .setBounceEffect(0, 10, 0.05, i)
          .updateGraphics()
        //letter.image(letterImage, 0, 0, this.letterWidth, this.letterHeight, this.letterWidth*i, 0, this.letterWidth, this.letterHeight)
        this.menuLetters.push(letter)
      }
      for (let i = 0; i <= this.bottomLetters; i++) {
        let letterX = 50 + ((100) * ((i))); // X position of the letter
        let letterY = 330; // Y position of the letter
        let cutOut = letterImage.get(this.letterWidth * (i), 297, this.letterWidth, this.letterHeight)
        let letter = new ImageButton(this.letterWidth, this.letterHeight, letterX, letterY)
          .setImage(cutOut)
          .setHoverEffect(0, -20, 0.5)
          .setBounceEffect(0, 10, 0.05, i + this.topLetters)
          .updateGraphics()
        this.menuLetters.push(letter)
      }
      let cardX = 60 + ((100) * (this.bottomLetters)); // X position of the card
      let cardY = 380; // Y position of the card#
      let card2 = new ImageButton(100, 150, cardX , cardY )
        .setImage(backofcard)
        .setHoverEffect(0, -20, 0.5)
        .setBounceEffect(0, 10, 0.05, this.topLetters + this.bottomLetters + 1)
        .setRotateEffect(PI / 16, PI / 2, 0.05)
        .setScale(1.3)
        .updateGraphics()

      let card2Shadow = new ImageButton(100, 150, cardX +5, cardY + 5) //Need to do this so it displays behind the front one
        .setImage(createGraphics(100, 150).fill(0).rect(0, 0, 100, 150, 15, 15, 15, 15))
        .setHoverEffect(0, -20, 0.5)
        .setBounceEffect(0, 10, 0.05, this.topLetters + this.bottomLetters + 1)
        .setScale(1.3)
        .setRotateEffect(PI / 16, PI / 2, 0.05)
        .updateGraphics()

      let card = new ImageButton(100, 150, cardX, cardY)
        .setImage(backofcard)
        .setHoverEffect(0, -20, 0.5)
        .setBounceEffect(0, 10, 0.05, this.topLetters + this.bottomLetters)
        .setRotateEffect(PI / 8, PI / 2, 0.05)
        .setScale(1.3)
        .updateGraphics()
        .setShadow(true)

      this.menuLetters.push(card2Shadow)
      this.menuLetters.push(card)
      this.menuLetters.push(card2)

      this.ingameGuiElements.hamburgerMenu = new ImageButton(50, 50, 50, 50)
        .setImage(hamburgericon)
        .setHoverEffect(0, -20, 0.5)
        .onClick(closeRoom)
        .updateGraphics()
        .setShadow(true)

      this.ingameGuiElements.gameTime = new TextButton(50, 50, 50, 50)
        .setText("00:00")
        .setAlign(CENTER)
        .setTextSize(50)
        .onClick(copyInviteLink)
        .updateGraphics()

      this.ingameGuiElements.statusText = new TextButton(50, 50, 50, 100)
        .setText("Waiting for players...")
        .setAlign(CENTER)
        .setTextSize(50)
        .updateGraphics()

      this.ingameGuiElements.cancelHint = new TextButton(50, 50, 50, 160)
        .setText("")
        .setAlign(CENTER)
        .setTextSize(30)
        .updateGraphics()

      this.ingameGuiElements.opponentNamePlate = new OpponentNamePlate(350, 150, -400, 50)
        .setAlign(RIGHT)

      this.ingameGuiElements.playerNamePlate = new PlayerNamePlate(350*0.75, 150*0.5, 50, -250)
        .setAlign(LEFT)
        .anchorToBottom(true)

      this.ingameGuiElements.playerEnergyBar = new PlayerEnergyBar(600, 155, 50, -50)
        .setAlign(LEFT)
        .anchorToBottom(true)



      


      //this.ingameGuiElements.chatInput.onClick(this.ingameGuiElements.chatInput.openChatBox)
        

      


      

      
    }
      
      

    setButtonText(buttonName, text) {
      if (this.menuButtons[buttonName]) {
        this.menuButtons[buttonName].setText(text).updateGraphics()
      } else if (this.ingameGuiElements[buttonName]) {
        this.ingameGuiElements[buttonName].updateText(text)
      }
    }

    back() {
      this.currentScreen.pop()
    }

    // A label you cannot click.
    label(text, size, { colour, align = LEFT, fade, y = 0 } = {}) {
      const button = new TextButton(400, size + 10, 0, y).setText(text).setTextSize(size).setAlign(align)
      if (colour) button.setColor(...colour)
      if (fade) button.setFadeIn(true, 6)
      return button.updateGraphics()
    }

    // An overlay screen: heading plus everything on it.
    registerOverlay(name, title, elements = []) {
      const heading = this.label(title, 80, { align: CENTER, y: 150 })
      this.overlays[name] = { title: heading, elements: elements }
      return this.overlays[name]
    }

    // One settings row; clicking moves to the next value.
    settingButton(label, key, choices, help) {
      const button = new TextButton(700, 60, 0, 0)
        .setTextSize(44)
        .setAlign(LEFT)
        .setHoverEffect(20, 0, 0.5)
      button.setToolTip(this.label(help, 30, { colour: [198, 212, 238], fade: true }))
      const show = () => button.updateText(label + ":  " + choices.labels[Math.max(0, choices.values.indexOf(Settings[key]))])
      button.onClick(() => {
        Settings.set(key, choices.values[(choices.values.indexOf(Settings[key]) + 1) % choices.values.length])
        show()
      })
      show()
      return button
    }

    // Previews cut from the real textures.
    buildFlavourSwatches() {
      const half = SWATCH_SIZE / 2
      return BOARD_FLAVOURS.map((flavour, index) => {
        const preview = createGraphics(SWATCH_SIZE, SWATCH_SIZE)
        preview.pixelDensity(1)
        const quadrants = wanted => SWATCH_CROPS.forEach(([sx, sy, dark], i) => {
          if (dark !== wanted) return
          preview.image(dark ? blackTexture : whiteTexture,
            (i % 2) * half, Math.floor(i / 2) * half, half, half, sx, sy, 160, 160)
        })
        quadrants(true); paintFlavour(preview, flavour); quadrants(false)
        preview.noFill(); preview.strokeWeight(6)
        preview.stroke(...(flavour.ramp ? flavour.ramp[1] : [255, 255, 255]))
        preview.rect(3, 3, SWATCH_SIZE - 6, SWATCH_SIZE - 6)
        const button = new ImageButton(SWATCH_SIZE, SWATCH_SIZE, 0, 0)
          .setImage(preview)
          .setHoverEffect(0, -10, 0.5)
          .onClick(() => {
            Settings.set("boardFlavour", index)
            chessBoard.setFlavour(flavour)
            this.flavourSwatches.forEach((swatch, i) => swatch.setSelected(i === index))
            this.showFlavourName()
          })
          .updateGraphics()
          .setShadow(true)
        button.setToolTipWhileSelected(false)
        button.setToolTip(this.label(flavour.name, 34, { colour: [198, 212, 238], fade: true }))
        button.setSelected(index === Settings.boardFlavour)
        return button
      })
    }

    showFlavourName() {
      this.boardLabel.updateText("Board flavour:  " + BOARD_FLAVOURS[Settings.boardFlavour].name)
    }

    // The positions never change, so this does not re-run when the window resizes.
    buildOptions() {
      this.flavourSwatches = this.buildFlavourSwatches()
      this.boardLabel = this.label("", 44)
      this.showFlavourName()
      this.options = OPTION_LIST.map(option => this.settingButton(...option))
      this.controlsHint = new TextButton(700, 260, 0, 0)
        .setTitle("Controls", 44)
        .setText("Drag to orbit, scroll to zoom<br>" +
                 "Click a piece, then a highlighted tile<br>" +
                 "Click a card, then a target tile<br>" +
                 "Escape closes this screen")
        .setTextSize(32)
        .setAlign(LEFT)
        .updateGraphics()
      const x = OVERLAY_MARGIN
      this.options.forEach((button, i) => {
        button.setPosition(x, 230 + i * OPTION_SPACING)
        button.toolTip.setPosition(x + 480, 238 + i * OPTION_SPACING)
      })
      const afterOptions = 250 + this.options.length * OPTION_SPACING
      this.boardLabel.setPosition(x, afterOptions)
      const swatchRow = afterOptions + 78
      this.flavourSwatches.forEach((swatch, i) => {
        swatch.setPosition(x + i * (SWATCH_SIZE + 22), swatchRow)
        swatch.toolTip.setPosition(x + BOARD_FLAVOURS.length * (SWATCH_SIZE + 22), swatchRow + 20)
      })
      this.controlsHint.setPosition(x, afterOptions + 78 + SWATCH_SIZE + 45)
      return this.options.concat(this.boardLabel, this.flavourSwatches, this.controlsHint)
    }

    // Art, name and cost per card.
    buildCardGallery() {
      this.cardGallery = CardDefinitions.CARDS
        .filter(card => card.name !== "Placeholder")
        .map((card, i) => {
          const art = cardImages[card.name]
          return {
            description: card.description.split("<br><br>Cost")[0].replace(/<br>/g, " "),
            art: new ImageButton(art.width, art.height, 0, 0)
              .setImage(art)
              .setScale(CARD_GALLERY_SCALE)
              .setHoverEffect(0, -25, 0.5)
              .setBounceEffect(0, 8, 0.05, i)
              .setBufferDensity(CARD_GALLERY_SCALE * 2)
              .updateGraphics()
              .setShadow(true),
            name: this.label(card.name, 36),
            cost: this.label("Cost " + card.cost, 28, { colour: [178, 196, 230] })
          }
        })
      this.cardBlurb = this.label(CARD_BLURB_HINT, 32, { align: CENTER })
      this.layoutCardGallery()
      return this.cardGallery.flatMap(card => [card.art, card.name, card.cost]).concat(this.cardBlurb)
    }

    layoutCardGallery() {
      if (!this.cardGallery) return
      const n = this.cardGallery.length, middle = this.width / (2 * this.guiScale)
      let best = { scale: 0 }
      for (let r = 1; r <= n; r++) {
        const cols = Math.ceil(n / r), rowHeight = (GALLERY_BOTTOM - GALLERY_TOP) / r - CARD_GALLERY_GAP
        const scale = Math.min(CARD_GALLERY_SCALE, (rowHeight - CARD_LABELS) / 890,
          (middle * 2 - 2 * OVERLAY_MARGIN - (cols - 1) * CARD_GALLERY_GAP) / (cols * 640))
        if (scale > best.scale) best = { scale, rows: r, cols, rowHeight }
      }
      const { scale, rows, cols, rowHeight } = best
      const w = 640 * scale, h = 890 * scale
      const centred = (button, x) => (x + (w - button.getGraphicsObject().width) / 2)
      this.cardGallery.forEach((card, i) => {
        const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols)
        const x = middle - (inRow * w + (inRow - 1) * CARD_GALLERY_GAP) / 2 +
          (i % cols) * (w + CARD_GALLERY_GAP)
        const y = GALLERY_TOP + row * (rowHeight + CARD_GALLERY_GAP)
        card.art.setScale(scale).setPosition(x, y)
        card.name.setPosition(centred(card.name, x), y + h + 15)
        card.cost.setPosition(centred(card.cost, x), y + h + 62)
      })
      this.cardBlurb.setPosition(0, GALLERY_TOP + (rows - 1) * (rowHeight + CARD_GALLERY_GAP) + h + CARD_LABELS + 40)
    }

    // Reads how far it has got first, so turning back part way through stays smooth.
    transitionOverlay(shut) {
      this.overlayFrom = this.overlayAmount()
      this.overlayAt = totalTime
      this.overlayShut = shut
    }

    openOverlay(name) {
      if (this.overlays[name]) { this.transitionOverlay(false); this.overlay = name }
    }

    closeOverlay() {
      if (this.overlay && !this.overlayShut) this.transitionOverlay(true)
    }

    // 0 is the menu, 1 is the overlay, eased over OVERLAY_SECONDS.
    overlayAmount() {
      if (!this.overlay) return 0
      const p = constrain((totalTime - this.overlayAt) / OVERLAY_SECONDS, 0, 1)
      if (this.overlayShut && p >= 1) this.overlay = null
      return lerp(this.overlayFrom, this.overlayShut ? 0 : 1, p * p * (3 - 2 * p))
    }

    // Keeps the last value so the board does not jump when the overlay closes.
    boardOffset() {
      if (this.overlay) this.lastBoardOffset = OVERLAY_BOARD[this.overlay]
      return this.lastBoardOffset || OVERLAY_BOARD.cards
    }

    overlayButtons() {
      const overlay = this.overlays[this.overlay]
      return overlay ? [this.overlayBack, overlay.title, ...overlay.elements] : []
    }

    // slideX/slideY are where the group sits at amount 0.
    drawElements(buttons, amount, slideX = 0, slideY = 0) {
      canvas2d.drawingContext.globalAlpha = amount
      for (const button of buttons) {
        canvas2d.push()
        button.drawIcon(canvas2d, this.guiScale,
          (1 - amount) * slideX * this.guiScale * (button.align === RIGHT ? -1 : 1),
          (1 - amount) * slideY * this.guiScale)
        canvas2d.pop()
      }
      canvas2d.drawingContext.globalAlpha = 1
    }

    setScreen(screen) {
      this.currentScreen.push(screen)
      this.screenSwitchTimeStamp = totalTime*targetFrameRate
    }


    // canvas2d is a 2w x 2h quad at z=100. The view is 2*100*tan(fov/2) tall there, so pixels line up 1:1.
    blitScale() {
      return 100 * tan(this.cam.cameraFOV / 2) / this.height
    }

    setCamera(Z) {
      let cam = this.cam
      push()
      let pan = atan2(cam.eyeZ - cam.centerZ, cam.eyeX - cam.centerX)
      let camtilt = atan2(cam.eyeY - cam.centerY, dist(cam.centerX, cam.centerZ, cam.eyeX, cam.eyeZ))
      noLights()
      cam.eyeY = cam.centerY + dist(cam.centerX, cam.centerZ, cam.eyeX, cam.eyeZ) * tan(camtilt);
      gl.disable(gl.CULL_FACE)
      translate(cam.eyeX, cam.eyeY, cam.eyeZ)
      rotateY(-pan)
      rotateZ(camtilt + PI)
      translate(Z, 0, 0)
      rotateY(-PI/2)
      //The amount of suffering the below lines have caused is genuinely immesurable.
      if (cam.upY > 0) {
      rotateZ(-PI)
      }
    }
    renderBackground() {
      let wHeight = this.height;
      let wWidth = this.width;
      this.setCamera(500);
      //noStroke();
      let rotationSpeed = 0.001; // Speed of rotation
      let rotationAngle = Settings.reduceMotion ? 0 : totalTime*targetFrameRate * rotationSpeed;
      rotateZ(rotationAngle); // Rotate around the Y-axis
      tint(125); // Apply a dark tint to make the background darker

      // Calculate the scale factor based on screen resolution and guiScale
      let scaleFactor = Math.min(wWidth / menubackground.width, wHeight / menubackground.height) * 1.5;
      if (this.guiScale < 1) {
      scaleFactor *= (1 / this.guiScale); // Increase the scale factor when guiScale is smaller
      }
      let scaledWidth = menubackground.width * scaleFactor;
      let scaledHeight = menubackground.height * scaleFactor;

      texture(menubackground);
      plane(scaledWidth, scaledHeight);
      pop();
    }

    renderGUI() {
      switch (this.currentScreen[this.currentScreen.length - 1]) {
        case "menu":
          this.renderMenu()
          break
        case "game":
          this.renderGameUI()
          break
      }
      }
    

    getState() {
      return this.currentScreen[this.currentScreen.length - 1]
    }

    getResultHeadline(type) {
      switch (type) {
        case "checkmate":
          return "Checkmate!"
        case "stalemate":
          return "Stalemate!"
        case "king_captured":
          return "King captured!"
        default:
          return "Game over"
      }
    }

    getResultOutcome(winner) {
      if (!winner) {
        return "Draw"
      }
      if (winner === color) {
        return "You win!"
      }
      return "You lose"
    }

    renderResultOverlay() {
      if (!gameData || !gameData.result) {
        this.resultAt = 0
        return
      }
      if (!this.resultAt) this.resultAt = totalTime
      const ease = eased((totalTime - this.resultAt) / 0.45)

      const headline = this.getResultHeadline(gameData.result.type)
      const outcome = this.getResultOutcome(gameData.result.winner)

      canvas2d.push()
      canvas2d.drawingContext.globalAlpha = ease
      canvas2d.translate(this.width * 0.5, this.height * 0.44)
      canvas2d.scale(0.85 + 0.15 * ease)
      canvas2d.translate(-this.width * 0.5, -this.height * 0.44)
      canvas2d.noStroke()
      canvas2d.rectMode(CORNER)
      canvas2d.fill(0, 170)
      canvas2d.rect(0, this.height * 0.30, this.width, this.height * 0.28)
      canvas2d.textFont(plunge)
      canvas2d.textAlign(CENTER, CENTER)
      canvas2d.textSize(this.height * 0.10)
      textWithShadow2dCanvas(headline, this.width * 0.5, this.height * 0.40)
      canvas2d.textSize(this.height * 0.055)
      textWithShadow2dCanvas(outcome, this.width * 0.5, this.height * 0.51)
      canvas2d.pop()
    }

    renderGameUI() {
      let wHeight = this.height
      let wWidth = this.width
      canvas2d.clear()
      this.setCamera(100)


      if (cardDataManager) {
        cardDataManager.displayDeck()
        cardDataManager.drawFlight()
      }

      for (let i = 0; i < this.ingameGuiElementNames.length; i++) {
        canvas2d.push();
        let buttonName = this.ingameGuiElementNames[i];
        this.ingameGuiElements[buttonName].drawIcon(canvas2d, this.guiScale);
        canvas2d.pop();
      }

      this.renderResultOverlay()
      if (Settings.showFps) this.drawElements([this.fpsReadout], 1)

      canvas2d.push()
        //console.log(maxcamtilt, mincamtilt)
        // Clamp the camera's camtilt angle
        canvas2d.textAlign(LEFT)
        canvas2d.fill(255)
        canvas2d.pop()
      //ellipse(wWidth/16, wHeight/16, 5)
      if (debug) {
        canvas2d.push()
        canvas2d.fill(255)
        canvas2d.stroke(0)
        canvas2d.strokeWeight(5)
        canvas2d.line(0, wHeight/2, wWidth, wHeight/2)
        canvas2d.line(wWidth/2, 0, wWidth/2, wHeight)

        canvas2d.pop()
        if (mouseClickedLoc) {
          canvas2d.push()
          canvas2d.fill(255)
          canvas2d.stroke(0)
          canvas2d.strokeWeight(5)
          canvas2d.ellipse(mouseClickedLoc.x, mouseClickedLoc.y, 20)
          canvas2d.pop()
        }
      }
      
      push()
        scale(this.blitScale())
        image(canvas2d, -this.width, -this.height, (this.width), (this.height))
        pop()
      pop()
    }
  renderMenu() {
    const t = this.overlayAmount()
    canvas2d.textAlign(LEFT)
    canvas2d.textSize(50)
    canvas2d.textFont(plunge)
    canvas2d.imageMode(CENTER)
    canvas2d.rectMode(CENTER)
    canvas2d.clear()

    if (t < 1) {
      this.drawElements(this.menuLetters, 1 - t, -400)
      this.drawElements(this.menuButtonNames.map(name => this.menuButtons[name]), 1 - t, -400)
    }
    if (t > 0) {
      const hovered = this.cardGallery.find(card => card.art.isHovered)
      const blurb = hovered ? hovered.description : CARD_BLURB_HINT
      if (this.cardBlurb.getText() !== blurb) this.cardBlurb.updateText(blurb)
      this.drawElements(this.overlayButtons(), t, 0, 60)
      push()
      this.setCamera(101)
      fill(0, 60 * t)
      plane(600, 600)
      pop()
      pop()
    }

    if (Settings.showFps) this.drawElements([this.fpsReadout], 1)

    push()
    this.setCamera(100)
    scale(this.blitScale())
    image(canvas2d, -this.width, -this.height, (this.width), (this.height))
    pop()

    pop()
    }


    openCardChoice(title, choices, callback) {
      this.closeCardChoice()
      const width = 640, height = 270, pad = 8
      const x = (1920 - width) / 2, y = 380
      const panel = createGraphics(width + pad, height + pad)
      panel.noStroke()
      panel.fill(0, 0, 0, 90)
      panel.rect(pad, pad, width, height, 22)
      panel.fill(18, 14, 26, 244)
      panel.rect(0, 0, width, height, 22)
      panel.textFont(plunge)
      panel.textAlign(CENTER, CENTER)
      panel.textSize(42)
      panel.fill(238, 230, 245)
      panel.text(title, width / 2, 64)
      this.ingameGuiElements.cardChoicePanel = new ImageButton(width + pad, height + pad, x, y)
        .setImage(panel.get())
        .updateGraphics()
      panel.remove()
      this.ingameGuiElementNames.push("cardChoicePanel")

      const addOption = (label, size, color, centreX, offsetY, onPick) => {
        const name = "cardChoice" + this.ingameGuiElementNames.length
        const button = new TextButton(300, size + 20, 0, 0)
          .setText(label)
          .setTextSize(size)
          .setColor(color[0], color[1], color[2])
          .setHoverEffect(0, -8, 0.5)
          .onClick(onPick)
          .updateGraphics()
        button.setPosition(centreX - button.getTextWidth() / 2, y + offsetY)
        this.ingameGuiElements[name] = button
        this.ingameGuiElementNames.push(name)
      }

      choices.forEach((choice, i) => addOption(
        choice.charAt(0).toUpperCase() + choice.slice(1), 54, [255, 255, 255],
        x + width * (i + 0.5) / choices.length, 120,
        () => { this.closeCardChoice(); callback(choice) }))
      addOption("Cancel", 30, [150, 142, 162], x + width / 2, 206, () => this.closeCardChoice())
      this.cardChoiceOpen = true
    }

    closeCardChoice() {
      this.ingameGuiElementNames = this.ingameGuiElementNames.filter(name => {
        if (!name.startsWith("cardChoice")) return true
        this.ingameGuiElements[name].remove()
        delete this.ingameGuiElements[name]
        return false
      })
      this.cardChoiceOpen = false
    }

    clickGUIButton(x, y) {
      if (this.overlayAmount() > 0.5) {
        for (const button of this.overlayButtons()) {
          if (typeof button.onClickCallBack == 'function') {
            button.handleClick(x, y, this.guiScale)
          }
        }
        return
      }
      if (this.currentScreen[this.currentScreen.length - 1] == "menu") {
      for (let i = 0; i < this.menuButtonNames.length; i++) {
        let buttonName = this.menuButtonNames[i];
        if (typeof this.menuButtons[buttonName].onClickCallBack == 'function'){
          this.menuButtons[buttonName].handleClick(x, y, this.guiScale);
        }
      }
    } else if (this.currentScreen[this.currentScreen.length - 1] == "game") {
      for (let i = 0; i < this.ingameGuiElementNames.length; i++) {
        let buttonName = this.ingameGuiElementNames[i];
        if (typeof this.ingameGuiElements[buttonName].onClickCallBack == 'function'){
          this.ingameGuiElements[buttonName].handleClick(x, y, this.guiScale);
        }
      }
    }
  }
    
  
}


/*
function renderGUI() {
    
  }

*/
