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
        let resolution = tileSize*10
        let tileGraphic = createGraphics(resolution, resolution);
        let sx, sy;
        if (this.chessBoard[i][j].type == "white") {
          sx = random(whiteTexture.width - resolution);
          sy = random(whiteTexture.height - resolution);
          tileGraphic.image(whiteTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
        } else if (this.chessBoard[i][j].type == "black"){
          sx = random(blackTexture.width - resolution);
          sy = random(blackTexture.height - resolution);
          tileGraphic.image(blackTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
        }

        // Store the tile texture
        this.textures.push(tileGraphic);
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
}
