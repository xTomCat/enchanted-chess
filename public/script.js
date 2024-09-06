let chessBoard = []
let whiteTexture, blackTexture
let mousePressedInBoard = false
let guiGraphics
let gl
let socket
let nickname = "anonymous"

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
  chessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture)
  chessBoard.populateBoard()
  p1Deck = new cardDeckIngame(this.windowWidth * 0.10, this.windowHeight * 0.7, "player1")
  chessBoardArray = chessBoard.getBoard()
  rectMode(CENTER)
  cam = createCamera()
  gl = this._renderer.GL;
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT)
  cam.eyeZ = 300
  cam.eyeX = 340
  cam.eyeY = -340
  console.log(cam)
  guiGraphics = createGraphics(windowWidth-15, windowHeight-15)
  console.log("W: " + windowWidth + ", H: " + windowHeight)
  textFont(inconsolata)
  textSize(5)
  textAlign(CENTER)

  

  socket.on('move', (move) => {
    console.log("Move received: " + move)
    chessBoard.move(move)
  })

  socket.on('nicknameChanged', (changedNickname) => {
    console.log("Nickname changed to: " + changedNickname)
    nickname = changedNickname
  })
    
}

function createRoom() {
  socket.emit('createRoom')
}

function promptNickName() {
  let nickname = prompt("Please enter your nickname")
  console.log("Nickname: " + nickname)
  if (nickname) {
    socket.emit('nickname', nickname)
  }
}

function joinGameByRoomCode() {
  let roomCode = prompt("Please enter the room code")
  if (roomCode) {
    socket.emit('joinGame', roomCode)
  }
}

function draw() {
  background(50)
  cam.lookAt(0,0,0)
  if(!mousePressedInBoard){
     orbitControl()
  }
  push()
  drawChessBoard(chessBoard)
  pop()
  push()
  renderGUI()
  pop()
  
}

function renderGUI() {
  const maxcamtilt = -1.4
  const mincamtilt = 1.4
  let pan = atan2(cam.eyeZ - cam.centerZ, cam.eyeX - cam.centerX)
  let camtilt = atan2(cam.eyeY - cam.centerY, dist(cam.centerX, cam.centerZ, cam.eyeX, cam.eyeZ))
  cam.eyeY = cam.centerY + dist(cam.centerX, cam.centerZ, cam.eyeX, cam.eyeZ) * tan(camtilt);
  //console.log("Pan: " + pan + ", camtilt: " + camtilt)
  gl.disable(gl.CULL_FACE)
  translate(cam.eyeX, cam.eyeY, cam.eyeZ)
  rotateY(-pan)
  rotateZ(camtilt + PI)
  translate(100, 0, 0)
  rotateY(-PI/2)
  rotateZ(PI)
  push()
    fill(150)
    rectMode(CENTER)
    fill(100)
    rect(0, (windowHeight/16)*0.85, windowWidth/16, windowHeight/48)
  pop()
  push()
    fill(255)
    textAlign(RIGHT)
    text("Name: " + nickname, windowWidth/16*0.85, (windowHeight/16)*0.85)
  pop()
  push()
    
    //console.log(maxcamtilt, mincamtilt)
    // Clamp the camera's camtilt angle
    if (camtilt < maxcamtilt) {
      this._renderer.rotateVelocity.y += -0.1
      //cam._orbit(0, -0.05, 0)
      
    } else if (camtilt > mincamtilt) {
      this._renderer.rotateVelocity.y += 0.1
      //cam._orbit(0, 0.05, 0)
    }
    textAlign(LEFT)
    fill(255)
  pop()

  
  //ellipse(windowWidth/16, windowHeight/16, 5)
  

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
        chessBoard[i][j].hovered = true
      } else {chessBoard[i][j].hovered = false}
      } else {chessBoard[i][j].hovered = false}
      translate(chessBoard[i][j].x, chessBoard[i][j].y, chessBoard[i][j].z);
      rotateX(PI/2)
      rotateZ(PI/2)
      let tileTexture = chessBoardObject.getTileTexture(i, j);
      //Render the tiles differently if they're selected or hovered
      if (chessBoard[i][j].selected == true) {
        fill(0,255,0)
        noStroke()
      }
      else if (chessBoard[i][j].hovered == true) {
        fill(255,0,0)
        noStroke()
      } 
      else {
        stroke(0,0,0)
        texture(tileTexture);
      }
      if (chessBoard[i][j].piece) {
        chessBoard[i][j].piece.drawModel()
      }
      
      

      shininess(100);
      tint(200, 255)
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
      //playerTileSelected = [selectedTile.x, selectedTile.z]
    }
  }
  if (key === 'e') {
    console.log("X: " + cam.eyeX)
    console.log("Y: " + cam.eyeY)
    console.log("Z: " + cam.eyeZ)
    console.log("FOV: " + cam.cameraFOV)
  }

}



function selectTile(chessBoardObject, x, y) {
  let chessBoard = chessBoardObject.getBoard();
  let pieceMoved = false
  console.log(chessBoardObject.getTileData(x, y))
  if (!chessBoard[x][y].selected) {
    for (let i = 0; i < chessBoardObject.getWidth(); i++) {
      for (let j = 0; j < chessBoardObject.getHeight(); j++) {
        
        if (chessBoard[i][j].selected && chessBoard[i][j].piece && chessBoard[i][j] !== chessBoard[x][y] && (chessBoard[x][y].piece == null || chessBoard[x][y].piece.getColor() !== chessBoard[i][j].piece.getColor())) {
          move = {
            from: {x: i, y: j},
            to: {x: x, y: y}
          }
          chessBoardObject.move(move)
          socket.emit('move', move)
          pieceMoved = true
        }
        chessBoard[i][j].selected = false
  if (pieceMoved) {
    chessBoard[x][y].selected = false
  } else {
    chessBoard[x][y].selected = true
  }

      }}
  } else {
    chessBoard[x][y].selected = false
  }
}

function mousePressed() {
  let hoveredTile = getSelectedTile(mouseX, mouseY, chessBoard)
  console.log("X: " + mouseX + " Y" + mouseY)
  if (hoveredTile) {
    mousePressedInBoard = true
    selectTile(chessBoard, hoveredTile.x, hoveredTile.y)
  } else{
    mousePressedInBoard = false
  }
}

function mouseReleased() {
  mousePressedInBoard = false
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
