
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
      this.debugBuffer = new TextButton(50, 50, 50, 50, "[DEBUG] FPS: " + fps, 50, LEFT)
      this.menuButtonNames = ["createARoom", "joinARoom", "cardDeck", "options", "nickname"];
      this.menuButtons = {}
      this.menuButtons.createARoom = 
        new TextButton(630, 40, 50, 630)
          .setHoverEffect(20, 0, 0.5)
          .setText("Create a room")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(createRoom)
          .updateGraphics()
      this.menuButtons.joinARoom =
        new TextButton(470, 40, 50, 700)
          .setHoverEffect(20, 0, 0.5)
          .setText("Join a room")
          .setTextSize(50)
          .setAlign(LEFT)
          .onClick(joinGameByRoomCode)
          .updateGraphics()
      this.menuButtons.cardDeck =
        new TextButton(380, 40, 50, 770)
          .setHoverEffect(20, 0, 0.5)
          .setText("Card Deck")
          .setTextSize(50)
          .setAlign(LEFT)
          .updateGraphics()
      this.menuButtons.options =
        new TextButton(330, 40, 50, 840)
          .setHoverEffect(20, 0, 0.5)
          .setText("Options")
          .setTextSize(50)
          .setAlign(LEFT)
          .updateGraphics()
      this.menuButtons.nickname = 
        new TextButton(330, 40, -100, 50)
          .setHoverEffect(-20, 0, 0.5)
          .setText("Anonymous")
          .setTextSize(50)
          .setAlign(RIGHT)
          .onClick(promptNickName)
          .updateGraphics()
      let graphic = personicon.get(0, 0 , personicon.width, personicon.height)
      this.menuButtons.personIcon = 
        new ImageButton(graphic.width, graphic.height, -50, 0)
          .setImage(graphic)
          .setScale(0.19)
          .setBounceEffect(0, 10, 0.05)
          .setHoverEffect(0, -20, 0.5)
          .updateGraphics()
          .setShadow(true)
          .componentOf(this.menuButtons.nickname)


      
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


      this.ingameGuiElementNames = ["hamburgerMenu", "gameTime",
        "opponentVS", "opponentNamePlate", "opponentEnergy", 
        "playerNamePlate", "playerEnergy", 
        "card1", "card2", "card3", "card4", 
        "chatBox", "chatInput"]
      this.ingameGuiElements = {
      }


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
      this.screenSwitchTimeStamp = frameCount
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
      noStroke();
      let rotationSpeed = 0.001; // Speed of rotation
      let rotationAngle = frameCount * rotationSpeed; // Calculate rotation angle based on frame count
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
      if (debug) {
        canvas2d.clear()
        if (round(frameCount) % 60 == 0) {
          this.debugBuffer.updateText("[DEBUG] FPS: " + round(frameRate()))
        }
          this.renderDebugOverlay()
          pop()
        }
      }
    

    getState() {
      return this.currentScreen[this.currentScreen.length - 1]
    }

    renderGameUI() {
      let wHeight = this.height
      let wWidth = this.width
      canvas2d.clear()
      this.setCamera(100)
      //canvas2d.push()
      //  canvas2d.fill(150)
      //  canvas2d.rectMode(CENTER)
      //  canvas2d.fill(100)
      //  canvas2d.rect(0, (wHeight/16)*0.85, wWidth/16, wHeight/48)
      //canvas2d.pop()
      canvas2d.push()
        canvas2d.fill(255)
        canvas2d.textAlign(LEFT)
        canvas2d.stroke(0)
        textWithShadow2dCanvas("Name: " + nickname + "\nColor: " + color, this.width*0.02, this.height*0.90)
        canvas2d.noStroke()
      canvas2d.pop()
      if (gameData) {
        const players = gameData.players
        canvas2d.push()
          canvas2d.fill(255)
          canvas2d.textAlign(LEFT)
          textWithShadow2dCanvas("You're in a room! Code: " + gameData.roomCode, this.width*0.02, this.height*0.1)
          if (players[0]) {
            textWithShadow2dCanvas("Player 1: " + players[0].name, this.width*0.02, this.height*0.1+75)
          }
          if (players[1]) {
            textWithShadow2dCanvas("Player 2: " + players[1].name, this.width*0.02, this.height*0.1+150)
          } else{
            textWithShadow2dCanvas("Waiting for player 2...", this.width*0.02, this.height*0.1+150)
          }
        canvas2d.pop()
        if (check && gameData.state == "started") {
          canvas2d.push()
          canvas2d.fill(255)
          canvas2d.textAlign(CENTER)
          canvas2d.textWithShadow(check + " is in check!", 0, this.height*0.85)
          canvas2d.pop()
      }
      }
      canvas2d.push()
        canvas2d.fill(255)
        canvas2d.textAlign(CENTER)
        if (gameData) {
          if (gameData.state == "waiting") {
            textWithShadow2dCanvas("Waiting for players...", this.width*0.5, this.height*0.7)
          } else if (gameData.state == "started") {
            if (gameData.turn == color) {
              textWithShadow2dCanvas("It's your turn!", this.width*0.5, this.height*0.7)
            } else if (gameData.turn != color) {
              textWithShadow2dCanvas("It's the other player's turn!", this.width*0.5, this.height*0.7)
            }
          } else if (gameData.state == "checkmate" || "closing") {
            let winner 
            if (gameData.check == "white") {
              winner = "Black"
            } else if (gameData.check == "black") {
              winner = "White"
            }
            textWithShadow2dCanvas("Checkmate! " + winner + " wins!", this.width*0.5, this.height*0.7)
          }
      }
      if (timeUntilLeaving != null) {
        canvas2d.push()
        canvas2d.textWithShadow("Leaving room in: " + timeUntilLeaving, this.width*0.5, this.height*0.8)
        canvas2d.pop()
      }
      canvas2d.pop()
      canvas2d.push()
        //console.log(maxcamtilt, mincamtilt)
        // Clamp the camera's camtilt angle
        canvas2d.textAlign(LEFT)
        canvas2d.fill(255)
        canvas2d.pop()
      //ellipse(wWidth/16, wHeight/16, 5)
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
    
    //canvas2d.rect(-this.width, -this.height, this.width, this.height)
    //canvas2d.push()
    //canvas2d.fill(255)
    //canvas2d.ellipse(0, 0, 20)
    //canvas2d.ellipse(0, canvas2d.height, 20)
    //canvas2d.ellipse(canvas2d.width, 0, 20)
    //canvas2d.ellipse(canvas2d.width, canvas2d.height, 20)
    //canvas2d.ellipse(0, 0, 10, 10)
    //canvas2d.pop()
    //Render menu logo letters
    let bounceSpeed = 0.05; // Speed of the bounce
    let bounceHeight = 10*this.guiScale; // Height of the bounce

    for (let i = 0; i < this.menuLetters.length; i++) {
      canvas2d.push()
      this.menuLetters[i].drawIcon(canvas2d, this.guiScale)
      canvas2d.pop()
    }

    //Render the card logo
    //canvas2d.push();
    //canvas2d.noStroke();
    ////let bounceOffset = sin((frameCount * bounceSpeed) + ((i - this.topLetters) * PI / 4)) * bounceHeight;
    //let bounceOffset = sin((frameCount * bounceSpeed) + ((this.topLetters + this.bottomLetters) * PI / 4)) * bounceHeight; // Bounce offset for the card
    //canvas2d.translate((100*(this.bottomLetters+1.5))*this.guiScale, (this.letterHeight*1.8)*this.guiScale, 0); // Distance from right and top of the screen
    //canvas2d.translate(0, bounceOffset * 2.5, 0);
    //let rotationOffset = sin((frameCount * bounceSpeed) + (16 * PI / 4)) * 0.05; // Rotation offset for slight rotation
    //canvas2d.scale(0.4*this.guiScale)
    //canvas2d.push();
    //canvas2d.rotate(PI / 16 + rotationOffset);
    //canvas2d.fill(0, 0, 0);
    //canvas2d.translate(0, bounceOffset * 1.5, 0);
    //canvas2d.rect(20*this.guiScale, 20*this.guiScale, backofcard.width, backofcard.height, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale);
    //canvas2d.pop();
//
    //canvas2d.push();
    //canvas2d.fill(0, 0, 0);
    //canvas2d.rotate(PI / 10 + rotationOffset);
    //canvas2d.translate(35*this.guiScale, -30*this.guiScale, 0);
    //canvas2d.rect(20*this.guiScale, 20*this.guiScale, backofcard.width, backofcard.height, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale);
    //canvas2d.image(backofcard, 0, 0, backofcard.width, backofcard.height);
    //canvas2d.pop();
//
    //canvas2d.push();
    //canvas2d.rotate(PI / 16 + rotationOffset);
    //canvas2d.image(backofcard, 0, bounceOffset * 1.5, backofcard.width, backofcard.height);
    //canvas2d.pop();

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

    renderDebugOverlay() {
      let wHeight = this.height
      let wWidth = this.width
      this.setCamera(100)
      canvas2d.push()
      canvas2d.scale(this.guiScale)
      canvas2d.fill(255)
      canvas2d.textAlign(RIGHT)
      canvas2d.image(this.debugBuffer.gBuffer, this.width-100, 100, this.debugBuffer.gBuffer.width, this.debugBuffer.gBuffer.height)
      canvas2d.pop()
      push()
      scale(0.0621) //magic number. Why? nobody knows
      image(canvas2d, -this.width, -this.height, (this.width), (this.height))
      pop()
    }

    clickGUIButton(x, y) {
      for (let i = 0; i < this.menuButtonNames.length; i++) {
        let buttonName = this.menuButtonNames[i];
        if (this.menuButtons[buttonName].onClick){
          this.menuButtons[buttonName].handleClick(x, y, this.guiScale);
        }
      }



      //let buttonName = null;
      //for (let i = 0; i < this.menuButtonNames.length; i++) {
      //  let buttonX = this.menuButtons[this.menuButtonNames[i]].distFromLeft*this.guiScale; // X position of the button
      //  let buttonY = this.menuButtons[this.menuButtonNames[i]].distFromTop*this.guiScale; // Y position of the button
      //  let buttonWidth = this.menuButtons[this.menuButtonNames[i]].textBuffer.gBuffer.width; // Approximate width of the button
      //  let buttonHeight = this.menuButtons[this.menuButtonNames[i]].textBuffer.gBuffer.height; // Approximate height of the button 
      //  canvas2d.ellipse(buttonX, buttonY, 10)
      //  canvas2d.ellipse(buttonX + buttonWidth, buttonY, 10)
      //  canvas2d.ellipse(buttonX, buttonY + buttonHeight, 10)
      //  canvas2d.ellipse(buttonX + buttonWidth, buttonY + buttonHeight, 10) //
      //  if (
      //    x < buttonX + buttonWidth &&
      //    x > buttonX &&
      //    y < buttonY + buttonHeight &&
      //    y > buttonY
      //  ) {
      //    buttonName = this.menuButtonNames[i];
      //  }
      //}
      //if (buttonName) {
      //  switch (buttonName) {
      //    case "createARoom":
      //      console.log("createARoom")
      //      this.setScreen("game")
      //      createRoom()
      //      break
      //    case "joinARoom":
      //      console.log("createARoom")
      //      break
      //    case "cardDeck":
      //      console.log("createARoom")
      //      break
      //    case "options":
      //      console.log("createARoom")
      //      break
      //  }
      //}
    }
    
  
}



/*
function renderGUI() {
    
  }

*/
