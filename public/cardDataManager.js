class CardDataManager {
    constructor() {
        this.cardData = []
        this.cardObjects = []; //These are the detailed button display objects with hovers, shadows, etc. 
        this.playerDeck = []; //The basic card datas will be pushed into here, and detailed objects are displayed based on these.
        this.playingAniamtion = [];
        this.init();
    }

    init() {
        const placeholderCardData = {
          id: 1,
          name: "Placeholder",
          description: "This card does nothing.<br> It can be played, but has no effect.<br><br>Cost: 1",
          cost: 1,
          image: placeholdercard
        };
        this.cardData.push(placeholderCardData);
        const fireBallCardData = {
          id: 2,
          name: "Fireball",
          description: "Eliminates 1 enemy piece within<br>eyesight of any friendly piece.<br><br>Cost: 3",
          cost: 3,
          image: fireballcard
        };
        this.cardData.push(fireBallCardData);
        let card = new CardObject(placeholderCardData);
        this.cardObjects.push(card);
        this.resetDeck()
        
    }

    resetDeck() {
      this.playerDeck = [];
      this.addCardToDeck("Placeholder");
      this.addCardToDeck("Placeholder");
      this.addCardToDeck("Placeholder");
      this.addCardToDeck("Fireball");
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

    getCardById(id) {
        return this.cards.find(card => card.id === id);
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
      selectedCard.iconBuffer.animateTo(targX, targY, 100, () => this.activateCardEffect(selectedCard, x, y));
    }

    requestPlayCard(x, y) {
      let cardIndex = this.getSelectedCardIndex()
      if (cardIndex === null) {
        console.error("No card selected.");
        return;
      }
      let card = this.playerDeck[cardIndex];
      if (gameData) {
        if (color != gameData.turn) {
          console.error("It isn't your turn!")
          return;
        }
        if (guiRenderer.ingameGuiElements.playerEnergyBar.getEnergy() < this.playerDeck[cardIndex].cost) {
          console.error("Not enough energy!")
          return;

        }
        switch (card.name) {
          case "Fireball":
            let availableTiles = card.getCardPlayTiles(chessBoard);
            if (availableTiles.length === 0) {
              console.log("No valid targets for Fireball.")
              return;
            }
              let isValidTarget = availableTiles.some(tile => tile.x === x && tile.y === y);
              if (!isValidTarget) {
              console.error("Invalid target for Fireball.");
              return;
              }
              console.log("Fireball hits target at " + x + ", " + y);
              // Add logic to handle the effect of the Fireball card on the target
              break;
            }
      }
      socket.emit('playCard', cardIndex, x, y);

    }

    activateCardEffect(card, x, y, opponent = false) {
      if (!opponent) {
        let index = this.getCardIndex(card);
        console.log("Activating card effect for card with name " + card.name + " at location " + x + ", " + y);
        cardDataManager.removeCardFromDeck(index);
        cardDataManager.updateCardPositions();
      }
      switch (card.name) {
        case "Placeholder":
          console.log("Placeholder card effect activated.");
          break;
        case "Fireball":
          let availableTiles = card.getCardPlayTiles(chessBoard);
          if (availableTiles.length === 0) {
            console.log("No valid targets for Fireball.")
            return;
          }
            let isValidTarget = availableTiles.some(tile => tile.x === x && tile.y === y);
            if (!isValidTarget) {
            console.error("Invalid target for Fireball.");
            return;
            }
            console.log("Fireball hits target at " + x + ", " + y);
            chessBoard.setTileData(x, y, {piece: null});
            chessBoard.resetAvailableMoves()
            // Add logic to handle the effect of the Fireball card on the target
            break;
        default:
          console.error("Card effect not found.");
          break;
      }

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
        card.animateTo(x, y + heightAdjustment, 100);

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
    let chessBoardArray = chessBoard.getBoard()
    console.log("Chessboard:")
    console.log(chessBoard)
    let tiles = []
    switch (this.name) {
      case "Fireball":
        tiles = this.getFireballTiles(chessBoardArray);
      default:
        break;
    }
    console.log("Card selected. Possible tiles:")
    console.log(tiles);
    return tiles;
  }

  getFireballTiles(chessBoardArray) {
    console.log("Getting fireball tiles...")
    console.log(chessBoardArray)
    let tiles = []
    for (let i = 0; i < chessBoardArray.length; i++) {
      //console.log("Looping through row " + i)
      //console.log("Row length: " + chessBoardArray[i].length)
      console.log(chessBoardArray[i])
      for (let j = 0; j < chessBoardArray[i].length; j++) {
        //console.log("Looping through column " + j)
        let piece = chessBoard.getTileData(i, j).piece
        if (piece) {
          if (piece.color === color) {
            console.log("Looping through: " + piece.type + " at " + i + ", " + j)
            //tiles.push({x: i, y: j})
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
            for (let k = 0; k < directions.length; k++) {
              let dx = directions[k].x
              let dy = directions[k].y
              let newX = i + dx
              let newY = j + dy
              while (newX >= 0 && newX < chessBoardArray.length && newY >= 0 && newY < chessBoardArray[i].length) {  
                if (chessBoardArray[newX][newY].piece === null) {
                  //tiles.push({ x: newX, y: newY })
                } else {
                  if (chessBoardArray[newX][newY].piece.color !== piece.color && chessBoardArray[newX][newY].piece.type !== "king") {
                    tiles.push({ x: newX, y: newY })
                  }
                  break
                }
                newX += dx
                newY += dy
              }
            }
          }
        }
        
      }
    }
    
    return tiles;
  }

   createBuffers() {
      let graphics = createGraphics(this.image.width, this.image.height); //Create a graphics object.
      graphics.image(this.image, 0, 0, this.image.width, this.image.height); //Draw the card image to the graphics object.

      

      let toolTipBuffer = new ImageButton(graphics.width, graphics.height, 50, windowHeight *0.2)
        .setImage(graphics)
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
      
      let imageButton = new ImageButton(graphics.width, graphics.height, 0, 0) //Create a new image button object to handle drawing + effects
        .setImage(graphics)
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