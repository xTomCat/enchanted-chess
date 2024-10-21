
class GuiRenderer {
    constructor(width, height, cam) {
        this.width = width
        this.height = height
        this.cam = cam
        this.currentScreen = ["menu"]
        this.menuChessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture)
        this.menuChessBoard.populateBoard()
        this.guiScale = 1
        this.guiRendererCanvas = createGraphics(width, height)


        const baseWidth = 1920;
        const baseHeight = 1080;
        this.guiScale = Math.min(this.width / baseWidth, this.height / baseHeight);

        this.debugBuffer = new TextBuffer(50, 50, 50, 50, "[DEBUG] FPS: " + fps, 50, LEFT)

        this.menuButtonNames = ["createARoom", "joinARoom", "cardDeck", "options"]
        this.menuButtons = {
          createARoom: new TextBuffer(600, 40, 50, 630, "Create a room", 50, LEFT).setHoverEffect(10, 0, 0.5),
          joinARoom: new TextBuffer(470, 40, 50, 700, "Join a room", 50, LEFT).setHoverEffect(10, 0, 0.5),
          cardDeck: new TextBuffer(380, 40, 50, 770, "Edit deck", 50, LEFT).setHoverEffect(10, 0, 0.5),
          options: new TextBuffer(330, 40, 50, 840, "Options", 50, LEFT).setHoverEffect(10, 0, 0.5)

          //createARoom: {hoverOffset: 0, lastHovered: 0, distFromLeft: 50, distFromTop: 630, buttonWidth: 600, buttonHeight: 40, text: "Create a room", textBuffer: new TextBuffer("Create a room", 50, LEFT)},
          //joinARoom: {hoverOffset: 0, lastHovered: 0, distFromLeft: 50, distFromTop: 700, buttonWidth: 470, buttonHeight: 40, text: "Join a room", textBuffer: new TextBuffer("Join a room", 50, LEFT)},
          //cardDeck: {hoverOffset: 0, lastHovered: 0, distFromLeft: 50, distFromTop: 770, buttonWidth: 380, buttonHeight: 40, text: "Edit deck", textBuffer: new TextBuffer("Edit deck", 50, LEFT)},
          //options: {hoverOffset: 0, lastHovered: 0, distFromLeft: 50, distFromTop: 840, buttonWidth: 330, buttonHeight: 40, text: "Options",  textBuffer: new TextBuffer("Options", 50, LEFT)}
        };

      // const buttonsPerRow = 30;
      // const buttonSpacing = 5;
      // const buttonWidth = 330;
      // const buttonHeight = 10;
      // const startX = 50;
      // const startY = 50;
//
      //  for (let i = 0; i < 100; i++) {
      //    const row = Math.floor(i / buttonsPerRow);
      //    const col = i % buttonsPerRow;
      //    const distFromLeft = startX + col * (buttonWidth + buttonSpacing);
      //    const distFromTop = startY + row * (buttonHeight + buttonSpacing);

      //    this.menuButtons[`button${i}`] = {
      //      hoverOffset: 0,
      //      lastHovered: 0,
      //      distFromLeft: distFromLeft,
      //      distFromTop: distFromTop,
      //      buttonWidth: buttonWidth,
      //      buttonHeight: buttonHeight,
      //      text: `Button ${i}`,
      //      textBuffer: new TextBuffer(`Button ${i}`, 50, LEFT)
      //    };
      //    this.menuButtonNames.push(`button${i}`);
      // }
        
        this.menuLetters = []
        this.letterWidth = 100 //Width of the letter in pixels
        this.letterHeight = 242 //Height of the letter in pixels
        this.topLetters = 9 //Amount of letters on top of the image
        this.bottomLetters = 5 //Amount of letters on the bottom of the image
        let letterImage = title //PNG containing all the letters
        //Loop through the image and create a graphics object for each letter, based on their dimensions
        for (let i = 0; i <= this.topLetters; i++) {
          let letter = createGraphics(this.letterWidth, this.letterHeight)
          letter.image(letterImage, 0, 0, this.letterWidth, this.letterHeight, this.letterWidth*i, 0, this.letterWidth, this.letterHeight)
          this.menuLetters.push({letter: letter, hoverOffset: 0, lastHovered: 0})
        }
        for (let i = 0; i <= this.bottomLetters; i++) {
          let letter = createGraphics(this.letterWidth, this.letterHeight)
          letter.image(letterImage, 0, 0, this.letterWidth, this.letterHeight, this.letterWidth*i, 297, this.letterWidth, this.letterHeight)
          this.menuLetters.push({letter: letter, hoverOffset: 0, lastHovered: 0})
        }

