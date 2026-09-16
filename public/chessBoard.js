const FLASH_SECONDS = 0.45, MOVE_SECONDS = 0.28
const PICK_MAT = mat4.create(), PICK_NEAR = vec3.create(), PICK_FAR = vec3.create(), PICK_DIR = vec3.create()
const PROJ_MAT = mat4.create(), PROJ_PT = vec3.create()
// Middle of the ramp. Black marble is mostly under 65, white marble over 210.
const RAMP_MID = 112

// 256-entry brightness -> [r, g, b] lookup table.
function flavourRamp([shadow, mid, highlight]) {
  const ramp = new Uint8Array(768)
  for (let l = 0; l < 256; l++) {
    const low = l < RAMP_MID
    const from = low ? shadow : mid, to = low ? mid : highlight
    const t = low ? l / RAMP_MID : (l - RAMP_MID) / (255 - RAMP_MID)
    for (let c = 0; c < 3; c++) ramp[l * 3 + c] = from[c] + (to[c] - from[c]) * t
  }
  return ramp
}

// Gradient map: keeps each pixel's brightness, takes its colour from the ramp. Blend modes hid the veins.
function paintFlavour(g, flavour) {
  if (!flavour.ramp) return
  const ramp = flavourRamp(flavour.ramp)
  g.loadPixels()
  const px = g.pixels
  for (let i = 0; i < px.length; i += 4) {
    const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0
    px[i] = ramp[l * 3]; px[i + 1] = ramp[l * 3 + 1]; px[i + 2] = ramp[l * 3 + 2]
  }
  g.updatePixels()
}

class Chessboard {
  constructor(width, height, tileSize, whiteTexture, blackTexture) {
    this.width = width
    this.height = height
    this.tileSize = tileSize
    this.whiteTexture = whiteTexture;
    this.blackTexture = blackTexture;
    this.chessBoard = []
    this.rotAngle = 0

    // Tiles keep the same piece of marble, so recolouring reuses the same stone.
    this.cell = tileSize * 5
    for (let i = 0; i < this.height; i++) {
      this.chessBoard.push([]);
      for (let j = 0; j < this.width; j++) {
        const type = (i + j) % 2 === 0 ? "black" : "white"
        const src = type == "white" ? this.whiteTexture : this.blackTexture
        this.chessBoard[i].push({ type: type,
          marbleX: random(src.width - this.cell), marbleY: random(src.height - this.cell) });
      }
    }
    this.flavour = BOARD_FLAVOURS[Settings.boardFlavour] || BOARD_FLAVOURS[0]
    this.atlasImage = this.buildAtlas()

    // Calculate tile world positions
    let offsetX = (this.chessBoard[0].length - 1) * (this.tileSize / 2) - (this.tileSize / 2);
    let offsetY = (this.chessBoard.length - 1) * (this.tileSize / 2) - (this.tileSize / 2);
    for (let i = 0; i < this.chessBoard.length; i++) {
      for (let j = 0; j < this.chessBoard[i].length; j++) {
        this.chessBoard[i][j].x = (j * tileSize) - offsetX - (this.tileSize/2);
        this.chessBoard[i][j].y = 0
        this.chessBoard[i][j].z = (i * tileSize) - offsetY - (this.tileSize/2);
      }
    }

    this.geometry = this.buildGeometry(this.cell)
  }

