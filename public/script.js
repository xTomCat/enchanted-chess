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
const cardHeight = 435
const cardWidth = 313

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
  backofcard = loadImage('Assets/backofcard.png');
  menubackground = loadImage('Assets/background.png')
  personicon = loadImage('Assets/personicon.png')
  hamburgericon = loadImage('Assets/Hamburger_icon.svg.png')
  manadiamondred = loadImage('Assets/manadiamondred.png')
  manadiamondblue = loadImage('Assets/manadiamondblue.png')
  manadiamondgrey = loadImage('Assets/manadiamondgrey.png')
  manaorb = loadImage('Assets/manaorb.png')
  placeholdercard = loadImage("Assets/backofcard.png")
  fireballcard = loadImage("Assets/fireballcard.png")

  
}

function setup() {
  socket = io()
  createCanvas(windowWidth, windowHeight, WEBGL)
  canvas2d = createGraphics(windowWidth, windowHeight)
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
  chessBoard = new Chessboard(8, 8, 20, whiteTexture, blackTexture).populateBoard()
  cardDataManager = new CardDataManager()
  //cardDataManager.addCardToDeck("Placeholder")
  //cardDataManager.addCardToDeck("Placeholder")
  //cardDataManager.addCardToDeck("Placeholder")
  //cardDataManager.addCardToDeck("Placeholder")
  //chessBoard.populateBoard()
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

    socket.on('moveRejected', (data) => {
    console.log('Move rejected:', data.reason)
    // Resync board state from server
    if (gameData) {
      compareBoard(chessBoard, gameData.board)
    }
  })

  socket.on('nicknameChanged', (changedNickname) => {
    console.log("Nickname changed to: " + changedNickname)
    nickname = changedNickname
    if (guiRenderer) {
      guiRenderer.setButtonText("nickname", nickname)
      guiRenderer.setButtonText("playerNamePlate", nickname)
    }
  })

  socket.on('receivePlayCard', (pColor, index, x, y, card) => {
    console.log(pColor + "is playing card with index: " + index)
    if (pColor == color) {
      
      cardDataManager.playCard(index, x, y)
     } else {
       cardDataManager.activateCardEffect(card, x, y, true)
     }
  })

  socket.on('receiveFakePiece', (x, y, piece) => {
    console.log("received fake piece")
    chessBoard.setTileData(x, y, {piece: new ChessPiece(piece.type, piece.color)})
  })

  socket.on('roomCreated', (roomCode) => {
    room = roomCode
    //let roomCloseButton = createButton('Close room')
    //roomCloseButton.position(8, windowHeight-88)
    //roomCloseButton.mousePressed(closeRoom)
    //socket.emit('updateDeck', cardDataManager.playerDeck)
    if (guiRenderer) {
      guiRenderer.setScreen("game")
    }

  })
  

  socket.on('roomClosed', () => {
    room = null
    chessBoard.clearBoard().populateBoard()
    color = "unset!"
    console.log('Room closed')
    gameData = null
    cardDataManager.resetDeck()
    if (guiRenderer) {
      guiRenderer.setScreen("menu")
    }
  })

  socket.on('requestDeck', () => {
    socket.emit('sendDeck', cardDataManager.playerDeck)
    console.log("Server requested deck")
  })

  socket.on('gameData', (gameDataReceived) => { 
    gameData = gameDataReceived
    console.log("gameData: ")
    console.log(gameData)
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
      let roomCodeAsString = "Room code: " + gameData.roomCode.toString()
      if (roomCodeText.getText() !== roomCodeAsString) {
        roomCodeText.updateText(roomCodeAsString)
      }
      //if (gameData.fakePieces.length > 0) {
      //  for (let piece of gameData.fakePieces) {
      //    chessBoard.setTileData(piece.x, piece.y, {piece: new ChessPiece(piece.type, piece.color)})
      //  }
//
      //}
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
        if (gameData.turn == color)
          guiRenderer.ingameGuiElements.statusText.updateText("It's your turn!")
        else {
          guiRenderer.ingameGuiElements.statusText.updateText("It's " + opponent.name + "'s turn!")
        }
        
        
        
    }
  }
    compareBoard(chessBoard, gameDataReceived.board)
    if (chessBoard && gameDataReceived.lastMove) {
      console.log(gameDataReceived.lastMove)
      let piece = chessBoard.getTileData(gameDataReceived.lastMove.to.x, gameDataReceived.lastMove.to.y).piece;
       if (piece) {
        piece.lastMove = gameDataReceived.lastMove;
        
      }
    }
    console.log(chessBoard.getBoard())
    check = gameData.check
  })



  socket.on('initBoard', (board) => {
    console.log("init board received")
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
    console.log("Color set to: " + setColor)
    color = setColor
  })

  socket.on('leavingSoon', (count) => {
    timeUntilLeaving = count
    if (guiRenderer) {
      guiRenderer.ingameGuiElements.statusText.updateText("Leaving in " + timeUntilLeaving + " seconds")
    }
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
  socket.emit('createRoom', cardDataManager.deckAsServerData())
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
    socket.emit('joinGame', roomCode, cardDataManager.deckAsServerData())
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

function easeOutQuad (t, b, c, d) {
  return -c * (t /= d) * (t - 2) + b;
}


function draw() {
  currentFrameTime = performance.now()
  deltaTime = (currentFrameTime - lastFrameTime)/1000
  lastFrameTime = currentFrameTime 
  totalTime += deltaTime
  framesSinceMouseMoved++
  background(100)
  guiRenderer.renderBackground()
  if (frameCount % targetFrameRate == 0) {
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

          orbitControl()
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
}
if (cardDataManager) {
  cardDataManager.updateCardPositions()
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

  //if (guiRenderer) {
  //  if (guiRenderer.ingameGuiElements.chatInput.focused) {
  //    let chatInput = guiRenderer.ingameGuiElements.chatInput
  //    chatInput.typeCharacter(key)
//
  //  }
  //}

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
    //let card = cardDataManager.getSelectedCard()
    //console.log("Gui scale: " + guiRenderer.guiScale)
    //console.log("mouseX: " + mouseClickedLoc.x + " mouseY: " + mouseClickedLoc.y)
    //if (card) {
    //  let targX = mouseClickedLoc.x/(guiRenderer.guiScale)// - card.iconBuffer.gBuffer.width/2// * guiRenderer.guiScale; // Distance from left of the screen
    //  let targY = mouseClickedLoc.y/(guiRenderer.guiScale)// - card.iconBuffer.gBuffer.height/4// * guiRenderer.guiScale;
    //  //if (card.iconBuffer.align == RIGHT) {
    //  //    targX = windowWidth + targX
    //  //} else if (card.iconBuffer.align == CENTER) {
    //  //    targX = ((windowWidth+15)/2)
    //  //    canvas.imageMode(CENTER)
    //  //}
    //  if (card.iconBuffer.anchorBottom) {
    //    //buttonY = windowHeight - (this.gBuffer.height - this.y) * guiScale
    //    targY = (targY - ((guiRenderer.height/2)) - ((card.iconBuffer.gBuffer.height/guiRenderer.guiScale)/2))
    //    //targY = targY - (card.iconBuffer.gBuffer.height - mouseClickedLoc.y) * guiRenderer.guiScale
    //    //targY = windowHeight - (card.iconBuffer.gBuffer.height - card.iconBuffer.y) * guiRenderer.guiScale
    //      
    //
    //  }
    //  card.iconBuffer.animateTo(targX, targY, 100)
   // }
  }
}

}



function mouseReleased() {
  mousePressedInBoard = false
  console.log("distance: " + dist(mouseX, mouseY, mouseClickedLoc.x, mouseClickedLoc.y))
  //if (dist(mouseX, mouseY, mouseClickedLoc.x, mouseClickedLoc.y) < 5) {
  //  for (let card of cardDataManager.playerDeck) {
  //    card.iconBuffer.setSelected(false)
  //  
  //  }
  //}
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
