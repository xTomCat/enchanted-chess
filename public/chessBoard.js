class Chessboard {
  constructor(width, height, tileSize, whiteTexture, blackTexture) {
    this.width = width
    this.height = height
    this.tileSize = tileSize
    this.whiteTexture = whiteTexture;
    this.blackTexture = blackTexture;
    this.chessBoard = []
    this.textures = []
    this.rotAngle = 0

   
    //Loop through the board height
    for (let i = 0; i < this.height; i++) {
      this.chessBoard.push([]);
      //Loop through the board width
      for (let j = 0; j < this.width; j++) {
        //If the sum of the current x and y is even, the tile is black
        if ((i + j) % 2 === 0) {
          this.chessBoard[i].push({type: "black"});
        } else {
          this.chessBoard[i].push({type: "white"});
        }
        //Create a graphic for each tile
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
  clearBoard() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.setTileData(i, j, { piece: null });
      }
    }
    return this
  }
  move(move) {
    let from = move.from;
    let to = move.to;
    let piece = this.getTileData(from.x, from.y).piece;
    this.setTileData(to.x, to.y, { piece: piece });
    this.setTileData(from.x, from.y, { piece: null });
    //if (this.isCheckMate("black")) {
    //  console.log("Checkmate: Black");
    //  checkMate = "black";
    //} else if (this.isCheckMate("white")) {
    //  console.log("Checkmate: White");
    //  checkMate = "white";
    //}
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
    return this
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

  //isCheckMate(color) {
  //  let kingPos = this.findKing(color);
  //  let king = this.getTileData(kingPos.x, kingPos.y).piece;
  //  let moves = king.getAvailableMoves(this, kingPos.x, kingPos.y);
  //  let isInCheck = this.isInCheck(color);
  //  console.log("Checking for checkmate: \nMoves: " + moves[0] + " " + moves[1] + " " + moves[2] + "\nKing: " + kingPos.x + ", " + kingPos.y + "\nCheck: " + isInCheck + "\nLength: " + moves.length + "\nColor: " + color);
  //  if (moves.length == 0 && isInCheck) {
  //    return true;
  //  }
  //  else {
  //    return false;
  //  }
  //}

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

  getSelectedTile(mouseX, mouseY) {
    let chessBoard = this.chessBoard;
    let width = _renderer.width;
    let height = _renderer.height;
    // convert mouse coordinates to NDC
    let xNDC = (2 * mouseX) / width - 1;
    let yNDC = 1 - (2 * mouseY) / height;   

    let projMatrix = _renderer.uPMatrix.mat4;
    let viewMatrix = _renderer.uMVMatrix.mat4;    
    // combined transformation matrix (from projection and modelView matrices)
    let combinedMatrix = mat4.create();
    mat4.multiply(combinedMatrix, projMatrix, viewMatrix);    
    // invert the combined matrix
    let invCombinedMatrix = mat4.create();
    mat4.invert(invCombinedMatrix, combinedMatrix);
    // transform the NDC coordinates to world coordinates for the near and far points
    let nearPoint = vec3.transformMat4(vec3.create(), [xNDC, yNDC, -1], invCombinedMatrix);
    let farPoint = vec3.transformMat4(vec3.create(), [xNDC, yNDC, 1], invCombinedMatrix);   
    // Normalize the ray direction
    let rayDir = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), farPoint, nearPoint));
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.rayIntersectsTile(nearPoint, rayDir, x, y)) {
          return worldToBoardIndices(chessBoard[x][y].x, chessBoard[x][y].z, this);
        }
      }
    }   
    return null;
  }

  rayIntersectsTile(nearPoint, rayDir, x, y) {
    //Initialise relevant variables
    let chessBoard = this.chessBoard;
    let tile = chessBoard[x][y];
    let tileSize = this.tileSize;
    //Solve t for 0
    let t = -nearPoint[1] / rayDir[1];
    //If the raycast is going in the wrong direction, instantly returns false
    if (t < 0) {
      return false
    };
    //Calculation for the point of intersection
    let intersectPoint = vec3.create();
    vec3.scaleAndAdd(intersectPoint, nearPoint, rayDir, t);
    let epsilon = 0.0001; // small epsilon value to avoid problems with precision
    //calculate tile bounds based on the tile center coordinate and the tile size
    let minX = (tile.x) - tileSize / 2;
    let maxX = (tile.x) + tileSize / 2;
    let minZ = (tile.z) - tileSize / 2;
    let maxZ = (tile.z) + tileSize / 2;
    return (
      intersectPoint[0] >= minX - epsilon &&
      intersectPoint[0] <= maxX + epsilon &&
      intersectPoint[2] >= minZ - epsilon &&
      intersectPoint[2] <= maxZ + epsilon
    );
  }

  renderBoard() {
    push()
    if (guiRenderer) {
      if (guiRenderer.getState() == "menu") {
      if ((totalTime*targetFrameRate - guiRenderer.screenSwitchTimeStamp) < 100) {
        let t = (totalTime*targetFrameRate - guiRenderer.screenSwitchTimeStamp)/100;
        let tempRot = easeOutQuad(t, 0, this.rotAngle, 1);
        let translateX = easeOutQuad(t, 0, this.height * this.tileSize / 2, 1);
        translate(translateX, 0, 0);
        rotateY(tempRot);
      } else {
        translate(this.height * this.tileSize / 2, 0, 0);
        rotateY(this.rotAngle);
        this.rotAngle += 0.002 * deltaTime * targetFrameRate;
      }
      } else if (guiRenderer.getState() == "game" && (totalTime*targetFrameRate - guiRenderer.screenSwitchTimeStamp) < 100) {
      let t = (totalTime*targetFrameRate - guiRenderer.screenSwitchTimeStamp)/100;
      let tempRot = this.rotAngle - easeOutQuad(t, 0, this.rotAngle, 1);
      let translateX = (this.height * this.tileSize / 2) - easeOutQuad(t, 0, this.height * this.tileSize / 2, 1);
      translate(translateX, 0, 0);
      rotateY(tempRot);
      }
    }
    gl.cullFace(gl.FRONT)
    let chessBoard = this.chessBoard;
    let tileSize = this.tileSize;
    let boardHeight = this.height;
    let boardWidth = this.width;
    //Get the hovered tile
    let hoveredTile = this.getSelectedTile(mouseX, mouseY)
    for (let i = 0; i < boardWidth; i++) {
      for (let j = 0; j < boardHeight; j++) {
        push();
        //If the hovered tile isn't null, set that tile to be hovered with JSON data.
        if (hoveredTile) {
        if (i == hoveredTile.x && j == hoveredTile.y) {
          //If a move is available, only the available moves can be hovered.
          //if (availableMoves) {
          //  if (availableMoves.some(move => move.x === i && move.y === j) || chessBoard[i][j].selected) {
          //    chessBoard[i][j].hovered = true;
          //  }
          //} else {
            chessBoard[i][j].hovered = true;
          //}
        } else {chessBoard[i][j].hovered = false}
        } else {chessBoard[i][j].hovered = false}
        translate(chessBoard[i][j].x, chessBoard[i][j].y, chessBoard[i][j].z);
        rotateX(PI/2)
        rotateZ(PI/2)
        let tileTexture = this.getTileTexture(i, j);
        if (chessBoard[i][j].piece) {
          chessBoard[i][j].piece.drawModel()
        }
        //Render the tiles differently if they're selected
        if (chessBoard[i][j].selected == true) {
          emissiveMaterial(0, 255, 0)
          fill(0,255,0)
          //noStroke()
        }
        //Render the tiles differently if they're available
        else if (chessBoard[i][j].available == true) {
          fill(255, 95, 31)
          emissiveMaterial(255, 95, 31)

          //noStroke()
        } 
        else {
          stroke(0,0,0)
          texture(tileTexture);
        }
        if (chessBoard[i][j].hovered == true) {
          emissiveMaterial(255, 255, 255)
          //fill(255,0,0)
          //noStroke()
        } 



        //Draw the top plane
        square(0, 0, tileSize)

        //Draw the bottom plane
        translate(0, 0, -tileSize/2);
        rotateX(PI)
        square(0, 0, tileSize)

        //Draw the sides for the top of the chessboard
        if (i == 0 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
          push()
          translate(-tileSize/2, 0, -tileSize/4)
          rotateX(PI/2)
          rotateY(PI*1.5)
          rect(0,0, tileSize, tileSize/2)
          pop()
        //Draw the sides for the bottom of the chessboard
        } else if (i == boardWidth-1 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
          push()
          translate(tileSize/2, 0, -tileSize/4)
          rotateX(PI*1.5)
          rotateY(PI/2)
          rect(0,0, tileSize, tileSize/2)
          pop()
        }
        //Draw the sides for the left side of the chessboard
        if (j == 0 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
          push()
          translate(0, -tileSize/2, -tileSize/4)
          rotateX(PI*1.5)
          rotateY(PI)
          rect(0,0, tileSize, tileSize/2)
          pop()
          //Draw the sides for the right side of the chessboard
        } else if (j == boardHeight-1 && (chessBoard[i][j].type == "black" || chessBoard[i][j].type == "white")) {
          push()
          translate(0, tileSize/2, -tileSize/4)
          rotateX(PI*1.5)
          rotateY(PI*2)
          rect(0,0, tileSize, tileSize/2)
          pop()
        }
        pop();
      }
    }
    pop()
    }

  selectTile(x, y) {
    let chessBoard = this.chessBoard;
    let pieceMoved = false;
    availableMoves = null;

    if (gameData == null) {
      return;
    }


    if (cardDataManager.getSelectedCard) {
      cardDataManager.requestPlayCard(x, y)
      return;
    }
    
    if (!chessBoard[x][y].selected) {
      for (let i = 0; i < this.width; i++) {
        for (let j = 0; j < this.height; j++) {
          if (chessBoard[i][j].selected && chessBoard[i][j].piece && chessBoard[i][j] !== chessBoard[x][y] && (chessBoard[x][y].piece == null || chessBoard[x][y].piece.getColor() !== chessBoard[i][j].piece.getColor()) && chessBoard[x][y].available && gameData.turn == color) {
              const move = {
                from: { x: i, y: j },
                to: { x: x, y: y }
              };
              console.log(move)
              this.move(move);
              socket.emit('move', move);
              pieceMoved = true;
          }
          chessBoard[i][j].selected = false;
        }
      }

      if (pieceMoved) {
        chessBoard[x][y].selected = false;
        this.resetAvailableMoves()
      } else {
        chessBoard[x][y].selected = true;
        this.resetAvailableMoves()

        //Added this to get the available moves for the selected piece - only works if same color
        if (chessBoard[x][y].piece) {
          availableMoves = this.getTileData(x, y).piece.getAvailableMoves(this, x, y);
        }

        if (availableMoves != null && chessBoard[x][y].piece.getColor() == color) {
          this.markAvailableMoves(availableMoves)
        }
      }
    } else {
      chessBoard[x][y].selected = false;
      this.resetAvailableMoves()
    }
  }
  resetSelectedTiles() {
    let chessBoard = this.chessBoard;
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        chessBoard[i][j].selected = false;
      }
  }
}
  resetAvailableMoves() {
    let chessBoard = this.chessBoard;
    //loop through the board, setting all tiles to unavailable
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        chessBoard[i][j].available = false;
      }
    }
  }
  markAvailableMoves(moves) {
    let chessBoard = this.chessBoard;
      //loop through the moves array, setting the tiles at their coordinates to available
      for (let i = 0; i < moves.length; i++) {
        chessBoard[moves[i].x][moves[i].y].available = true;
      }
  }
}
