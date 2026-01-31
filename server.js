const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

let connectedPlayers = [];
let games = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected with ID: ' + socket.id);
    const player = new Player('Anonymous', socket.id);
    connectedPlayers.push(player);
    logConnectedPlayers();
    
    socket.on('move', (move) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id) //For some reason removing this sometimes breaks stuff????? why?????????
        console.log("Player attributes: " + player.name + " " + player.color + " " + player.socketId)

        if (player) {
            const game = Object.values(games).find(g => g.players.includes(player))
            if (game) {
                game.move(move)
                io.to('game-' + game.roomCode).emit('move', move)
                sendGameDataToRoom(game.roomCode)
            }
        } else {
            io.to(socket.id).emit('error', 'You need to set a nickname first!')
        }
    });

    socket.on('playCard', (index, x, y) => {
      const player = connectedPlayers.find(p => p.socketId === socket.id)
      if (!player) {
        console.log("Player not found!")
        return
      }
      const game = Object.values(games).find(g => g.players.includes(player))
      if (!game) {
        console.log("Game not found!")
        return
      }
      console.log("--------------------")
      console.log("Player's deck:")
      for (let i = 0; i < player.deck.length; i++) {
        console.log("Index: " + i)
        console.log(player.deck[i])
      }
      console.log("--------------------")
      if (!player.deck[index]) {
        console.log("Card not found!")
        return
      }
      let card = player.deck[index]
      console.log("Cost: " + card.cost)
      if (card.cost <= player.energy) {
        if (game.activateCardEffect(card, x, y, player)) {
          player.energy -= card.cost
          player.removeCardFromDeck(index)
          console.log("Player " + player.name + " played card " + card.name + " at " + x + ", " + y)
          //sendGameDataToRoom(game.roomCode)
          io.to('game-' + game.roomCode).emit('recievePlayCard', player.color, index, x, y, card)
        } else {
          console.log("Invalid!")
        }
        
      } else {
        console.log("Player " + player.name + " tried to play a card without enough energy!")
      }
        
      
    });

    socket.on('recieveDeck', (deck) => {
      const player = connectedPlayers.find(p => p.socketId === socket.id)
      let serverSideDeck = []
      if (deck.length !== 4) {
        console.log("Player " + player.name + " tried to set an invalid deck!")
        return
      }
      for (card of deck) {
        if (!cardDataManager.cardExists(card)) {
          console.log("Player " + player.name + " tried to set an invalid deck!")
          return
        }
        let existingCard = cardDataManager.cardData.find(c => c.id === card.id);
        let serverSideCard = new Card(existingCard.id, existingCard.name, existingCard.cost)
          serverSideDeck.push(serverSideCard)
        }
      if (player) {
        player.setDeck(serverSideDeck)
      }
    })

    socket.on('disconnect', () => {
      if (Object.keys(games).length === 0) {
        console.log("No games found!")
        return
      }
      const roomCode = Object.keys(games).find(roomCode => games[roomCode].players.find(p => p.socketId === socket.id));
      console.log('Client disconnected with ID: ' + socket.id);
      connectedPlayers = connectedPlayers.filter(p => p.socketId !== socket.id);
      logConnectedPlayers();
      if (roomCode && games[roomCode]) {
        games[roomCode].players = games[roomCode].players.filter(p => p.socketId !== socket.id);
        for(let player of games[roomCode].players) {
          player.leaveRoom(roomCode)
        }
        delete games[roomCode];
          console.log('Room closed: ' + roomCode);
          console.log("Total open games: " + Object.keys(games).length + " -> " + (Object.keys(games).length - 1))
      }
    });

    socket.on('nickname', (nickname, roomCode) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id);
        
        if (player) {
            const oldName = player.name;
            player.name = nickname;
            io.to(socket.id).emit('nicknameChanged', nickname);
            console.log(oldName + ' changed changed their nickname to ' + nickname + "!");
            logConnectedPlayers()
            if (roomCode && games[roomCode]) {
              sendGameDataToRoom(roomCode)
                
        }
        }
    });

    socket.on('createRoom', (deckData) => {
        const roomCode = generateRoomCode6Digits();
        const parsedDeck = JSON.parse(deckData)
        let serverSideDeck = [];
        for (let card of parsedDeck) {
          if (!cardDataManager.cardExists(card.name)) {
            console.log("Player " + player.name + " tried to set an invalid deck!");
            return;
          }
          let existingCard = cardDataManager.cardData.find(c => c.id === card.id);
          let serverSideCard = new Card(existingCard.id, existingCard.name, existingCard.cost)
            serverSideDeck.push(serverSideCard)
        }
        //const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = new Game(roomCode);
        
        console.log("Total open games: " + Object.keys(games).length + " -> " + (Object.keys(games).length + 1))
        socket.join('game-' + roomCode);
        games[roomCode] = game;
        game.populateBoard();
        game.addPlayer(player);
        console.log(player.name + ' created a room with code: ' + roomCode);
        io.to(socket.id).emit('roomCreated', roomCode, player.name);
        player.setDeck(serverSideDeck);
        console.log(serverSideDeck)
        player.setColor("white")
        player.generateBoardOnClient(game.getBoard())
        sendGameDataToRoom(roomCode)
    });

    socket.on('joinGame', (roomCode, deckData) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const parsedDeck = JSON.parse(deckData)
        let serverSideDeck = [];
        for (let card of parsedDeck) {
          if (!cardDataManager.cardExists(card.name)) {
            console.log("Player " + player.name + " tried to set an invalid deck!");
            return;
          }
          let existingCard = cardDataManager.cardData.find(c => c.id === card.id);
          let serverSideCard = new Card(existingCard.id, existingCard.name, existingCard.cost)
            serverSideDeck.push(serverSideCard)
        }
        const game = games[roomCode];
        if (game && game.players.length < 2) {
          player.setDeck(serverSideDeck);
          console.log(player.deck)
          game.addPlayer(player);
          socket.join('game-' + roomCode);
          console.log(player.name + ' joined a room with code: ' + roomCode);
          player.setColor("black")
          player.generateBoardOnClient(game.getBoard())
          sendGameDataToRoom(roomCode)
          game.start()
        } else {
            io.to(socket.id).emit('error', 'Room code not found!')
        
      }
      
    })

    socket.on('closeRoom', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.find(p => p.socketId === socket.id)) {
            games[roomCode].close()
        };
    })
})