  // Saved as an Image because p5 re-uploads a Graphics texture every frame.
  buildAtlas() {
    const cell = this.cell
    const atlas = createGraphics(this.width * cell, this.height * cell)
    atlas.pixelDensity(1)
    for (const type of ["black", "white"]) {
      for (let i = 0; i < this.height; i++) {
        for (let j = 0; j < this.width; j++) {
          const tile = this.chessBoard[i][j]
          if (tile.type !== type) continue
          const src = type == "white" ? this.whiteTexture : this.blackTexture
          atlas.image(src, j * cell, i * cell, cell, cell, tile.marbleX, tile.marbleY, cell, cell)
        }
      }
      if (type === "black") paintFlavour(atlas, this.flavour)
    }
    atlas.noFill(); atlas.stroke(0); atlas.strokeWeight(3)
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) atlas.rect(j * cell, i * cell, cell, cell)
    }
    const baked = atlas.get()
    atlas.remove()
    return baked
  }

  // Rebuilds the texture, ~10ms.
  setFlavour(flavour) {
    this.flavour = flavour
    this.atlasImage = this.buildAtlas()
  }

  // Tiles get baked into a static mesh
  buildGeometry(cell) {
    const s = this.tileSize, geom = new p5.Geometry()
    geom.gid = "chessboard"
    const quad = (m, w, h, i, j) => {
      const n = geom.vertices.length, e = 0.5 / cell
      const u0 = (j + e) / this.width, u1 = (j + 1 - e) / this.width
      const v0 = (i + e) / this.height, v1 = (i + 1 - e) / this.height
      const corners = [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u1, v0], [w / 2, h / 2, u1, v1], [-w / 2, h / 2, u0, v1]]
      for (const c of corners) {
        geom.vertices.push(m.multiplyPoint(new p5.Vector(c[0], c[1], 0)))
        geom.uvs.push(c[2], c[3])
      }
      geom.faces.push([n, n + 1, n + 2], [n, n + 2, n + 3])
    }
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        const t = this.chessBoard[i][j]
        const m = new p5.Matrix()
        m.translate([t.x, t.y, t.z]); m.rotateX(PI / 2); m.rotateZ(PI / 2)
        quad(m, s, s, i, j)
        m.translate([0, 0, -s / 2]); m.rotateX(PI)
        quad(m, s, s, i, j)
        const side = (dx, dy, rx, ry) => {
          const k = m.copy(); k.translate([dx, dy, -s / 4]); k.rotateX(rx); k.rotateY(ry)
          quad(k, s, s / 2, i, j)
        }
        if (i == 0) side(-s / 2, 0, PI / 2, PI * 1.5)
        else if (i == this.width - 1) side(s / 2, 0, PI * 1.5, PI / 2)
        if (j == 0) side(0, -s / 2, PI * 1.5, PI)
        else if (j == this.height - 1) side(0, s / 2, PI * 1.5, PI * 2)
      }
    }
    return geom.computeNormals()
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
  markFlash(x, y, color) {
    this.setTileData(x, y, { flash: totalTime + FLASH_SECONDS, flashColor: color || [255, 255, 255] });
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
    const from = this.getTileData(move.from.x, move.from.y), to = this.getTileData(move.to.x, move.to.y)
    if (!from.piece) return
    this.anim = { x: move.to.x, y: move.to.y, from, taken: to.piece, start: totalTime }
    this.setTileData(move.to.x, move.to.y, { piece: from.piece });
    this.setTileData(move.from.x, move.from.y, { piece: null });
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

          let moves = PieceMovement.getAvailableMoves(this, j, i, piece);
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

  getSelectedTile(mouseX, mouseY) {
    let xNDC = (2 * mouseX) / _renderer.width - 1;
    let yNDC = 1 - (2 * mouseY) / _renderer.height;
    mat4.multiply(PICK_MAT, _renderer.uPMatrix.mat4, _renderer.uMVMatrix.mat4);
    mat4.invert(PICK_MAT, PICK_MAT);
    vec3.transformMat4(PICK_NEAR, [xNDC, yNDC, -1], PICK_MAT);
    vec3.transformMat4(PICK_FAR, [xNDC, yNDC, 1], PICK_MAT);
    vec3.subtract(PICK_DIR, PICK_FAR, PICK_NEAR);
    let t = -PICK_NEAR[1] / PICK_DIR[1];
    if (!(t >= 0)) return null;
    return worldToBoardIndices(PICK_NEAR[0] + PICK_DIR[0] * t, PICK_NEAR[2] + PICK_DIR[2] * t, this);
  }

  tileToScreen(x, y) {
    const tile = this.getTileData(x, y)
    vec3.transformMat4(PROJ_PT, [tile.x, tile.y, tile.z], PROJ_MAT)
    return { x: (PROJ_PT[0] * 0.5 + 0.5) * _renderer.width, y: (0.5 - PROJ_PT[1] * 0.5) * _renderer.height }
  }

  tileHighlight(tile) {
    if (tile.flash > totalTime) {
      const fade = (tile.flash - totalTime) / FLASH_SECONDS, c = tile.flashColor
      return [c[0] * fade, c[1] * fade, c[2] * fade]
    }
    if (tile.hovered) return [130, 130, 130]
    if (tile.selected) return [0, 255, 0]
    if (tile.piece && tile.piece.type == "king" && tile.piece.color == check) return [150 + sin(totalTime * 7) * 70, 0, 0]
    if (tile.available) return [255, 95, 31]
    return null
  }

  rayIntersectsTile(nearPoint, rayDir, x, y) {
    let chessBoard = this.chessBoard;
    let tile = chessBoard[x][y];
    let tileSize = this.tileSize;
    let t = -nearPoint[1] / rayDir[1];
    if (t < 0) {
      return false
    };
    let intersectPoint = vec3.create();
    vec3.scaleAndAdd(intersectPoint, nearPoint, rayDir, t);
    let epsilon = 0.0001;
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
      const overlay = guiRenderer.overlayAmount()
      const parked = guiRenderer.boardOffset()
      if (overlay) { translate(parked[0] * overlay, parked[1] * overlay, parked[2] * overlay); rotateX(parked[3] * overlay) }
      if ((totalTime*targetFrameRate - guiRenderer.screenSwitchTimeStamp) < 100) {
        let t = (totalTime*targetFrameRate - guiRenderer.screenSwitchTimeStamp)/100;
        let tempRot = easeOutQuad(t, 0, this.rotAngle, 1);
        let translateX = easeOutQuad(t, 0, this.height * this.tileSize / 2, 1);
        translate(translateX, 0, 0);
        rotateY(tempRot);
      } else {
        translate(this.height * this.tileSize / 2, 0, 0);
        rotateY(this.rotAngle);
        if (!Settings.reduceMotion) this.rotAngle += 0.002 * deltaTime * targetFrameRate;
        this.rotAngle = ((this.rotAngle + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
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
    noStroke()
    let chessBoard = this.chessBoard;
    let tileSize = this.tileSize;
    texture(this.atlasImage)
    model(this.geometry)
    //Get the hovered tile
    let hoveredTile = this.getSelectedTile(mouseX, mouseY)
    mat4.multiply(PROJ_MAT, _renderer.uPMatrix.mat4, _renderer.uMVMatrix.mat4)
    const anim = this.anim, at = anim ? min((totalTime - anim.start) / MOVE_SECONDS, 1) : 0
    if (at >= 1) this.anim = null
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        let tile = chessBoard[i][j];
        tile.hovered = !!hoveredTile && i == hoveredTile.x && j == hoveredTile.y;
        let highlight = this.tileHighlight(tile);
        if (!tile.piece && !highlight) continue;
        const moving = anim && anim.x == i && anim.y == j;
        if (moving && anim.taken) {
          push(); translate(tile.x, at * 26, tile.z); rotateX(PI/2); rotateZ(PI/2 + at * 2)
          anim.taken.drawModel(); pop()
        }
        if (tile.piece) {
          push();
          if (moving) {
            const back = 1 - eased(at)
            translate(tile.x + (anim.from.x - tile.x) * back,
              tile.y - sin(at * PI) * (tile.piece.type == "knight" ? 14 : 4),
              tile.z + (anim.from.z - tile.z) * back)
          } else translate(tile.x, tile.y, tile.z);
          rotateX(PI/2)
          rotateZ(PI/2)
          if (tile.selected) translate(0, 0, 3 + sin(totalTime * 6))
          tile.piece.drawModel()
          pop();
        }
        if (highlight) {
          push();
          translate(tile.x, tile.y, tile.z);
          rotateX(PI/2)
          fill(highlight[0], highlight[1], highlight[2]) //also clears the atlas texture binding
          emissiveMaterial(highlight[0], highlight[1], highlight[2])
          translate(0, 0, 0.25)
          if (tile.available) {
            gl.disable(gl.CULL_FACE)
            scale(eased((totalTime - tile.availableAt) / 0.18))
            if (tile.piece) torus(tileSize * 0.44, tileSize * 0.05)
            else circle(0, 0, tileSize * 0.34)
            gl.enable(gl.CULL_FACE)
          } else square(0, 0, tileSize)
          pop();
        }
      }
    }
    pop()
    }

  selectTile(x, y) {
    if (guiRenderer.cardChoiceOpen) return;
    let chessBoard = this.chessBoard;
    let pieceMoved = false;
    availableMoves = null;

    if (gameData == null) {
      return;
    }

    if (gameData.state != "started") {
      return;
    }


    if (cardDataManager.getSelectedCard()) {
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
        // Only allow selecting pieces when it's your turn and the piece is yours
        if (gameData.turn !== color) {
          return;
        }
        if (chessBoard[x][y].piece && chessBoard[x][y].piece.getColor() !== color) {
          return;
        }

        chessBoard[x][y].selected = true;
        this.resetAvailableMoves()

        //Added this to get the available moves for the selected piece
        if (chessBoard[x][y].piece) {
          availableMoves = this.getTileData(x, y).piece.getAvailableMoves(this, x, y);
          if (Settings.moveHints) this.markAvailableMoves(availableMoves)
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
        Object.assign(chessBoard[moves[i].x][moves[i].y], { available: true, availableAt: totalTime + i * 0.015 });
      }
  }
}
