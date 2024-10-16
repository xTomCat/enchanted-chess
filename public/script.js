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
let cam
let guiRenderer
let framesSinceMouseMoved = 0
let fps = 0

function preload() {
  whiteTexture = loadImage("Assets/whiteMarble.jpg");
  blackTexture = loadImage("Assets/blackMarble.jpg");
  montserrat = loadFont("Assets/Montserrat-Bold.ttf");
  inconsolata = loadFont("Assets/Inconsolata-Bold.ttf");
  companion = loadFont("Assets/COMPANION.otf");
  plunge = loadFont("Assets/Plunge.ttf");
  bishopModel = loadModel('Assets/models/chessBishop.obj');
  rookModel = loadModel('Assets/models/chessCastle.obj');
  knightModel = loadModel('Assets/models/chessKnight.obj');
  pawnModel = loadModel('Assets/models/chessPawn.obj');
  queenModel = loadModel('Assets/models/chessQueen.obj');
  kingModel = loadModel('Assets/models/chessKing.obj');
  title = loadImage('Assets/title.png');
  backofcard = loadImage('Assets/back of card transparent.png');
  menubackground = loadImage('Assets/background.png')
}

function setup() {
  socket = io()
  createCanvas(windowWidth-15, windowHeight-15)
  canvas3d = createCanvas(windowWidth-15, windowHeight-15, WEBGL)
  console.log(_renderer)
  //let joinRoomButton = createButton('Join a room')
  //let nickNameButton = createButton('Choose your nickname')
  //let createARoomButton = createButton('Create a room')
  cam = createCamera()
  guiRenderer = new GuiRenderer(windowWidth, windowHeight, cam)
  //nickNameButton.position(8, windowHeight-48)
  //nickNameButton.mousePressed(promptNickName)
  //joinRoomButton.position(8, windowHeight-28)
  //joinRoomButton.mousePressed(joinGameByRoomCode)
  //createARoomButton.position(8, windowHeight-68)
  //createARoomButton.mousePressed(createRoom)
  //chessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture)
  //chessBoard.populateBoard()
  p1Deck = new cardDeckIngame(this.windowWidth * 0.10, this.windowHeight * 0.7, "player1")
  //chessBoardArray = chessBoard.getBoard()
  rectMode(CENTER)
  console.log(cam)
  gl = this._renderer.GL;
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT)
  //cam.eyeY = -250
  cam._orbit(
    0, 0, -0.55
    );
  textFont(plunge)
  textSize(5)
  textAlign(CENTER)
  imageMode(CORNERS)
  

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
    if (guiRenderer) {
      guiRenderer.setScreen("game")
    }
    

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
  guiRenderer.setScreen("game")
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


function draw() {
  framesSinceMouseMoved++
  background(100)
  guiRenderer.renderBackground()
  if (frameCount % 60 == 0) {
    fps = round(frameRate())
  }
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
  orbit: if(!mousePressedInBoard){
    if (guiRenderer) {
        if (guiRenderer.getState() == "menu") {
          //cam.lookAt(50, 0, 0)
          //cam._orbit(0.005, 0, 0)
          break orbit;
        }
    }
  }
  push()
  if (chessBoard) {
    chessBoard.renderBoard()
  }
  pop()
  push()
  guiRenderer.renderGUI()
  //guiRenderer.guiRendererCanvas.clear()
  //image(guiRenderer.guiRendererCanvas, 0, 0, windowWidth-15, windowHeight-15)
  pop()
}

function windowResized() {
  resizeCanvas(windowWidth-15, windowHeight-15);
  if (guiRenderer) {
    guiRenderer.width = windowWidth;
    guiRenderer.height = windowHeight;
    const baseWidth = 1920;
    const baseHeight = 1080;
    guiRenderer.guiScale = Math.min(guiRenderer.width / baseWidth, guiRenderer.height / baseHeight);
}
}


function keyPressed() {
  if (key === 'c') {
    let selectedTile = chessBoard.getSelectedTile(mouseX, mouseY, chessBoard)
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
  if (key === 'r') {
    if (guiRenderer) {
      guiRenderer.damage(10)
    }
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
mouseClickedLoc = mouseToHUDCoords(mouseX, mouseY)
console.log(mouseClickedLoc)
if (guiRenderer) {
  guiRenderer.clickGUIButton(mouseClickedLoc.x, mouseClickedLoc.y)
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

function textWithShadow(string, x, y) {
  fill(0)
  text(string, x + 0.5, y + 0.5)
  fill(255)
  text(string, x, y)
}
