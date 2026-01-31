class ChessPiece {
  constructor(type, color) {
    this.color = color
    this.type = type
    this.lastMove = null

    //Define the resolution of the texture to be used
    let resolution = 100
    let sx, sy
    //Determine the color of the texture
    if (this.color === "black") {
      this.texture = createGraphics(resolution, resolution)
      //Cut out a random portion of the larger texture and set the texture attribute to that
      sx = random(blackTexture.width - resolution);
      sy = random(blackTexture.height - resolution);
      this.texture.image(blackTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
    } else {
      this.texture = createGraphics(resolution, resolution)
      sx = random(whiteTexture.width - resolution);
      sy = random(whiteTexture.height - resolution);
      this.texture.image(whiteTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
    }
    switch (this.type) {
      case "pawn":
        this.model = pawnModel
        break
      case "rook":
        this.model = rookModel
        break
      case "knight":
        this.model = knightModel
        break
      case "bishop":
        this.model = bishopModel
        break
      case "queen":
        this.model = queenModel
        break
      case "king":
        this.model = kingModel
        break
    }
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

  getAvailableMoves(chessBoardObject, x, y, check = false) {
    let chessBoard = chessBoardObject.getBoard();
    let piece = chessBoard[x][y].piece;

    // Use shared movement logic
    let moves = PieceMovement.getAvailableMoves(chessBoardObject, x, y, piece);

    // Filter moves if in check
    if (check && this.color === check) {
      let newMoves = [];
      for (let move of moves) {
        let tempPiece = chessBoard[move.x][move.y].piece;
        // Simulate the move
        chessBoard[move.x][move.y].piece = piece;
        chessBoard[x][y].piece = null;
        // Check if still in check
        if (!chessBoardObject.isInCheck(this.color)) {
          newMoves.push(move);
        }
        // Revert
        chessBoard[move.x][move.y].piece = tempPiece;
        chessBoard[x][y].piece = piece;
      }
      moves = newMoves;
    }
    return moves;
  }

  // Movement logic now handled by shared/pieceMovement.js
}
