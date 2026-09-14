const CARD_PLAY_FRAMES = 25
const CARD_LAYOUT_FRAMES = 15

class CardDataManager {
    constructor() {
        this.cardData = []
        this.playerDeck = []; //The basic card datas will be pushed into here, and detailed objects are displayed based on these.
        this.playingAniamtion = [];
        this.pendingOrigin = null;
        this.init();
    }

    init() {
        this.cardData = CardDefinitions.CARDS.map(card => ({ ...card, image: cardImages[card.name] }));
        this.resetDeck()
    }

    resetDeck() {
      this.playerDeck = [];
      ["Fireball", "Summon Pawn", "Blink", "Transmute"].forEach(name => this.addCardToDeck(name));
    }

    deckAsServerData() {
      let deck = [];
      for (let i = 0; i < this.playerDeck.length; i++) {
        deck.push({
          id: this.playerDeck[i].id,
          name: this.playerDeck[i].name,
          cost: this.playerDeck[i].cost
        })
      }
      let toReturn = JSON.stringify(deck);
      return toReturn;
    }

    addCardToDeck(cardName) {
        let card = new CardObject(this.cardData.find(card => card.name === cardName), this.playerDeck.length);
        console.log("Adding new card with index " + card.index);
        if (card) {
          this.playerDeck.push(card);
          this.updateCardPositions()
        } else {
          console.error(`Card with name ${cardName} not found.`);
        }
      }

    removeCardFromDeck(slot) {
      this.playerDeck.splice(slot, 1);
      this.updateCardPositions()
    }

    popCardFromDeck() {
      this.playerDeck.pop();
      this.updateCardPositions()
    }

    getSelectedCard() {
      for (let i = 0; i < this.playerDeck.length; i++) {
        if (this.playerDeck[i].iconBuffer.isSelected) {
          return this.playerDeck[i];
        }
      }
      return null;
    }

    getSelectedCardIndex() {
      for (let i = 0; i < this.playerDeck.length; i++) {
        if (this.playerDeck[i].iconBuffer.isSelected) {
          return i;
        }
      }
      return null;
    }

    anyCardIsSelected() {
      for (let i = 0; i < this.playerDeck.length; i++) {
        if (this.playerDeck[i].iconBuffer.isSelected) {
          return true;
        }
      }
    }

    getCardIndex(card) {
      for (let i = 0; i < this.playerDeck.length; i++) {
        if (this.playerDeck[i] === card) {
          return i;
        }
      }
      return null;
    }

    playCard(index, x, y) { //board indices
      let selectedCard = this.playerDeck[index];
      if (!selectedCard) {
        console.error("No card selected.");
        return;
      }
      console.log("Playing card with name " + selectedCard.name);
      let targX = mouseX/(guiRenderer.guiScale) // Distance from left of the screen
      let targY = mouseY/(guiRenderer.guiScale/2)
      if (selectedCard.iconBuffer.anchorBottom) {
        targY = (targY - ((guiRenderer.height/2)) - ((selectedCard.iconBuffer.gBuffer.height/guiRenderer.guiScale)/2))
      }
      selectedCard.iconBuffer.setFadeOut(true, 30)
      selectedCard.iconBuffer.animateTo(targX, targY, CARD_PLAY_FRAMES, () => this.activateCardEffect(selectedCard, x, y));
    }

    requestPlayCard(x, y) {
      const cardIndex = this.getSelectedCardIndex()
      if (cardIndex === null) return console.error("No card selected.");
      const card = this.playerDeck[cardIndex];
      const definition = CardDefinitions.byName(card.name);
      if (gameData) {
        if (color != gameData.turn) return setStatus("It isn't your turn!", 2);
        if (guiRenderer.ingameGuiElements.playerEnergyBar.getEnergy() < card.cost) return setStatus("Not enough energy!", 2);
        const stageTiles = CardDefinitions.getPlayTiles(card.name, chessBoard, color, this.pendingOrigin);
        if (definition.tiles && !stageTiles.some(tile => tile.x === x && tile.y === y)) {
          return setStatus("Invalid target for " + card.name, 2);
        }
        if (definition.originTiles && !this.pendingOrigin) {
          this.pendingOrigin = { x: x, y: y };
          chessBoard.resetAvailableMoves();
          chessBoard.markAvailableMoves(CardDefinitions.getPlayTiles(card.name, chessBoard, color, this.pendingOrigin));
          return;
        }
        if (definition.choices) {
          return guiRenderer.openCardChoice(definition.prompt, definition.choices, choice => this.sendPlayCard(cardIndex, x, y, choice));
        }
      }
      this.sendPlayCard(cardIndex, x, y, this.pendingOrigin);
    }

