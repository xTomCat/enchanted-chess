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
     noStroke();
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
    let moves = [];
    switch (piece.type) {
      case "pawn":
        moves = this.getPawnMoves(chessBoardObject, x, y);
        break;
      case "rook":
        moves = this.getRookMoves(chessBoardObject, x, y);
        break;
      case "knight":
        moves = this.getKnightMoves(chessBoardObject, x, y);
        break;
      case "bishop":
        moves = this.getBishopMoves(chessBoardObject, x, y);
        break;
      case "queen":
        moves = this.getQueenMoves(chessBoardObject, x, y);
        break;
      case "king":
        moves = this.getKingMoves(chessBoardObject, x, y);
        break;
    }
    //Edit moves if the client is in check
    if (check && this.color === check) {
      console.log("Editing moves because player is in check!")
      let newMoves = []
      //Loop through each move
      for (let i = 0; i < moves.length; i++) {
        let move = moves[i]
        let tempPiece = chessBoard[move.x][move.y].piece
        //Simulate the move happening. If the king is still in check afterwards, don't save the move.
        chessBoard[move.x][move.y].piece = piece
        chessBoard[x][y].piece = null
        let checkTrue = chessBoardObject.isInCheck(this.color)
        //If the king isn't in check, save the move
        if (!checkTrue) {
          newMoves.push(move)
        }
        //Revert board back to original state
        chessBoard[move.x][move.y].piece = tempPiece
        chessBoard[x][y].piece = piece
      }
      //Set the moves to the new moves
      moves = newMoves
    } 
    return moves;
  }

  getPawnMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard(); //get the board
    let piece = chessBoard[x][y].piece; //get the piece at the current location
    let moves = [];
    let direction = piece.color === "white" ? -1 : 1; //determine the piece based on color
    //initialise the possible moves
    let forwardOne = { x: x, y: y + direction }
    let forwardTwo = { x: x, y: y + 2 * direction }
    let leftCapture = { x: x - 1, y: y + direction }
    let rightCapture = { x: x + 1, y: y + direction }
    //validate each move and add them to the moves array if valid
    if (forwardOne.x >= 0 && forwardOne.x < chessBoardObject.getWidth() && forwardOne.y >= 0 && forwardOne.y < chessBoardObject.getHeight()) {
      if (chessBoard[forwardOne.x][forwardOne.y].piece === null) {
        moves.push(forwardOne)
        if (!(forwardTwo.x >= 0 && forwardTwo.x < chessBoardObject.getWidth() && forwardTwo.y >= 0 && forwardTwo.y < chessBoardObject.getHeight())) {
          return;
        }
        if (chessBoard[forwardTwo.x][forwardTwo.y].piece === null && (piece.color === "white" && y === 6) || (piece.color === "black" && y === 1)) {
          moves.push(forwardTwo)
        }
      }
      if (leftCapture.x >= 0 && leftCapture.x < chessBoardObject.getWidth() && leftCapture.y >= 0 && leftCapture.y < chessBoardObject.getHeight()) {
        if (chessBoard[leftCapture.x][leftCapture.y].piece) {
          if (chessBoard[leftCapture.x][leftCapture.y].piece.color !== piece.color) {
            moves.push(leftCapture)
          }
      }
      }
      if (rightCapture.x >= 0 && rightCapture.x < chessBoardObject.getWidth() && rightCapture.y >= 0 && rightCapture.y < chessBoardObject.getHeight()) {
        if (chessBoard[rightCapture.x][rightCapture.y].piece) {
          if (chessBoard[rightCapture.x][rightCapture.y].piece !== null && chessBoard[rightCapture.x][rightCapture.y].piece.color !== piece.color) {
            moves.push(rightCapture)
          }
      } //en passant
      let enPassantYRequirement = piece.color === "white" ? 3 : 4
      if (y == enPassantYRequirement) {
        let leftEnPassant = { x: x + 1, y: y, enPassant: true}
        let rightEnPassant = { x: x - 1, y: y, enPassant: true }
        if (leftEnPassant.x >= 0 && leftEnPassant.x < chessBoardObject.getWidth() && leftEnPassant.y >= 0 && leftEnPassant.y < chessBoardObject.getHeight()) {
          if (chessBoard[leftEnPassant.x][leftEnPassant.y].piece) {
            let enemyPiece = chessBoard[leftEnPassant.x][leftEnPassant.y].piece
            if (enemyPiece.type === "pawn" && enemyPiece.color !== piece.color && enemyPiece.lastMove === Math.abs(enemyPiece.lastMove.to.y - enemyPiece.lastMove.from.y) === 2) {
              leftEnPassant.y += direction
              moves.push(leftEnPassant)
            }
          }
        }
        if (rightEnPassant.x >= 0 && rightEnPassant.x < chessBoardObject.getWidth() && rightEnPassant.y >= 0 && rightEnPassant.y < chessBoardObject.getHeight()) {
          console.log("a")
          console.log("Checking coords: ", rightEnPassant.x, rightEnPassant.y)
          if (chessBoard[rightEnPassant.x][rightEnPassant.y].piece) {
            console.log("b")
            let enemyPiece = chessBoard[rightEnPassant.x][rightEnPassant.y].piece
            console.log(enemyPiece)
            console.log("Type: ", enemyPiece.type)
            console.log("Color: ", enemyPiece.color)
            console.log("Last move: ", enemyPiece.lastMove)
            console.log("Amount of spaces moved: " + Math.abs(enemyPiece.lastMove.to.y - enemyPiece.lastMove.from.y))

            if (enemyPiece.type === "pawn" && enemyPiece.color !== piece.color && enemyPiece.lastMove === Math.abs(enemyPiece.lastMove.to.y - enemyPiece.lastMove.from.y) === 2) {
              console.log("c")
              rightEnPassant.y += direction
              moves.push(rightEnPassant)
            }
          }
        }
      }
      }

      
    }
    return moves
  }

  getRookMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard();
    let piece = chessBoard[x][y].piece;
    let moves = [];
    let directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ]
    for (let i = 0; i < directions.length; i++) {
      let dx = directions[i].x
      let dy = directions[i].y
      let newX = x + dx
      let newY = y + dy
      while (newX >= 0 && newX < chessBoardObject.getWidth() && newY >= 0 && newY < chessBoardObject.getHeight()) {
        if (chessBoard[newX][newY].piece === null) {
          moves.push({ x: newX, y: newY })
        } else {
          if (chessBoard[newX][newY].piece.color !== piece.color) {
            moves.push({ x: newX, y: newY })
          }
          break
        }
        newX += dx
        newY += dy
      }
    }
    return moves
  }

  getKnightMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard()
    let piece = chessBoard[x][y].piece
    let moves = []
    let targets = [
      { x: -1, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: -1 },
      { x: -2, y: 1 },
      { x: -2, y: -1 },
      { x: -1, y: -2 },
      { x: 1, y: -2 }
    ]

    for (let i = 0; i < targets.length; i++) {
      let newX = x + targets[i].x
      let newY = y + targets[i].y
      if (newX >= 0 && newX < chessBoardObject.getWidth() && newY >= 0 && newY < chessBoardObject.getHeight()) {
        if (chessBoard[newX][newY].piece === (null) || chessBoard[newX][newY].piece.color !== piece.color) {
          moves.push({ x: newX, y: newY })
        }
      }
    }
    return moves
  }

  getBishopMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard()
    let piece = chessBoard[x][y].piece
    let moves = []
    //Directions different compared to rook
    let directions = [
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ]
    for (let i = 0; i < directions.length; i++) {
      let dx = directions[i].x
      let dy = directions[i].y
      let newX = x + dx
      let newY = y + dy
      while (newX >= 0 && newX < chessBoardObject.getWidth() && newY >= 0 && newY < chessBoardObject.getHeight()) {
        if (chessBoard[newX][newY].piece === null) {
          moves.push({ x: newX, y: newY })
        } else {
          if (chessBoard[newX][newY].piece.color !== piece.color) {
            moves.push({ x: newX, y: newY })
          }
          break
        }
        newX += dx
        newY += dy
      }
    }
    return moves
}

  getQueenMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard()
    let piece = chessBoard[x][y].piece
    let moves = []
    let directions = [ 
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ]
    for (let i = 0; i < directions.length; i++) {
      let dx = directions[i].x
      let dy = directions[i].y
      let newX = x + dx
      let newY = y + dy
      while (newX >= 0 && newX < chessBoardObject.getWidth() && newY >= 0 && newY < chessBoardObject.getHeight()) {
        if (chessBoard[newX][newY].piece === null) {
          moves.push({ x: newX, y: newY })
        } else {
          if (chessBoard[newX][newY].piece.color !== piece.color) {
            moves.push({ x: newX, y: newY })
          }
          break
        }
        newX += dx
        newY += dy
      }
    }
    return moves
  }

  getKingMoves(chessBoardObject, x, y) {
    let chessBoard = chessBoardObject.getBoard()
    let piece = chessBoard[x][y].piece
    let moves = []
    let directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ]
    for (let i = 0; i < directions.length; i++) {
      let dx = directions[i].x
      let dy = directions[i].y
      let newX = x + dx
      let newY = y + dy
      if (newX >= 0 && newX < chessBoardObject.getWidth() && newY >= 0 && newY < chessBoardObject.getHeight()) {
        if (chessBoard[newX][newY].piece === null || chessBoard[newX][newY].piece.color !== piece.color) {
          moves.push({ x: newX, y: newY })
        }
      }
    }
    return moves
  }

}
