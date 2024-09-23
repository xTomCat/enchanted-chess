//const { text } = require("express")

let chessBoard = null
let whiteTexture, blackTexture
let mousePressedInBoard = false
let guiGraphics
let gl
let socket
let nickname = "anonymous"
let gameData = null
let mouseClickedLoc
let availableMoves = null
let color = "unset!"
let debug = false
let check
let time = 0.0
let timeUntilLeaving = null

function preload() {
  whiteTexture = loadImage("Assets/whiteMarble.jpg");
  blackTexture = loadImage("Assets/blackMarble.jpg");
  montserrat = loadFont("Assets/Montserrat-Bold.ttf");
  inconsolata = loadFont("Assets/Inconsolata-Bold.ttf");
  bishopModel = loadModel('Assets/models/chessBishop.obj');
  rookModel = loadModel('Assets/models/chessCastle.obj');
  knightModel = loadModel('Assets/models/chessKnight.obj');
  pawnModel = loadModel('Assets/models/chessPawn.obj');
  queenModel = loadModel('Assets/models/chessQueen.obj');
  kingModel = loadModel('Assets/models/chessKing.obj');
}

function setup() {
  socket = io()
  let canvas = createCanvas(windowWidth-15, windowHeight-15, WEBGL)
  let joinRoomButton = createButton('Join a room')
  let nickNameButton = createButton('Choose your nickname')
  let createARoomButton = createButton('Create a room')
  nickNameButton.position(8, windowHeight-48)
  nickNameButton.mousePressed(promptNickName)
  joinRoomButton.position(8, windowHeight-28)
  joinRoomButton.mousePressed(joinGameByRoomCode)
  createARoomButton.position(8, windowHeight-68)
  createARoomButton.mousePressed(createRoom)
  //chessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture)
  //chessBoard.populateBoard()
  p1Deck = new cardDeckIngame(this.windowWidth * 0.10, this.windowHeight * 0.7, "player1")
  //chessBoardArray = chessBoard.getBoard()
  rectMode(CENTER)
  cam = createCamera()
  gl = this._renderer.GL;
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT)
  cam.eyeZ = 300
  cam.eyeX = 340
  cam.eyeY = -340
  textFont(inconsolata)
  textSize(5)
  textAlign(CENTER)
  

  socket.on('move', (move) => {
    chessBoard.move(move)
  })

  socket.on('nicknameChanged', (changedNickname) => {
    console.log("Nickname changed to: " + changedNickname)
    nickname = changedNickname
  })

  socket.on('roomCreated', (roomCode) => {
    room = roomCode
    let roomCloseButton = createButton('Close room')
    roomCloseButton.position(8, windowHeight-88)
    roomCloseButton.mousePressed(closeRoom)

  })

  socket.on('roomClosed', () => {
    room = null
    chessBoard = null
    color = "unset!"
    console.log('Room closed')
    gameData = null
  })

  socket.on('gameData', (gameDataRecieved) => { 
    gameData = gameDataRecieved
    console.log("gameData: ")
    console.log(gameData)
    compareBoard(chessBoard, gameDataRecieved.board)
    if (chessBoard && gameDataRecieved.lastMove) {
      console.log(gameDataRecieved.lastMove)
      let piece = chessBoard.getTileData(gameDataRecieved.lastMove.to.x, gameDataRecieved.lastMove.to.y).piece;
       if (piece) {
        piece.lastMove = gameDataRecieved.lastMove;
        
      }
    }
    console.log(chessBoard.getBoard())
    check = gameData.check
  })

  socket.on('initBoard', (board) => {
    console.log("init board recieved")
    chessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture)
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
    console.log("Color set to: " + setColor)
    color = setColor
  })

  socket.on('leavingSoon', (count) => {
    timeUntilLeaving = count
    if (timeUntilLeaving == 0) {
      timeUntilLeaving = null
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
  if (gameData) {
    socket.emit('closeRoom', gameData.roomCode)
    chessBoard = null
  } else {
    console.log("No room to close")
  }
}

function createRoom() {
  socket.emit('createRoom')
}

function promptNickName() {
  const nickname = prompt("Please enter your nickname")
  const roomCode = gameData ? gameData.roomCode : null
  if (nickname) {
    socket.emit('nickname', nickname, roomCode)
  }
}

function joinGameByRoomCode() {
  let roomCode = prompt("Please enter the room code")
  if (roomCode) {
    socket.emit('joinGame', roomCode)
  }
}

function draw() {
  background(100)
  
  //push()
  //noStroke()
  //// Pass time uniform
  //skyShader.setUniform('u_time', millis() / 1000.0);
//
  //// Extract projection and model-view matrices as Float32Array
  //let pMatrix = this._renderer.uPMatrix.mat4;
  //let mvMatrix = this._renderer.uMVMatrix.mat4;
//
  //// Pass them as uniforms to the shader
  //skyShader.setUniform('projectionMatrix', pMatrix);
  //skyShader.setUniform('modelViewMatrix', mvMatrix);
  //shader(skyShader)  // Draw a rotating box to test the shader
  //rotateY(frameCount * 0.01);
  //box(2000);
  //pop()
  cam.lookAt(0,0,0)
  ambientLight(128, 128, 128);
  directionalLight(128, 128, 128, 0, 1, 0);
  lightFalloff(1, 0, 0)
  if(!mousePressedInBoard){
    orbitControl()
  }
  push()
  if (chessBoard) {
    drawChessBoard(chessBoard)
  }
  pop()
  push()
  renderGUI()
  pop()
}

function renderGUI() {
  push()
  let pan = atan2(cam.eyeZ - cam.centerZ, cam.eyeX - cam.centerX)
  let camtilt = atan2(cam.eyeY - cam.centerY, dist(cam.centerX, cam.centerZ, cam.eyeX, cam.eyeZ))
  noLights()
  cam.eyeY = cam.centerY + dist(cam.centerX, cam.centerZ, cam.eyeX, cam.eyeZ) * tan(camtilt);
  gl.disable(gl.CULL_FACE)
  translate(cam.eyeX, cam.eyeY, cam.eyeZ)
  rotateY(-pan)
  rotateZ(camtilt + PI)
  translate(100, 0, 0)
  rotateY(-PI/2)

  //The amount of suffering the below lines have caused is genuinely immesurable.
  if (cam.upY > 0) {
  rotateZ(-PI)
  }

  push()
    fill(150)
    rectMode(CENTER)
    fill(100)
    rect(0, (windowHeight/16)*0.85, windowWidth/16, windowHeight/48)
  pop()
  push()
    fill(255)
    textAlign(LEFT)
    stroke(0)
    text("Name: " + nickname + "\nColor: " + color, (windowWidth/16)*0.52, (windowHeight/16)*0.80)
    noStroke()
  pop()
  if (debug) {
    push()
    fill(255)
    textAlign(LEFT)
    text("[DEBUG]\nFPS: " + round(frameRate()) + "\nCamTilt: " + round(camtilt, 3) + "\nPan: " + round(pan, 3) + "\nCamX: " + cam.eyeX + "\nCamY: " + cam.eyeY + "\nCamZ: " + cam.eyeZ + "\nUpX: " + cam.upX + "\nUpY: " + cam.upY + "\nUpZ: " + cam.upZ, (windowWidth/16)*0.5, (-windowHeight/16)*0.8)
    pop()
  }
  if (gameData) {
    const players = gameData.players
    push()
      fill(255)
      textAlign(LEFT)
      text("You're in a room! Code: " + gameData.roomCode, -(windowWidth/16)*0.9, (-windowHeight/16)*0.8)
      if (players[0]) {
        text("Player 1: " + players[0].name, -(windowWidth/16)*0.9, ((-windowHeight/16)*0.8)+10)
      }
      if (players[1]) {
        text("Player 2: " + players[1].name, -(windowWidth/16)*0.9, ((-windowHeight/16)*0.8)+20)
      } else{
        text("Waiting for player 2...", -(windowWidth/16)*0.9, ((-windowHeight/16)*0.8)+20)
      }
      
    pop()
    if (check && gameData.state == "started") {
      push()
      fill(255)
      textAlign(CENTER)
      text(check + " is in check!", 0, (-windowHeight/16)*0.85)
      pop()
  }
  }
  push()
    fill(255)
    textAlign(CENTER)
    if (gameData) {
      if (gameData.state == "waiting") {
        text("Waiting for players...", 0, (windowHeight/16)*0.5)
      } else if (gameData.state == "started") {
        if (gameData.turn == color) {
          text("It's your turn!", 0, (windowHeight/16)*0.5)
        } else if (gameData.turn != color) {
          text("It's the other player's turn!", 0, (windowHeight/16)*0.5)
        }
      } else if (gameData.state == "checkmate" || "closing") {
        let winner 
        if (gameData.check == "white") {
          winner = "Black"
        } else if (gameData.check == "black") {
          winner = "White"
        }
        text("Checkmate! " + winner + " wins!", 0, (windowHeight/16)*0.5)
        
      }
  }
  if (timeUntilLeaving != null) {
    push()
    text("Leaving room in: " + timeUntilLeaving, 0, (windowHeight/16)*0.6)
    pop()
  }
  pop()
  push()
    
    //console.log(maxcamtilt, mincamtilt)
    // Clamp the camera's camtilt angle
    textAlign(LEFT)
    fill(255)
  pop()

  
  //ellipse(windowWidth/16, windowHeight/16, 5)
  
  pop()
}



function windowResized() {
  resizeCanvas(windowWidth-15, windowHeight-15);
}

function drawChessBoard(chessBoardObject) {
  gl.cullFace(gl.FRONT)
  let chessBoard = chessBoardObject.getBoard();
  let tileSize = chessBoardObject.getTileSize();
  let boardHeight = chessBoardObject.getHeight();
  let boardWidth = chessBoardObject.getWidth();
  //Get the hovered tile
  let hoveredTile = getSelectedTile(mouseX, mouseY, chessBoardObject)
  for (let i = 0; i < boardWidth; i++) {
    for (let j = 0; j < boardHeight; j++) {
      push();
      //If the hovered tile isn't null, set that tile to be hovered with JSON data.
      if (hoveredTile) {
      if (i == hoveredTile.x && j == hoveredTile.y) {
        //If a move is available, only the available moves can be hovered.
        //if (availableMoves) {
        //  if (availableMoves.some(move => move.x === i && move.y === j) || chessBoard[i][j].selected) {
        //    chessBoard[i][j].hovered = true;
        //  }
        //} else {
          chessBoard[i][j].hovered = true;
        //}
      } else {chessBoard[i][j].hovered = false}
      } else {chessBoard[i][j].hovered = false}
      translate(chessBoard[i][j].x, chessBoard[i][j].y, chessBoard[i][j].z);
      rotateX(PI/2)
      rotateZ(PI/2)
      let tileTexture = chessBoardObject.getTileTexture(i, j);
      if (chessBoard[i][j].piece) {
        chessBoard[i][j].piece.drawModel()
      }
      //Render the tiles differently if they're selected or hovered
      if (chessBoard[i][j].selected == true) {
        emissiveMaterial(0, 255, 0)
        fill(0,255,0)
        //noStroke()
      }
      else if (chessBoard[i][j].available == true) {
        fill(255, 95, 31)
        emissiveMaterial(255, 95, 31)
        
        //noStroke()
      } 
      else {
        stroke(0,0,0)
        texture(tileTexture);
      }
      if (chessBoard[i][j].hovered == true) {
        emissiveMaterial(255, 255, 255)
        //fill(255,0,0)
        //noStroke()
      } 
      
      

      //tint(255, 255)
      square(0, 0, tileSize)
      
      translate(0, 0, -tileSize/2);
      rotateX(PI)
      square(0, 0, tileSize)
      
      //Draw the sides for the top of the chessboard
      if (i == 0 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
        push()
        translate(-tileSize/2, 0, -tileSize/4)
        rotateX(PI/2)
        rotateY(PI*1.5)
        rect(0,0, tileSize, tileSize/2)
        pop()
      //Draw the sides for the bottom of the chessboard
      } else if (i == boardWidth-1 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
        push()
        translate(tileSize/2, 0, -tileSize/4)
        rotateX(PI*1.5)
        rotateY(PI/2)
        rect(0,0, tileSize, tileSize/2)
        pop()
      }
      //Draw the sides for the left side of the chessboard
      if (j == 0 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
        push()
        translate(0, -tileSize/2, -tileSize/4)
        rotateX(PI*1.5)
        rotateY(PI)
        rect(0,0, tileSize, tileSize/2)
        pop()
        //Draw the sides for the right side of the chessboard
      } else if (j == boardHeight-1 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
        push()
        translate(0, tileSize/2, -tileSize/4)
        rotateX(PI*1.5)
        rotateY(PI*2)
        rect(0,0, tileSize, tileSize/2)
        pop()
      }
      pop();
    }
  }
}


function keyPressed() {
  if (key === 'c') {
    let selectedTile = getSelectedTile(mouseX, mouseY, chessBoard)
    if (selectedTile) {
      console.log("Tile selected: (" + (selectedTile.x)+ "," + (selectedTile.y)+")")
      chessBoardArray[selectedTile.x][selectedTile.y].selected = true
      console.log(selectedTile)
      if (chessBoardArray[selectedTile.x][selectedTile.y].piece) {
        console.log(chessBoardArray[selectedTile.x][selectedTile.y].piece)
      }
      //playerTileSelected = [selectedTile.x, selectedTile.z]
    }
  }
  if (key === 'e') {
    console.log("X: " + cam.eyeX)
    console.log("Y: " + cam.eyeY)
    console.log("Z: " + cam.eyeZ)
    console.log("FOV: " + cam.cameraFOV)
  }
  if (key === "F2") {
    if (debug) {
      console.log("Debug: OFF!")
      debug = false
    } else {
      console.log("Debug: ON!")
      debug = true
    }
    
  }

}



function selectTile(chessBoardObject, x, y) {
  let chessBoard = chessBoardObject.getBoard();
  let pieceMoved = false;
  availableMoves = null;

  if (gameData == null) {
    return;
  }

  if (!chessBoard[x][y].selected) {
    for (let i = 0; i < chessBoardObject.getWidth(); i++) {
      for (let j = 0; j < chessBoardObject.getHeight(); j++) {
        if (chessBoard[i][j].selected && chessBoard[i][j].piece && chessBoard[i][j] !== chessBoard[x][y] && (chessBoard[x][y].piece == null || chessBoard[x][y].piece.getColor() !== chessBoard[i][j].piece.getColor()) && chessBoard[x][y].available && gameData.turn == color) {
            const move = {
              from: { x: i, y: j },
              to: { x: x, y: y }
            };
            chessBoardObject.move(move);
            socket.emit('move', move);
            pieceMoved = true;
        }
        chessBoard[i][j].selected = false;
      }
    }

    if (pieceMoved) {
      chessBoard[x][y].selected = false;
      resetAvailableMoves(chessBoardObject);
    } else {
      chessBoard[x][y].selected = true;
      resetAvailableMoves(chessBoardObject);

      if (chessBoard[x][y].piece) {
        availableMoves = chessBoardObject.getTileData(x, y).piece.getAvailableMoves(chessBoardObject, x, y);
      }

      if (availableMoves != null && chessBoard[x][y].piece.getColor() == color) {
        markAvailableMoves(chessBoard, availableMoves);
      }
    }
  } else {
    chessBoard[x][y].selected = false;
    resetAvailableMoves(chessBoardObject);
  }
}

// Function to reset available moves for all tiles
function resetAvailableMoves(chessBoardObject) {
  let chessBoard = chessBoardObject.getBoard();
  for (let i = 0; i < chessBoardObject.getWidth(); i++) {
    for (let j = 0; j < chessBoardObject.getHeight(); j++) {
      chessBoard[i][j].available = false;
    }
  }
}

// Function to mark available moves on the chessboard
function markAvailableMoves(chessBoard, moves) {
  for (let i = 0; i < moves.length; i++) {
    chessBoard[moves[i].x][moves[i].y].available = true;
  }
}

function mousePressed() {
  if (chessBoard) {
  let hoveredTile = getSelectedTile(mouseX, mouseY, chessBoard)
  if (hoveredTile) {
    mousePressedInBoard = true
    selectTile(chessBoard, hoveredTile.x, hoveredTile.y)
  } else{
    mousePressedInBoard = false
  }
}
mouseClickedLoc = mouseToHUDCoords(mouseX, mouseY)
//console.log(mouseClickedLoc)
}

function mouseReleased() {
  mousePressedInBoard = false
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
