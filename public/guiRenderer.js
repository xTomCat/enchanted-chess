
class GuiRenderer {
    constructor(width, height, cam) {
        this.width = width
        this.height = height
        this.cam = cam
        this.currentScreen = ["menu"]
        this.menuChessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture)
        this.menuChessBoard.populateBoard()


        this.menuButtonNames = ["createARoom", "joinARoom", "cardDeck", "options"]
        this.menuButtons = {
          createARoom: {hoverOffset: 0, lastHovered: 0, distFromLeft: 20, distFromTop: 65, buttonWidth: 30, buttonHeight: 7, text: "Create a room"},
          joinARoom: {hoverOffset: 0, lastHovered: 0, distFromLeft: 20, distFromTop: 72, buttonWidth: 30, buttonHeight: 7, text: "Join a room"},
          cardDeck: {hoverOffset: 0, lastHovered: 0, distFromLeft: 20, distFromTop: 79, buttonWidth: 30, buttonHeight: 7, text: "Edit deck"},
          options: {hoverOffset: 0, lastHovered: 0, distFromLeft: 20, distFromTop: 86, buttonWidth: 30, buttonHeight: 7, text: "Options"}
        }
        this.menuLetters = []
        this.letterWidth = 100
        this.letterHeight = 242
        this.topLetters = 9
        this.bottomLetters = 5
        let letterImage = title
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
      let wHeight = this.height
      let wWidth = this.width
      this.setCamera(500)
      noStroke()
      let rotationSpeed = 0.001; // Speed of rotation
      let rotationAngle = frameCount * rotationSpeed; // Calculate rotation angle based on frame count
      rotateZ(rotationAngle) // Rotate around the Y-axis
      tint(125) // Apply a dark tint to make the background darker
      texture(menubackground)
      plane((menubackground.width), (menubackground.height))
      pop()
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

