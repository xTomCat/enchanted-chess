class Chessboard {
  constructor(width, height, tileSize, whiteTexture, blackTexture) {
    this.width = width
    this.height = height
    this.tileSize = tileSize
    this.whiteTexture = whiteTexture;
    this.blackTexture = blackTexture;
    this.chessBoard = []
    this.textures = []

   
    
    for (let i = 0; i < this.height; i++) {
      this.chessBoard.push([]);
      for (let j = 0; j < this.width; j++) {
        if ((i + j) % 2 === 0) {
          this.chessBoard[i].push({type: "black"});
        } else {
          this.chessBoard[i].push({type: "white"});
        }
        
        let resolution = tileSize * 5
        let tileGraphic = createGraphics(resolution, resolution);
        let sx, sy;
        if (this.chessBoard[i][j].type == "white") {
          sx = random(this.whiteTexture.width - resolution);
          sy = random(this.whiteTexture.height - resolution);
          tileGraphic.image(this.whiteTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
        } else if (this.chessBoard[i][j].type == "black"){
          sx = random(this.blackTexture.width - resolution);
          sy = random(this.blackTexture.height - resolution);
          tileGraphic.image(this.blackTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
        }
        this.textures.push(tileGraphic);
      }
    }
    
    let offsetX = (this.chessBoard[0].length - 1) * (this.tileSize / 2) - (this.tileSize / 2);
    let offsetY = (this.chessBoard.length - 1) * (this.tileSize / 2) - (this.tileSize / 2);
    for (let i = 0; i < this.chessBoard.length; i++) {
      for (let j = 0; j < this.chessBoard[i].length; j++) {
        this.chessBoard[i][j].x = (j * tileSize) - offsetX - (this.tileSize/2);
        this.chessBoard[i][j].y = 0
        this.chessBoard[i][j].z = (i * tileSize) - offsetY - (this.tileSize/2);
      }
    }
    

    
  }
  getBoard() {
    return this.chessBoard
  }
  getTileSize() {
    return this.tileSize
  }
  getTileTexture(i, j) {
    return this.textures[i * this.width + j];
  }
  getHeight() {
    return this.height
  }
  getWidth() {
    return this.width
  }
}