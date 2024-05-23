let chessBoard = []
let whiteTexture, blackTexture


function preload() {
  whiteTexture = loadImage("Assets/henry-co-tqu0IOMaiU8-unsplash.jpg")
  blackTexture = loadImage("Assets/pawel-czerwinski-BPrk2cOoCq8-unsplash.jpg")
}

function setup() {
  createCanvas(windowWidth-15, windowHeight-15, WEBGL)
  chessBoard = new Chessboard(9, 9, 20, whiteTexture, blackTexture)
  rectMode(CENTER)
}

function draw() {
  //debugMode()
  background(200)
  orbitControl()
  //lightFalloff(0.45, 0, 0)
  //pointLight(255, 255, 255, 100, -100, 100)
  drawChessBoard(chessBoard)

}

function drawChessBoard(chessBoardObject) {
  let chessBoard = chessBoardObject.getBoard()
  let tileSize = chessBoardObject.getTileSize()
  let offsetX = (chessBoard[0].length-1)*(tileSize/2) - (tileSize/2)
  let offsetY = (chessBoard.length-1)*(tileSize/2) - (tileSize/2)
  for (let i = 0; i < chessBoard.length-1; i++) {
    for (let j = 0; j < chessBoard[i + 1].length-1; j++) {
      push()
      translate((j*tileSize)-offsetX, 0, (i*tileSize)-offsetY)
      let tileTexture = chessBoardObject.getTileTexture(i, j);
      texture(tileTexture)
      shininess(100)
      box(tileSize, 10, tileSize)
      pop()
    }
  }
}