        this.ingameGuiElementNames = ["hamburgerMenu", "gameTime",
          "opponentVS", "opponentNamePlate", "opponentEnergy", 
          "playerNamePlate", "playerEnergy", 
          "card1", "card2", "card3", "card4", 
          "chatBox", "chatInput"]
        this.ingameGuiElements = {
        }


    }


    back() {
      this.currentScreen.pop()
    }

    setScreen(screen) {
      this.currentScreen.push(screen)
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
    push()
    scale(this.guiScale)
    this.cam.eyeY = -100
    this.menuChessBoard.renderBoard()
    pop()
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

    // Render top letters
    canvas2d.push();
    //canvas2d.ellipse(0, 160 * this.guiscale)
    //canvas2d.translate(0, 160*this.guiScale);
    for (let i = 0; i <= this.topLetters; i++) {
      let bounceOffset = sin((frameCount * bounceSpeed) + (i * PI / 4)) * bounceHeight;
      //canvas2d.translate(100*this.guiScale, 0);
      canvas2d.push();
      let mouseIsHovered = false;
      let letterX = ((100*this.guiScale) * (i+1)); // X position of the letter, now based on 0,0 origin
      let letterY = 180*this.guiScale; // Y position of the letter
      let letterWidth = (this.letterWidth * this.guiScale); // Approximate width of the letter
      let letterHeight = (this.letterHeight * this.guiScale); // Approximate height of the letter
      let maxOffset = 20;
      let lerpTime = 0.5;
      // Check if the mouse is within the letter bounds
      if (
        mouseCoords.x > letterX - letterWidth / 2 &&
        mouseCoords.x < letterX + letterWidth / 2 &&
        mouseCoords.y > letterY - letterHeight / 2 &&
        mouseCoords.y < letterY + letterHeight / 2
      ) {
        mouseIsHovered = true;
      }

      if (mouseIsHovered) {
        if (!this.menuLetters[i].hoverStartTime) {
        this.menuLetters[i].hoverStartTime = frameCount;
        }
        let hoverDuration = frameCount - this.menuLetters[i].hoverStartTime;
        if (hoverDuration / 100 > lerpTime) {
        hoverDuration = lerpTime * 100;
        }
        this.menuLetters[i].hoverOffset = easeOutElastic(hoverDuration / 100, 0, maxOffset, lerpTime);
        this.menuLetters[i].lastHovered = frameCount;
        this.menuLetters[i].peak = this.menuLetters[i].hoverOffset;
      } else {
        this.menuLetters[i].hoverStartTime = null;
        let pos = 0;
        if (this.menuLetters[i].hoverOffset > 0) {
        let returnDuration = frameCount - this.menuLetters[i].lastHovered;
        if (returnDuration / 100 > lerpTime) {
          pos = lerpTime;
        } else {
          pos = returnDuration / 100;
        }
        this.menuLetters[i].hoverOffset = this.menuLetters[i].peak - easeOutElastic(pos, 0, this.menuLetters[i].peak, lerpTime);
        } else {
        this.menuLetters[i].peak = null;
        }
      }

      if (this.menuLetters[i].letter) {
        canvas2d.noStroke();
        //canvas2d.scale(1*this.guiScale);
        canvas2d.translate(0, bounceOffset - (this.menuLetters[i].hoverOffset*this.guiScale));
        canvas2d.image(this.menuLetters[i].letter, letterX, letterY, this.letterWidth*this.guiScale, this.letterHeight*this.guiScale, 0, 0, this.letterWidth, this.letterHeight);
        //canvas2d.ellipse(0, 0, 10)
        //canvas2d.rect(letterX, letterY, letterWidth, letterHeight)
        fill(0)
        //canvas2d.texture(this.menuLetters[i].letter);
        //canvas2d.plane(this.letterWidth, this.letterHeight);
      }
      canvas2d.pop();
      
    }
    canvas2d.pop();

    //Render bottom letters NEW
    canvas2d.push();
    //canvas2d.ellipse(0, 160 * this.guiscale)
    //canvas2d.translate(0, 160*this.guiScale);
    for (let i = this.topLetters + 1; i < this.menuLetters.length; i++) {
      let bounceOffset = sin((frameCount * bounceSpeed) + ((i - this.topLetters) * PI / 4)) * bounceHeight;
      //canvas2d.translate(100*this.guiScale, 0);
      canvas2d.push();
      let mouseIsHovered = false;
      let letterX = ((100*this.guiScale) * ((i - this.topLetters))); // X position of the letter
      let letterY = 440*this.guiScale; // Y position of the letter
      let letterWidth = (this.letterWidth * this.guiScale); // Approximate width of the letter
      let letterHeight = (this.letterHeight * this.guiScale); // Approximate height of the letter
      let maxOffset = 20;
      let lerpTime = 0.5;
      /*
      let mouseIsHovered = false;
      let letterX = (-wWidth / 16) + (10 * (i - this.topLetters)*this.guiScale); // X position of the letter
      let letterY = (-wHeight / 16) + 45*this.guiScale; // Y position of the letter
      let letterWidth = (this.letterWidth * 0.1)*this.guiScale; // Approximate width of the letter
      let letterHeight = (this.letterHeight * 0.1)*this.guiScale; // Approximate height of the letter
      let maxOffset = 20;
      let lerpTime = 0.5;
      */
      // Check if the mouse is within the letter bounds
      if (
        mouseCoords.x > letterX - letterWidth / 2 &&
        mouseCoords.x < letterX + letterWidth / 2 &&
        mouseCoords.y > letterY - letterHeight / 2 &&
        mouseCoords.y < letterY + letterHeight / 2
      ) {
        mouseIsHovered = true;
      }
      if (mouseIsHovered) {
        if (!this.menuLetters[i].hoverStartTime) {
        this.menuLetters[i].hoverStartTime = frameCount;
        }
        let hoverDuration = frameCount - this.menuLetters[i].hoverStartTime;
        if (hoverDuration / 100 > lerpTime) {
        hoverDuration = lerpTime * 100;
        }
        this.menuLetters[i].hoverOffset = easeOutElastic(hoverDuration / 100, 0, maxOffset, lerpTime);
        this.menuLetters[i].lastHovered = frameCount;
        this.menuLetters[i].peak = this.menuLetters[i].hoverOffset;
      } else {
        this.menuLetters[i].hoverStartTime = null;
        let pos = 0;
        if (this.menuLetters[i].hoverOffset > 0) {
        let returnDuration = frameCount - this.menuLetters[i].lastHovered;
        if (returnDuration / 100 > lerpTime) {
          pos = lerpTime;
        } else {
          pos = returnDuration / 100;
        }
        this.menuLetters[i].hoverOffset = this.menuLetters[i].peak - easeOutElastic(pos, 0, this.menuLetters[i].peak, lerpTime);
        } else {
        this.menuLetters[i].peak = null;
        }
      }

      if (this.menuLetters[i].letter) {
        canvas2d.noStroke();
        //canvas2d.scale(1*this.guiScale);
        canvas2d.translate(0, bounceOffset - (this.menuLetters[i].hoverOffset*this.guiScale));
        canvas2d.image(this.menuLetters[i].letter, letterX, letterY, this.letterWidth*this.guiScale, this.letterHeight*this.guiScale, 0, 0, this.letterWidth, this.letterHeight);
        //canvas2d.ellipse(0, 0, 10)
        //canvas2d.rect(letterX, letterY, letterWidth, letterHeight)
        fill(0)
        //canvas2d.texture(this.menuLetters[i].letter);
        //canvas2d.plane(this.letterWidth, this.letterHeight);
      }
      canvas2d.pop();
      
    }
    canvas2d.pop();

    //Render the card logo
    canvas2d.push();
    canvas2d.noStroke();
    //let bounceOffset = sin((frameCount * bounceSpeed) + ((i - this.topLetters) * PI / 4)) * bounceHeight;
    let bounceOffset = sin((frameCount * bounceSpeed) + ((this.topLetters + this.bottomLetters) * PI / 4)) * bounceHeight; // Bounce offset for the card
    canvas2d.translate((100*(this.bottomLetters+1.5))*this.guiScale, (this.letterHeight*1.8)*this.guiScale, 0); // Distance from right and top of the screen
    canvas2d.translate(0, bounceOffset * 2.5, 0);
    let rotationOffset = sin((frameCount * bounceSpeed) + (16 * PI / 4)) * 0.05; // Rotation offset for slight rotation
    canvas2d.scale(0.4*this.guiScale)
    canvas2d.push();
    canvas2d.rotate(PI / 16 + rotationOffset);
    canvas2d.fill(0, 0, 0);
    canvas2d.translate(0, bounceOffset * 1.5, 0);
    canvas2d.rect(20*this.guiScale, 20*this.guiScale, backofcard.width, backofcard.height, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale);
    canvas2d.pop();

    canvas2d.push();
    canvas2d.fill(0, 0, 0);
    canvas2d.rotate(PI / 10 + rotationOffset);
    canvas2d.translate(35*this.guiScale, -30*this.guiScale, 0);
    canvas2d.rect(20*this.guiScale, 20*this.guiScale, backofcard.width, backofcard.height, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale, 15*this.guiScale);
    canvas2d.image(backofcard, 0, 0, backofcard.width, backofcard.height);
    canvas2d.pop();

    canvas2d.push();
    canvas2d.rotate(PI / 16 + rotationOffset);
    canvas2d.image(backofcard, 0, bounceOffset * 1.5, backofcard.width, backofcard.height);
    canvas2d.pop();

    //Render menu buttons
    canvas2d.pop()
    translate(0, 0)
    for (let i = 0; i < this.menuButtonNames.length; i++) {
      canvas2d.push()
      let buttonName = this.menuButtonNames[i]
      console.log(this.menuButtons[buttonName])
      console.log(buttonName)
      this.menuButtons[buttonName].drawIcon(canvas2d, this.guiScale)
      canvas2d.pop()
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
      let buttonName = null;
      for (let i = 0; i < this.menuButtonNames.length; i++) {
        let buttonX = this.menuButtons[this.menuButtonNames[i]].distFromLeft*this.guiScale; // X position of the button
        let buttonY = this.menuButtons[this.menuButtonNames[i]].distFromTop*this.guiScale; // Y position of the button
        let buttonWidth = this.menuButtons[this.menuButtonNames[i]].textBuffer.gBuffer.width; // Approximate width of the button
        let buttonHeight = this.menuButtons[this.menuButtonNames[i]].textBuffer.gBuffer.height; // Approximate height of the button 
        canvas2d.ellipse(buttonX, buttonY, 10)
        canvas2d.ellipse(buttonX + buttonWidth, buttonY, 10)
        canvas2d.ellipse(buttonX, buttonY + buttonHeight, 10)
        canvas2d.ellipse(buttonX + buttonWidth, buttonY + buttonHeight, 10)

        if (
          x < buttonX + buttonWidth &&
          x > buttonX &&
          y < buttonY + buttonHeight &&
          y > buttonY
        ) {
          buttonName = this.menuButtonNames[i];
        }
      }
      if (buttonName) {
        switch (buttonName) {
          case "createARoom":
            console.log("createARoom")
            this.setScreen("game")
            createRoom()
            break
          case "joinARoom":
            console.log("createARoom")
            break
          case "cardDeck":
            console.log("createARoom")
            break
          case "options":
            console.log("createARoom")
            break
        }
      }
    }
    
  
}



/*
function renderGUI() {
    
  }

*/