function logConnectedPlayers() {
    console.log('Connected Players:');
    connectedPlayers.forEach(player => {
        console.log(`Name: ${player.name}`, `UUID: ${player.UUID}`, `Socket ID: ${player.socketId}`);
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
})

function generateRoomCode6Digits() {
    return Math.floor(100000 + Math.random() * 900000);
}

function sendGameDataToRoom(roomCode) {
    const game = games[roomCode];
    
    if (!game) {
        return;
    }
    const players = game.getPlayers();
    whiteDeck = []
    blackDeck = []
    //fakePieces = []
    //if (game.fakePieceQueue.length > 0) {
    //  fakePieces = game.fakePieceQueue
    //}
    if (players[0]) {
      whiteDeck = players[0].deck
    } 
    if (players[1]) {
      blackDeck = players[1].deck
    }
    let gameData = {
        players: players,
        board: game.getBoard(),
        state: game.getState(),
        turn: game.getTurn(),
        lastMove: game.lastMove,
        lastMovedPiece: game.lastMovedPiece,
        check: game.check,
        roomCode: roomCode,
        decks: {
          white: whiteDeck,
          black: blackDeck
        },
        //fakePieces: fakePieces
        
}
io.to('game-' + roomCode).emit('gameData', gameData);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Player {
    constructor(name, socketId) {
      this.name = name;
      this.energy = 6;
      this.deck = [];
      this.socketId = socketId;
      this.color = "unset!";
    }

    setDeck(deck) {
      this.deck = deck;
    }

    setColor(color) {
      if (color == "white" || color == "black" || color == "unset!") {
        this.color = color;
        io.to(this.socketId).emit('setColor', color)
      } else {
        console.log("Invalid color: " + color)
        return
      }
      
    }

    generateBoardOnClient(board) {
      io.to(this.socketId).emit('initBoard', board)
    }

    removeCardFromDeck(slot) {
      this.deck.splice(slot, 1);
    }

    leaveRoom(roomCode) {
      const socket = io.sockets.sockets.get(this.socketId);
      io.to(this.socketId).emit('roomClosed');
      if (socket) {
        socket.leave('game-' + roomCode);
      }
    
    }

    isInGame() {
      return games.find(g => g.players.includes(this))
    }


  }

class Game {
  constructor(roomCode) {
    this.players = []; //0: white, 1: black
    this.state = "waiting";
    this.roomCode = roomCode
    this.chessBoard = []
    this.width = 8;
    this.height = 8;
    this.turn = "white";
    this.check = null
    this.lastMove = null
    this.fakePieceQueue = []
    this.lastMovedPiece
    for (let i = 0; i < 8; i++) {
        this.chessBoard.push([]);
        for (let j = 0; j < 8; j++) {
          if ((i + j) % 2 === 0) {
            this.chessBoard[i].push({type: "black"});
          } else {
            this.chessBoard[i].push({type: "white"});
          }
        }
    }
  }
  addPlayer(player) {
    if (this.players.length < 2) {
      this.players.push(player);
    }
    //socket.emit('askToJoin', player.name);
    //io.to(player.socketId).emit('askToJoin', player.name);
  }
    getTurn() {
      return this.turn
    }
    getPlayers() {
        return this.players;
    }
    getBoard() {
        return this.chessBoard;
    }
    getState() {
        return this.state;
    }
    setState(state) {
        this.state = state;
    }
    getWidth() {
      return this.width
    }
    getHeight() {
      return this.height
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
    async close() {
      this.state = "closing";
      sendGameDataToRoom(this.roomCode)
      for (let i = 0; i <= 5; i++) {
        if (this.players[0]) {
          io.to(this.players[0].socketId).emit('leavingSoon', 5-i);
        }
        if (this.players[1]) {
          io.to(this.players[1].socketId).emit('leavingSoon', 5-i);
        }
        await sleep(1000)
      }
      if (this.players[0]) {
        this.players[0].leaveRoom(this.roomCode)
      }
      if (this.players[1]) {
        this.players[1].leaveRoom(this.roomCode)
      }
      console.log("Game closed with ropm code: " + this.roomCode);
      console.log("Total open games: " + Object.keys(games).length + " -> " + (Object.keys(games).length - 1))
      games[this.roomCode] = null;
      this.players = [];
      
      
    }
    move(move) {
      let from = move.from;
      let to = move.to;
      if (!this.getTileData(from.x, from.y).piece) {
        return;
      }
      let piece = this.getTileData(from.x, from.y).piece;

      // Validate that the piece belongs to the player whose turn it is
      if (piece.color !== this.turn) {
        console.log("Invalid move: not this player's turn");
        return;
      }

      let availableMoves = piece.getAvailableMoves(this, from.x, from.y);

      if (availableMoves.find(m => m.x === to.x && m.y === to.y)) {
        this.setTileData(to.x, to.y, { piece: piece });
        this.setTileData(from.x, from.y, { piece: null });
        piece.lastMove = move
        this.lastMove = move
        this.lastMovedPiece = piece

        if (this.isInCheck("black")) {
          this.check = "black"
          if (this.isCheckMate("black")) {
            this.checkMate = "black"
            this.state = "checkmate"
            sendGameDataToRoom(this.roomCode)
            console.log("Checkmate!")
            this.close()
          }
        } else if (this.isInCheck("white")) {
          this.check = "white"
          if (this.isCheckMate("white")) {
            this.checkMate = "white"
            this.state = "checkmate"
            sendGameDataToRoom(this.roomCode)
            console.log("Checkmate!")
            this.close()
          }
        } else {
          this.check = null
        }

        if (this.isInCheck(this.turn)) {
          this.setTileData(to.x, to.y, { piece: null });
          this.setTileData(from.x, from.y, { piece: piece });
          return;
        }

        if (this.turn === "white") {
          this.turn = "black";
        } else {
          this.turn = "white";
        }
      }
      else {
        let player
        if (this.turn === "white") {
          player = this.players[0]
        } else {
          player = this.players[1]
        }
        console.log("Player ''" + player.name + "'' tried to make an invalid move!");
      }
    }
    populateBoard() {
        for (let i = 0; i < this.width; i++) {
          this.setTileData(i, 1, { piece: new ChessPiece("pawn", "black") });
          this.setTileData(i, this.height - 2, { piece: new ChessPiece("pawn", "white") });
        }
        this.setTileData(0, 0, { piece: new ChessPiece("rook", "black") });
        this.setTileData(1, 0, { piece: new ChessPiece("knight", "black") });
        this.setTileData(2, 0, { piece: new ChessPiece("bishop", "black") });
        this.setTileData(4, 0, { piece: new ChessPiece("queen", "black") });
        this.setTileData(3, 0, { piece: new ChessPiece("king", "black") });
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
        this.setTileData(4, this.height - 1, { piece: new ChessPiece("queen", "white") });
        this.setTileData(3, this.height - 1, { piece: new ChessPiece("king", "white") });
        this.setTileData(5, this.height - 1, { piece: new ChessPiece("bishop", "white") });
        this.setTileData(6, this.height - 1, { piece: new ChessPiece("knight", "white") });
        this.setTileData(7, this.height - 1, { piece: new ChessPiece("rook", "white") });
      }
      start() {
        if (this.state === "waiting" && this.players.length === 2) {
          this.state = "started";
          sendGameDataToRoom(this.roomCode)
        } else (
          console.log("Game could not start!")
        )
      }

      //close() {{
      //  const player1 = this.players[0];
      //  const player2 = this.players[1];
      //  const roomCode = this.roomCode;
      //  if (player1 instanceof Player) {
      //    player1.setColor("unset!")
      //  }
      //  if (player2 instanceof Player) {
      //    player2.setColor("unset!")
      //  }
      //  
      //  //io.to('game-' + roomCode).emit('roomClosed');
      //  if (player1 instanceof Player) {
      //    player1.leaveRoom(player1, roomCode);
      //  }
      //  if (player2 instanceof Player) {
      //    player2.leaveRoom(player2, roomCode);
      //  }
      //  delete this;
      //};
      //}

    //  isInCheck(color) {
    //    let kingPos = this.findKing(color);
    //    let king = this.getTileData(kingPos.x, kingPos.y).piece;
    //    //loop through the board
    //    for (let i = 0; i < this.height; i++) {
    //      for (let j = 0; j < this.width; j++) {
    //        //get the piece at loop location
    //        let piece = this.getTileData(j, i).piece;
    //        //if the piece exists and is not the same color as the king
    //        if (piece && piece.color != color) {
    //
    //          let moves = piece.getAvailableMoves(this, j, i);
    //          if (moves) {
    //          for (let i = 0; i < moves.length; i++) {
    //            if (moves[i].x == kingPos.x && moves[i].y == kingPos.y) {
    //              return true;
    //            }
    //          }
    //        }
    //        }
    //      }
    //    }
    //    return false;
    //
    //}
//
    //isCheckMate(color) {
    //  let kingPos = this.findKing(color);
    //  let king = this.getTileData(kingPos.x, kingPos.y).piece;
    //  let moves = king.getAvailableMoves(this, kingPos.x, kingPos.y);
    //  let isInCheck = this.isInCheck(color);
    //  if (moves.length == 0 && isInCheck) {
    //    return true;
    //  }
    //  else {
    //    return false;
    //  }
    //}
    isInCheck(color) {
      let kingPos = this.findKing(color);
      let king = this.getTileData(kingPos.x, kingPos.y).piece;
      for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        let piece = this.getTileData(j, i).piece;
        if (piece && piece.color !== color) {
        let moves = piece.getAvailableMoves(this, j, i);
        for (let move of moves) {
          if (move.x === kingPos.x && move.y === kingPos.y) {
          return true;
          }
        }
        }
      }
      }
      return false;
    }

    isCheckMate(color) {
      if (!this.isInCheck(color)) {
      return false;
      }
      for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        let piece = this.getTileData(j, i).piece;
        if (piece && piece.color === color) {
        let moves = piece.getAvailableMoves(this, j, i);
        for (let move of moves) {
          let originalPiece = this.getTileData(move.x, move.y).piece;
          this.setTileData(move.x, move.y, { piece: piece });
          this.setTileData(j, i, { piece: null });
          let inCheck = this.isInCheck(color);
          this.setTileData(move.x, move.y, { piece: originalPiece });
          this.setTileData(j, i, { piece: piece });
          if (!inCheck) {
          return false;
          }
        }
        }
      }
      }
      return true;
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

    activateCardEffect(card, x, y, player) {
      switch (card.name) {
        case "Placeholder":
          console.log("Placeholder card effect activated in game " + this.roomCode + " at location " + x + ", " + y);
          break;
        case "Fireball":
          let availableTiles = card.getCardPlayTiles(this.getBoard(), player);
          if (availableTiles.length === 0) {
            console.log("No valid targets for Fireball.")
            return;
          }
            let isValidTarget = availableTiles.some(tile => tile.x === x && tile.y === y);
            if (!isValidTarget) {
            console.error("Invalid target for Fireball.");
            return false;
            }
            console.log("Fireball hits target at " + x + ", " + y);
            let fakePiece = this.getTileData(x, y).piece;
            this.setTileData(x, y, {piece: null});
            sendGameDataToRoom(this.roomCode)
            this.sendFakePiece(x, y, fakePiece, player)
            return true
            // Add logic to handle the effect of the Fireball card on the target
          break;
        default:
          console.error("Card effect not found.");
          break;
      }
  
    }

    sendFakePiece(x, y, piece, player) {
      let fakePiece = new ChessPiece(piece.type, piece.color)
      //this.fakePieceQueue.push({x: x, y: y, piece: fakePiece})
      io.to(player.socketId).emit('recieveFakePiece', x, y, fakePiece)
    }

    clearFakePieceQueue() {
      this.fakePieceQueue = []
    }

}

