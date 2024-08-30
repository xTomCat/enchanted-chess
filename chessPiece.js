class ChessPiece {
  constructor(type, color) {
    this.color = color
    this.type = type
    let resolution = 100
    let tileGraphic = createGraphics(resolution, resolution)
    let sx, sy
    if (this.color === "black") {
      //this.texture = blackTexture.resize(blackTexture.width/2, blackTexture.height/2)
      this.texture = createGraphics(resolution, resolution)
      sx = random(blackTexture.width - resolution);
      sy = random(blackTexture.height - resolution);
      this.texture.image(blackTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
    } else {
      //this.texture = whiteTexture.resize(whiteTexture.width/2, whiteTexture.height/2)
      this.texture = createGraphics(resolution, resolution)
      sx = random(whiteTexture.width - resolution);
      sy = random(whiteTexture.height - resolution);
      this.texture.image(whiteTexture, 0, 0, resolution, resolution, sx, sy, resolution, resolution);
    }
    switch(this.type) {
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
      push()
      rotateX(PI/2)
      translate(0, 0, 0)
      scale(25)
      
      noStroke()
      texture(this.texture);
      model(this.model)
      pop()
    }

    getType() {
      return this.type;
    }

    getColor() {
      return this.color;
    }

  }
