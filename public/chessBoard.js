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
  setTileData(x, y, data) {
    if (y >= 0 && y < this.width && x >= 0 && x < this.height) {
      this.chessBoard[x][y] = { ...this.chessBoard[x][y], ...data };
    } else {
      console.error("Invalid tile coordinates");
    }
  }
  getTileData(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.chessBoard[x][y];
    } else {
      console.error("Invalid tile coordinates");
      return null;
    }
  }
  move(move) {
    let from = move.from;
    let to = move.to;
    let piece = this.getTileData(from.x, from.y).piece;
    this.setTileData(to.x, to.y, { piece: piece });
    this.setTileData(from.x, from.y, { piece: null });
    //let isPieceChecked = this.didLastMovePutKingInCheck(move);
    //if (isPieceChecked) {
    //  check = isPieceChecked
    //}
  }

  //didLastMovePutKingInCheck(move) {
  //  let to = move.to;
  //  console.log("X: " + to.x + " Y: " + to.y + " Chessboard: " + this);
  //  if (!this.getTileData(to.x, to.y).piece) {
  //    return
  //  }
  //  let movesToCheckForKing = this.getTileData(to.x, to.y).piece.getAvailableMoves(this, to.x, to.y);
  //  for (let i = 0; i < movesToCheckForKing.length; i++) {
  //    let moveCheck = movesToCheckForKing[i];
  //    let piece = this.getTileData(moveCheck.x, moveCheck.y).piece;
  //    if (piece != null && piece.type == "king") {
  //      if (piece.color == "white") {
  //        piece.setCheck(true)
  //        console.log("White King in Check");
  //        return "white";
  //      } else if (piece.color == "black") {
  //        piece.setCheck(true)
  //        console.log("Black King in Check");
  //        return "black";
  //      }
  //    }
  //  }
  //  return false;
  //}

  populateBoard() {
    for (let i = 0; i < this.width; i++) {
      this.setTileData(i, 1, { piece: new ChessPiece("pawn", "black") });
      this.setTileData(i, this.height - 2, { piece: new ChessPiece("pawn", "white") });
    }
    this.setTileData(0, 0, { piece: new ChessPiece("rook", "black") });
    this.setTileData(1, 0, { piece: new ChessPiece("knight", "black") });
    this.setTileData(2, 0, { piece: new ChessPiece("bishop", "black") });
    //this.setTileData(3, 0, { piece: new ChessPiece("queen", "black") });
    //this.setTileData(4, 0, { piece: new ChessPiece("king", "black") });
    this.setTileData(5, 0, { piece: new ChessPiece("bishop", "black") });
    this.setTileData(6, 0, { piece: new ChessPiece("knight", "black") });
    this.setTileData(7, 0, { piece: new ChessPiece("rook", "black") });
    for (let i = 0; i < this.width; i++) {
      this.setTileData(i, 1, { piece: new ChessPiece("pawn", "black") });
      this.setTileData(i, this.height - 2, { piece: new ChessPiece("pawn", "white") });
    }
    this.setTileData(0, this.height - 1, { piece: new ChessPiece("rook", "white") });
    this.setTileData(1, this.height - 1, { piece: new ChessPiece("knight", "white") });
    this.setTileData(2, this.height - 1, { piece: new ChessPiece("bishop", "white") });
    //this.setTileData(3, this.height - 1, { piece: new ChessPiece("queen", "white") });
    //this.setTileData(4, this.height - 1, { piece: new ChessPiece("king", "white") });
    this.setTileData(5, this.height - 1, { piece: new ChessPiece("bishop", "white") });
    this.setTileData(6, this.height - 1, { piece: new ChessPiece("knight", "white") });
    this.setTileData(7, this.height - 1, { piece: new ChessPiece("rook", "white") });
  }

  isInCheck(color) {
    let kingPos = this.findKing(color);
    let king = this.getTileData(kingPos.x, kingPos.y).piece;
    //loop through the board
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        //get the piece at loop location
        let piece = this.getTileData(j, i).piece;
        //if the piece exists and is not the same color as the king
        if (piece && piece.color != color) {

          let moves = piece.getAvailableMoves(this, j, i);
          for (let i = 0; i < moves.length; i++) {
            if (moves[i].x == kingPos.x && moves[i].y == kingPos.y) {
              return true;
            }
          }
        }
      }
    }
    return false;

}

  findKing(color) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (this.getTileData(j, i)) {
          if (this.getTileData(j,i).piece) {
        let piece = this.getTileData(j, i).piece;
        if (piece != null && piece.color == color && piece.type == "king") {
          return { x: j, y: i };
        }
      }
    }
    }
    }
  }
}