class ChessPiece {
    constructor(type, color) {
      this.color = color
      this.type = type
      this.lastMove = null
    }
      getType() {
        return this.type;
      }
  
      getColor() {
        return this.color;
      }
      getAvailableMoves(Game, x, y) {
        let chessBoard = Game.getBoard();
        let piece = chessBoard[x][y].piece;
        let moves = [];
        switch (piece.type) {
          case "pawn":
            moves = this.getPawnMoves(Game, x, y);
            break;
          case "rook":
            moves = this.getRookMoves(Game, x, y);
            break;
          case "knight":
            moves = this.getKnightMoves(Game, x, y);
            break;
          case "bishop":
            moves = this.getBishopMoves(Game, x, y);
            break;
          case "queen":
            moves = this.getQueenMoves(Game, x, y);
            break;
          case "king":
            moves = this.getKingMoves(Game, x, y);
            break;
        }
        if (Game.check && this.color === Game.check) {
          let newMoves = []
          for (let i = 0; i < moves.length; i++) {
            let move = moves[i]
            let tempPiece = chessBoard[move.x][move.y].piece
            chessBoard[move.x][move.y].piece = piece
            chessBoard[x][y].piece = null
            let check = Game.isInCheck(this.color)
            if (!check) {
              newMoves.push(move)
            }
            chessBoard[move.x][move.y].piece = tempPiece
            chessBoard[x][y].piece = piece
            moves = newMoves
          }
        } 
        return moves;
      }
    