    renderGameUI() {
      let wHeight = this.height
      let wWidth = this.width
      this.setCamera(100)
      push()
        fill(150)
        rectMode(CENTER)
        fill(100)
        rect(0, (wHeight/16)*0.85, wWidth/16, wHeight/48)
      pop()
      push()
        fill(255)
        textAlign(LEFT)
        stroke(0)
        text("Name: " + nickname + "\nColor: " + color, (wWidth/16)*0.52, (wHeight/16)*0.80)
        noStroke()
      pop()
      if (debug) {
        push()
        fill(255)
        textAlign(LEFT)
        text("[DEBUG]\nFPS: " + round(frameRate()) + "\nCamTilt: " + round(camtilt, 3) + "\nPan: " + round(pan, 3) + "\nCamX: " + cam.eyeX + "\nCamY: " + cam.eyeY + "\nCamZ: " + cam.eyeZ + "\nUpX: " + cam.upX + "\nUpY: " + cam.upY + "\nUpZ: " + cam.upZ, (wWidth/16)*0.5, (-wHeight/16)*0.8)
        pop()
      }
      if (gameData) {
        const players = gameData.players
        push()
          fill(255)
          textAlign(LEFT)
          text("You're in a room! Code: " + gameData.roomCode, -(wWidth/16)*0.9, (-wHeight/16)*0.8)
          if (players[0]) {
            text("Player 1: " + players[0].name, -(wWidth/16)*0.9, ((-wHeight/16)*0.8)+10)
          }
          if (players[1]) {
            text("Player 2: " + players[1].name, -(wWidth/16)*0.9, ((-wHeight/16)*0.8)+20)
          } else{
            text("Waiting for player 2...", -(wWidth/16)*0.9, ((-wHeight/16)*0.8)+20)
          }
        pop()
        if (check && gameData.state == "started") {
          push()
          fill(255)
          textAlign(CENTER)
          text(check + " is in check!", 0, (-wHeight/16)*0.85)
          pop()
      }
      }
      push()
        fill(255)
        textAlign(CENTER)
        if (gameData) {
          if (gameData.state == "waiting") {
            text("Waiting for players...", 0, (wHeight/16)*0.5)
          } else if (gameData.state == "started") {
            if (gameData.turn == color) {
              text("It's your turn!", 0, (wHeight/16)*0.5)
            } else if (gameData.turn != color) {
              text("It's the other player's turn!", 0, (wHeight/16)*0.5)
            }
          } else if (gameData.state == "checkmate" || "closing") {
            let winner 
            if (gameData.check == "white") {
              winner = "Black"
            } else if (gameData.check == "black") {
              winner = "White"
            }
            text("Checkmate! " + winner + " wins!", 0, (wHeight/16)*0.5)
          }
      }
      if (timeUntilLeaving != null) {
        push()
        text("Leaving room in: " + timeUntilLeaving, 0, (wHeight/16)*0.6)
        pop()
      }
      pop()
      push()
        //console.log(maxcamtilt, mincamtilt)
        // Clamp the camera's camtilt angle
        textAlign(LEFT)
        fill(255)
      pop()
      //ellipse(wWidth/16, wHeight/16, 5)
      pop()
    }
  renderMenu() {
    let wHeight = this.height
    let wWidth = this.width
    this.menuChessBoard.renderBoard()
    this.setCamera(100)

    //Render menu logo letters
    let bounceSpeed = 0.05; // Speed of the bounce
    let bounceHeight = 10; // Height of the bounce

      push();
      translate(-wWidth / 16, -wHeight / 16 + 20, 0);
      for (let i = 0; i < this.menuLetters.length; i++) {
        let bounceOffset = sin((frameCount * bounceSpeed) + ((i) * PI / 4)) * bounceHeight;
        let yOffset = 20
        let rowIndex
        if (i > this.topLetters) {
          yOffset = 45
          rowIndex = i - this.topLetters
          
        } else if (i == this.topLetters) {
          yOffset = 45
          rowIndex = i - this.topLetters
          translate((-wWidth/16) + 10 * (this.topLetters-1 - this.bottomLetters-1) ,25, 0);
        } else {
          rowIndex = i + 1
        }
        translate(10,0,0)
        push();
        let mouseIsHovered = false;
        let letterX = (-wWidth / 16) + 10 * (rowIndex); // X position of the letter
        let letterY = (-wHeight / 16) + yOffset; // Y position of the letter
        let letterWidth = this.letterWidth * 0.1; // Approximate width of the letter
        let letterHeight = this.letterHeight * 0.1; // Approximate height of the letter
        let maxOffset = 20;
        let lerpTime = 0.5;

        let mouseCoords = mouseToHUDCoords(mouseX, mouseY);
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
          this.menuLetters[i].hoverOffset = easeOutSine(hoverDuration / 100, 0, maxOffset, lerpTime);
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
            this.menuLetters[i].hoverOffset = this.menuLetters[i].peak - easeOutSine(pos, 0, this.menuLetters[i].peak, lerpTime);
          } else {
            this.menuLetters[i].peak = null;
          }
        }

