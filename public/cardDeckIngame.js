class cardDeckIngame {
  constructor(x, y, player) {
    this.x = x
    this.y = y
    this.player = player
    this.cards = []

    this.graphic = createGraphics(windowWidth, windowHeight)
    
  }

  drawDeck() {
    push()
    this.graphic.clear()
    this.graphic.fill(255, 0, 0)
    this.graphic.textSize(32)
    this.graphic.text("This is a 2d UI element on a 3d scene!", 10, 30)

    resetMatrix()
    ortho()
    noLights()
    texture(this.graphic)
    image(this.graphic, -width / 2, -height / 2, width, height)
    pop()
  }
}