      getPawnMoves(Game, x, y) {
        let chessBoard = Game.getBoard();
        let chessPiece = chessBoard[x][y].piece;
        let moves = [];
        let direction = chessPiece.color === "white" ? -1 : 1;
        let forwardOne = { x: x, y: y + direction }
        let forwardTwo = { x: x, y: y + 2 * direction }
        let leftCapture = { x: x - 1, y: y + direction, enPassant: false }
        let rightCapture = { x: x + 1, y: y + direction, enPassant: false }
        if (forwardOne.x >= 0 && forwardOne.x < Game.getWidth() && forwardOne.y >= 0 && forwardOne.y < Game.getHeight()) {
          if (!chessBoard[forwardOne.x][forwardOne.y].piece) {
            moves.push(forwardOne)
            if (!(forwardTwo.x >= 0 && forwardTwo.x < Game.getWidth() && forwardTwo.y >= 0 && forwardTwo.y < Game.getHeight())) {
              return;
            }
            if (!chessBoard[forwardTwo.x][forwardTwo.y].piece && (chessPiece.color === "white" && y === 6) || (chessPiece.color === "black" && y === 1)) {
              moves.push(forwardTwo)
            }
          }
          if (leftCapture.x >= 0 && leftCapture.x < Game.getWidth() && leftCapture.y >= 0 && leftCapture.y < Game.getHeight()) {
            if (chessBoard[leftCapture.x][leftCapture.y].piece) {
              if (chessBoard[leftCapture.x][leftCapture.y].piece.color !== chessPiece.color) {
                moves.push(leftCapture)
              }
            }
          }
          if (rightCapture.x >= 0 && rightCapture.x < Game.getWidth() && rightCapture.y >= 0 && rightCapture.y < Game.getHeight()) {
            if (chessBoard[rightCapture.x][rightCapture.y].piece) {
              if (chessBoard[rightCapture.x][rightCapture.y].piece.color !== chessPiece.color) {
                moves.push(rightCapture)
            }//WIP EN PASSANT
          }
          }


        }
        return moves
      
      }
    