    sendPlayCard(index, x, y, extra) {
      socket.emit('playCard', index, x, y, extra);
      this.pendingOrigin = null;
    }

    clearPendingPlay() {
      this.pendingOrigin = null;
      guiRenderer.closeCardChoice();
    }

    flashCardEffect(card, x, y, extra) {
      const flashColor = CardDefinitions.byName(card.name).flash;
      chessBoard.markFlash(x, y, flashColor);
      if (extra && extra.x !== undefined) chessBoard.markFlash(extra.x, extra.y, flashColor);
    }

    activateCardEffect(card, x, y, opponent = false) {
      if (!opponent) {
        this.removeCardFromDeck(this.getCardIndex(card));
        this.updateCardPositions();
      }
      chessBoard.resetAvailableMoves()
    }

    updateCardPositions() {
      if (this.playerDeck.length === 0) {
        return;
      }
      let screenMiddle = windowWidth / 2;
      let cardWidth = this.playerDeck[0].iconBuffer.width * this.playerDeck[0].iconBuffer.scale * guiRenderer.guiScale;
      let totalWidth = (this.playerDeck.length * cardWidth * guiRenderer.guiScale) + ((this.playerDeck.length - 1) * 10); // Assumes each card is the same width, and 20 pixels between each card.
      let startX = screenMiddle - (totalWidth / 2) * guiRenderer.guiScale
      for (let i = 0; i < this.playerDeck.length; i++) {
        let card = this.playerDeck[i].iconBuffer;
        let x = startX + (i * (cardWidth + 20));
        let y = windowHeight * 0.6;
        let totalCards = this.playerDeck.length;
        let heightAdjustment = Math.abs(i - (totalCards - 1) / 2) * 20; // Adjust the multiplier for desired height effect
        card.animateTo(x, y + heightAdjustment, CARD_LAYOUT_FRAMES);

        // Calculate rotation angle based on position relative to center
        
        let rotationAngle = (i - (totalCards - 1) / 2) * (Math.PI / 30); // Adjust the multiplier for desired rotation effect in radians
        card.setRotation(rotationAngle);
      }
    }

    displayDeck() {
      
        for (let i = 0; i < this.playerDeck.length; i++) {
          canvas2d.push();
          let card = this.playerDeck[i];
          //console.log("Trying to draw card with name " + card.name + " at x: " + card.iconBuffer.x + " y: " + card.iconBuffer.y)
          //canvas2d.ellipse(card.x, card.y, 50, 50);
          card.iconBuffer.drawIcon(canvas2d, guiRenderer.guiScale);
          canvas2d.pop();
        }
      }
}

class CardObject {
   constructor(data, index) {
       this.id = data.id;
       this.name = data.name;
       this.description = data.description;
       this.cost = data.cost;
       this.image = data.image;
       this.index = index
       this.textBuffer = null;
       this.iconBuffer = null;
       this.toolTipBuffer = null;
       this.createBuffers();
   }

   getCardPlayTiles(chessBoard) {
    return CardDefinitions.getPlayTiles(this.name, chessBoard, color, cardDataManager.pendingOrigin);
  }

   createBuffers() {
      let toolTipBuffer = new ImageButton(this.image.width, this.image.height, 50, windowHeight *0.2)
        .setImage(this.image)
        .setScale(1)
        .setFadeIn(true)
        .setHoverEffect(20, 0, 0.5)
        .updateGraphics()
        .setShadow(true)

      let descriptionBuffer = new TextButton(300, 500, this.image.width + 50, 0) //Text to display when the card is hovered over.
        .setTitle(this.name, 70)
        .setText(this.description)
        .setTextSize(50)
        .setAlign(LEFT)
        .setFadeIn(true)
        .setHoverEffect(20, 0, 0.5)
        .updateGraphics()

      toolTipBuffer.addComponent(descriptionBuffer)
      toolTipBuffer.setScale(0.5)
      toolTipBuffer.updateGraphics()
      
      let imageButton = new ImageButton(this.image.width, this.image.height, 0, 0) //Create a new image button object to handle drawing + effects
        .setImage(this.image)
        .setBounceEffect(0, 10, 0.05, this.index)
        .setHoverEffect(0, -20, 0.5)
        .anchorToBottom(true)
        .setScale(0.25)
        .setToolTip(toolTipBuffer)
        .updateGraphics()
        .setShadow(true)

      imageButton.onClick(imageButton.toggleSelected)

      
      

      //toolTipBuffer.addComponent(descriptionBuffer)

       this.textBuffer = descriptionBuffer;
       this.iconBuffer = imageButton;
       this.toolTipBuffer = toolTipBuffer;
   }

}