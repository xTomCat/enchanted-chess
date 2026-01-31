// Universal module that works in both Node.js and browser
(function(exports) {

  function getPawnMoves(board, x, y, piece) {
    const chessBoard = board.getBoard();
    const width = board.getWidth();
    const height = board.getHeight();
    const moves = [];
    const direction = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;

    // Forward one
    const forwardOne = { x: x, y: y + direction };
    if (isInBounds(forwardOne.x, forwardOne.y, width, height)) {
      if (!chessBoard[forwardOne.x][forwardOne.y].piece) {
        moves.push(forwardOne);

        // Forward two (only from starting position)
        const forwardTwo = { x: x, y: y + 2 * direction };
        if (y === startRow && isInBounds(forwardTwo.x, forwardTwo.y, width, height)) {
          if (!chessBoard[forwardTwo.x][forwardTwo.y].piece) {
            moves.push(forwardTwo);
          }
        }
      }
    }

    // Captures (diagonal)
    const captures = [
      { x: x - 1, y: y + direction },
      { x: x + 1, y: y + direction }
    ];

    for (const capture of captures) {
      if (isInBounds(capture.x, capture.y, width, height)) {
        const targetPiece = chessBoard[capture.x][capture.y].piece;
        if (targetPiece && targetPiece.color !== piece.color) {
          moves.push(capture);
        }
      }
    }

    // En passant
    const enPassantRow = piece.color === "white" ? 3 : 4;
    if (y === enPassantRow) {
      const enPassantTargets = [
        { x: x - 1, y: y },
        { x: x + 1, y: y }
      ];

      for (const target of enPassantTargets) {
        if (isInBounds(target.x, target.y, width, height)) {
          const adjacentPiece = chessBoard[target.x][target.y].piece;
          if (adjacentPiece &&
              adjacentPiece.type === "pawn" &&
              adjacentPiece.color !== piece.color &&
              adjacentPiece.lastMove &&
              Math.abs(adjacentPiece.lastMove.to.y - adjacentPiece.lastMove.from.y) === 2) {
            moves.push({ x: target.x, y: target.y + direction, enPassant: true });
          }
        }
      }
    }

    return moves;
  }

  function getRookMoves(board, x, y, piece) {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    return getSlidingMoves(board, x, y, piece, directions);
  }

  function getBishopMoves(board, x, y, piece) {
    const directions = [
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 }
    ];
    return getSlidingMoves(board, x, y, piece, directions);
  }

  function getQueenMoves(board, x, y, piece) {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 }
    ];
    return getSlidingMoves(board, x, y, piece, directions);
  }

  function getKnightMoves(board, x, y, piece) {
    const chessBoard = board.getBoard();
    const width = board.getWidth();
    const height = board.getHeight();
    const moves = [];

    const offsets = [
      { x: 2, y: 1 }, { x: 2, y: -1 },
      { x: -2, y: 1 }, { x: -2, y: -1 },
      { x: 1, y: 2 }, { x: 1, y: -2 },
      { x: -1, y: 2 }, { x: -1, y: -2 }
    ];

    for (const offset of offsets) {
      const newX = x + offset.x;
      const newY = y + offset.y;
      if (isInBounds(newX, newY, width, height)) {
        const targetPiece = chessBoard[newX][newY].piece;
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push({ x: newX, y: newY });
        }
      }
    }

    return moves;
  }

  function getKingMoves(board, x, y, piece) {
    const chessBoard = board.getBoard();
    const width = board.getWidth();
    const height = board.getHeight();
    const moves = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const newX = x + dx;
        const newY = y + dy;
        if (isInBounds(newX, newY, width, height)) {
          const targetPiece = chessBoard[newX][newY].piece;
          if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push({ x: newX, y: newY });
          }
        }
      }
    }

    return moves;
  }

  // Helper: sliding pieces (rook, bishop, queen)
  function getSlidingMoves(board, x, y, piece, directions) {
    const chessBoard = board.getBoard();
    const width = board.getWidth();
    const height = board.getHeight();
    const moves = [];

    for (const dir of directions) {
      let newX = x + dir.x;
      let newY = y + dir.y;

      while (isInBounds(newX, newY, width, height)) {
        const targetPiece = chessBoard[newX][newY].piece;
        if (!targetPiece) {
          moves.push({ x: newX, y: newY });
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push({ x: newX, y: newY });
          }
          break;
        }
        newX += dir.x;
        newY += dir.y;
      }
    }

    return moves;
  }

  function isInBounds(x, y, width, height) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function getAvailableMoves(board, x, y, piece) {
    switch (piece.type) {
      case "pawn": return getPawnMoves(board, x, y, piece);
      case "rook": return getRookMoves(board, x, y, piece);
      case "knight": return getKnightMoves(board, x, y, piece);
      case "bishop": return getBishopMoves(board, x, y, piece);
      case "queen": return getQueenMoves(board, x, y, piece);
      case "king": return getKingMoves(board, x, y, piece);
      default: return [];
    }
  }

  // Export all functions
  exports.getPawnMoves = getPawnMoves;
  exports.getRookMoves = getRookMoves;
  exports.getBishopMoves = getBishopMoves;
  exports.getQueenMoves = getQueenMoves;
  exports.getKnightMoves = getKnightMoves;
  exports.getKingMoves = getKingMoves;
  exports.getAvailableMoves = getAvailableMoves;
  exports.isInBounds = isInBounds;

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.PieceMovement = {}));
