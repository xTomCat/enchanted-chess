class Chessboard {
  constructor(board, tileSize, width, height) {
    this.width = width
    this.height = height
    this.tileSize = tileSize
    this.chessBoard = board
  
  }
  getBoard() {
    return this.chessBoard
  }
  getTileSize() {
    return this.tileSize
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
  }

  populateBoard() {
    for (let i = 0; i < this.width; i++) {
      this.setTileData(i, 1, { piece: new ChessPiece("pawn", "black") });
      this.setTileData(i, this.height - 2, { piece: new ChessPiece("pawn", "white") });
    }
    this.setTileData(0, 0, { piece: new ChessPiece("rook", "black") });
    this.setTileData(1, 0, { piece: new ChessPiece("knight", "black") });
    this.setTileData(2, 0, { piece: new ChessPiece("bishop", "black") });
    this.setTileData(3, 0, { piece: new ChessPiece("queen", "black") });
    this.setTileData(4, 0, { piece: new ChessPiece("king", "black") });
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
    this.setTileData(3, this.height - 1, { piece: new ChessPiece("queen", "white") });
    this.setTileData(4, this.height - 1, { piece: new ChessPiece("king", "white") });
    this.setTileData(5, this.height - 1, { piece: new ChessPiece("bishop", "white") });
    this.setTileData(6, this.height - 1, { piece: new ChessPiece("knight", "white") });
    this.setTileData(7, this.height - 1, { piece: new ChessPiece("rook", "white") });
  }
}