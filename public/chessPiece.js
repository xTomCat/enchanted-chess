const DARK_PIECE_LIFT = [38, 38, 48]
class ChessPiece {
  constructor(type, color) {
    this.color = color
    this.type = type
    this.lastMove = null
    this.texture = ChessPiece.sharedTexture(color)
    ChessPiece.models = ChessPiece.models || {pawn: pawnModel, rook: rookModel, knight: knightModel,
      bishop: bishopModel, queen: queenModel, king: kingModel}
    this.model = ChessPiece.models[type]
  }

  static sharedTexture(color) {
    ChessPiece.textures = ChessPiece.textures || {}
    if (!ChessPiece.textures[color]) {
      const res = 100, src = color === "black" ? blackTexture : whiteTexture
      const graphic = createGraphics(res, res)
      graphic.image(src, 0, 0, res, res, random(src.width - res), random(src.height - res), res, res)
      if (color === "black") {
        graphic.blendMode(SCREEN); graphic.noStroke(); graphic.fill(...DARK_PIECE_LIFT)
        graphic.rect(0, 0, res, res); graphic.blendMode(BLEND)
      }
      ChessPiece.textures[color] = graphic
    }
    return ChessPiece.textures[color]
  }

  drawModel() {
     push();
     rotateX(PI / 2);
     scale(25);
     //noStroke();
     texture(this.texture);
     model(this.model);
     pop();
  }

  getType() {
    return this.type;
  }

  getColor() {
    return this.color;
  }

  setCheck(check) {
    if (this.type == "king") {
      this.inCheck = check
    }
  }

  getAvailableMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard();
    let piece = chessBoard[x][y].piece;

    let moves = PieceMovement.getAvailableMoves(chessBoardObject, x, y, piece);

    // Get rid of moves that leave our king in check
    let newMoves = [];
    for (let move of moves) {
      let tempPiece = chessBoard[move.x][move.y].piece;
      // Simulate the move
      chessBoard[move.x][move.y].piece = piece;
      chessBoard[x][y].piece = null;
      if (!chessBoardObject.isInCheck(this.color)) {
        newMoves.push(move);
      }
      // Revert
      chessBoard[move.x][move.y].piece = tempPiece;
      chessBoard[x][y].piece = piece;
    }
    moves = newMoves;
    return moves;
  }

  // Movement logic now handled by shared/pieceMovement.js
}