        if (this.menuLetters[i].letter) {
          noStroke();
          scale(0.1);
          translate(0, bounceOffset - this.menuLetters[i].hoverOffset, 0);
          texture(this.menuLetters[i].letter);
          plane(this.letterWidth, this.letterHeight);
        }
        pop();
      }
      pop();

    push();
    noStroke();
    translate(-wWidth / 16 - 10, -wHeight / 16 + 45, 0);
    let bounceOffset = sin((frameCount * bounceSpeed) + (16 * PI / 4)) * bounceHeight;
    translate(80, 0, 0); // Distance from right of the screen
    scale(0.04);
    translate(0, bounceOffset * 2.5, 0);
    let rotationOffset = sin((frameCount * bounceSpeed) + (16 * PI / 4)) * 0.05; // Rotation offset for slight rotation
    push();
    rotate(PI / 16 + rotationOffset);
    fill(0, 0, 0);
    translate(0, bounceOffset * 1.5, 0);
    rect(20, 20, backofcard.width, backofcard.height, 15, 15, 15, 15);
    pop();
    push();
    rotate(PI / 10 + rotationOffset);
    translate(35, -30, 0);
    fill(0, 0, 0);
    rect(20, 20, backofcard.width, backofcard.height, 15, 15, 15, 15);
    texture(backofcard);
    plane(backofcard.width, backofcard.height);
    pop();

    push();
    translate(0, bounceOffset * 1.5, 0);
    rotate(PI / 16 + rotationOffset);

    texture(backofcard);
    plane(backofcard.width, backofcard.height);
    pop();

    //Render menu buttons
    pop()
    for (let i = 0; i < this.menuButtonNames.length; i++) {
      push()
      // Calculate the hover animation offset
      let buttonName = this.menuButtonNames[i]
      let mouseIsHovered = false;
      let distFromLeft = this.menuButtons[buttonName].distFromLeft; // Distance from right of the screen
      let distFromTop = this.menuButtons[buttonName].distFromTop
      let buttonX = (-wWidth / 16) + distFromLeft; // X position of the button
      let buttonY = (-wHeight / 16) + distFromTop; // Y position of the button
      let buttonWidth = this.menuButtons[buttonName].buttonWidth; // Approximate width of the button
      let buttonHeight = this.menuButtons[buttonName].buttonHeight; // Approximate height of the button   

      let mouseCoords = mouseToHUDCoords(mouseX, mouseY);
      // Check if the mouse is within the button bounds
      if (
        mouseCoords.x > buttonX - buttonWidth / 2 &&
        mouseCoords.x < buttonX + buttonWidth / 2 &&
        mouseCoords.y > buttonY - buttonHeight / 2 &&
        mouseCoords.y < buttonY + buttonHeight / 2
      ) {
        mouseIsHovered = true;
      }
      // Calculate the hover animation offset
      let maxOffset = 5;
      let lerpTime = 0.5
      if (mouseIsHovered) {
        if (!this.menuButtons[buttonName].hoverStartTime) {
          this.menuButtons[buttonName].hoverStartTime = frameCount;
        }
        let hoverDuration = frameCount - this.menuButtons[buttonName].hoverStartTime;
        if (hoverDuration / 100 > lerpTime) {
          hoverDuration = lerpTime * 100;
        }
        this.menuButtons[buttonName].hoverOffset = easeOutSine(hoverDuration / 100, 0, maxOffset, lerpTime);
        this.menuButtons[buttonName].lastHovered = frameCount;
        this.menuButtons[buttonName].peak = this.menuButtons[buttonName].hoverOffset;
      } else {
        this.menuButtons[buttonName].hoverStartTime = null;
        let pos = 0;
        if (this.menuButtons[buttonName].hoverOffset > 0) {
          let returnDuration = frameCount - this.menuButtons[buttonName].lastHovered;
          if (returnDuration / 100 > lerpTime) {
            pos = lerpTime;
          } else {
            pos = returnDuration / 100;
          }
          this.menuButtons[buttonName].hoverOffset = this.menuButtons[buttonName].peak - easeOutSine(pos, 0, this.menuButtons[buttonName].peak, lerpTime);
        } else {
          this.menuButtons[buttonName].peak = null
        }
      }

      // Text Shadow
      fill(0)
      textAlign(LEFT)
      let downOffSet = 2
      translate(this.menuButtons[buttonName].hoverOffset, 0, 0)
      translate((buttonX + 0.5) - buttonWidth / 2, buttonY + 0.5 + downOffSet, 0) //Small offset due to hitbox being off cuz shadow
      text(this.menuButtons[buttonName].text, 0, 0)

      // Real text
      fill(255)
      translate(-0.5, -0.5, 0)
      text(this.menuButtons[buttonName].text, 0, 0)
      pop()
    }

    pop()
  }

    clickGUIButton(x, y) {
      ellipse(x, y, 5)
      let buttonName = null;
      for (let i = 0; i < this.menuButtonNames.length; i++) {
        let buttonX = (-this.width / 16) + this.menuButtons[this.menuButtonNames[i]].distFromLeft; // X position of the button
        let buttonY = (-this.height / 16) + this.menuButtons[this.menuButtonNames[i]].distFromTop; // Y position of the button
        let buttonWidth = this.menuButtons[this.menuButtonNames[i]].buttonWidth; // Approximate width of the button
        let buttonHeight = this.menuButtons[this.menuButtonNames[i]].buttonHeight; // Approximate height of the button
        if (
            x > buttonX - buttonWidth / 2 &&
            x < buttonX + buttonWidth / 2 &&
            y > buttonY - buttonHeight / 2 &&
            y < buttonY + buttonHeight / 2
        ) {
          buttonName = this.menuButtonNames[i];
        }
      }
      if (buttonName) {
        switch (buttonName) {
          case "createARoom":
            console.log("createARoom")
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