      getRookMoves(Game, x, y) {
        let chessBoard = Game.getBoard();
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
          while (newX >= 0 && newX < Game.getWidth() && newY >= 0 && newY < Game.getHeight()) {
            if (!chessBoard[newX][newY].piece) {
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
      
    
      getKnightMoves(Game, x, y) {
        let chessBoard = Game.getBoard()
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
          if (newX >= 0 && newX < Game.getWidth() && newY >= 0 && newY < Game.getHeight()) {
            if (!chessBoard[newX][newY].piece || chessBoard[newX][newY].piece.color !== piece.color) {
              moves.push({ x: newX, y: newY })
            }
          }
        }
        return moves
      }
    
      getBishopMoves(Game, x, y) {
        let chessBoard = Game.getBoard()
        let piece = chessBoard[x][y].piece
        let moves = []
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
          while (newX >= 0 && newX < Game.getWidth() && newY >= 0 && newY < Game.getHeight()) {
            if (!chessBoard[newX][newY].piece) {
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
    
      getQueenMoves(Game, x, y) {
        let chessBoard = Game.getBoard()
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
          while (newX >= 0 && newX < Game.getWidth() && newY >= 0 && newY < Game.getHeight()) {
            if (!chessBoard[newX][newY].piece) {
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
    
      getKingMoves(Game, x, y) {
        let chessBoard = Game.getBoard()
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
          if (newX >= 0 && newX < Game.getWidth() && newY >= 0 && newY < Game.getHeight()) {
            if (!chessBoard[newX][newY].piece || chessBoard[newX][newY].piece.color !== piece.color) {
              moves.push({ x: newX, y: newY })
            }
          }
        }
        return moves
      }
    }

class Card {
  constructor(id, name, cost) {
    this.id = id
    this.name = name;
    this.cost = cost;
    }

    getCardPlayTiles(chessBoardArray, player) {
      let tiles = []
      switch (this.name) {
        case "Fireball":
          tiles = this.getFireballTiles(chessBoardArray, player);
        default:
          break;
      }
      console.log("Card selected. Possible tiles:")
      console.log(tiles);
      return tiles;
    }
  
    getFireballTiles(chessBoardArray, player) {
      console.log("Getting fireball tiles...")
      console.log(chessBoardArray)
      let tiles = []
      for (let i = 0; i < chessBoardArray.length; i++) {
        //console.log("Looping through row " + i)
        //console.log("Row length: " + chessBoardArray[i].length)
        console.log(chessBoardArray[i])
        for (let j = 0; j < chessBoardArray[i].length; j++) {
          //console.log("Looping through column " + j)
          let piece = chessBoardArray[i][j].piece
          if (piece) {
            if (piece.color === player.color) {
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
                    console.log(chessBoardArray[newX][newY].piece)
                    if (chessBoardArray[newX][newY].piece) {
                      if (chessBoardArray[newX][newY].piece.color !== piece.color) {
                        tiles.push({ x: newX, y: newY })
                      }
                      break
                  }
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
  }

class CardDataManager {
  constructor() {
    this.cardData = []
    this.loadCardData()
  }

  loadCardData() { //This has to be copy-paste identical to the one on the client side. Maybe this information could be sent to the client from the server?
    const placeholderCardData = {
      id: 1,
      name: "Placeholder",
      cost: 1
  };
  this.cardData.push(placeholderCardData);
  const fireBallCardData = {
    id: 2,
    name: "Fireball",
    cost: 3
  };
  this.cardData.push(fireBallCardData);
  }

  cardExists(name) {
    return this.cardData.find(card => card.name === name);
  }




}

let cardDataManager = new CardDataManager();
  

