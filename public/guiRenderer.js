
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
        "opponentNamePlate", "playerNamePlate", "playerEnergyBar", "statusText"]
        //"playerNamePlate", "playerEnergy", 
        //"card1", "card2", "card3", "card4", 
        //"chatBox", "chatInput"]
      this.ingameGuiElements = {}
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
          .updateGraphics()
      this.menuButtons.options =
        new TextButton(330, 50, 50, 900)
          .setHoverEffect(20, 0, 0.5)
          .setText("Options")
          .setTextSize(50)
          .setAlign(LEFT)
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
        .updateGraphics()
        .setShadow(true)

      this.ingameGuiElements.gameTime = new TextButton(50, 50, 50, 50)
        .setText("00:00")
        .setAlign(CENTER)
        .setTextSize(50)
        .updateGraphics()

      this.ingameGuiElements.statusText = new TextButton(50, 50, 50, 100)
        .setText("Waiting for players...")
        .setAlign(CENTER)
        .setTextSize(50)
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
      }
    }

    back() {
      this.currentScreen.pop()
    }

    setScreen(screen) {
      this.currentScreen.push(screen)
      this.screenSwitchTimeStamp = totalTime*targetFrameRate
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
      let rotationAngle = totalTime*targetFrameRate * rotationSpeed; // Calculate rotation angle based on frame count
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
        return
      }

      const headline = this.getResultHeadline(gameData.result.type)
      const outcome = this.getResultOutcome(gameData.result.winner)

      canvas2d.push()
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
      }

      for (let i = 0; i < this.ingameGuiElementNames.length; i++) {
        canvas2d.push();
        let buttonName = this.ingameGuiElementNames[i];
        this.ingameGuiElements[buttonName].drawIcon(canvas2d, this.guiScale);
        canvas2d.pop();
      }

      this.renderResultOverlay()

      canvas2d.pop()
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
        scale(0.0621) //magic number. Why? nobody knows
        image(canvas2d, -this.width, -this.height, (this.width), (this.height))
        pop()
      pop()
    }
  renderMenu() {
    let wHeight = this.height
    let wWidth = this.width
    let mouseCoords = {x: mouseX, y: mouseY};
    canvas2d.textAlign(LEFT)
    canvas2d.textSize(50)
    canvas2d.textFont(plunge)
    canvas2d.imageMode(CENTER)
    canvas2d.rectMode(CENTER)
    canvas2d.clear()
    //canvas2d.background(200)
    
    let bounceSpeed = 0.05; // Speed of the bounce
    let bounceHeight = 10*this.guiScale; // Height of the bounce

    for (let i = 0; i < this.menuLetters.length; i++) {
      canvas2d.push()
      this.menuLetters[i].drawIcon(canvas2d, this.guiScale)
      canvas2d.pop()
    }


    //Render menu buttons
    canvas2d.pop()
    

    for (let i = 0; i < this.menuButtonNames.length; i++) {
      canvas2d.push();
      let buttonName = this.menuButtonNames[i];

      this.menuButtons[buttonName].drawIcon(canvas2d, this.guiScale);
      canvas2d.pop();
    }

    push()
    this.setCamera(100)
    scale(0.0621) //magic number. Why? nobody knows
    image(canvas2d, -this.width, -this.height, (this.width), (this.height))
    pop()

    pop()
    }


    clickGUIButton(x, y) {
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
