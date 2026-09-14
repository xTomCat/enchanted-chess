const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const PieceMovement = require('./public/shared/pieceMovement.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const MAX_ENERGY = 6;
const CAPTURE_ENERGY = { pawn: 1, default: 2 };

let connectedPlayers = [];
let games = {};

// Input validation helper
function validateMoveFormat(move) {
    if (!move || typeof move !== 'object') return false;
    if (!move.from || !move.to) return false;
    if (!Number.isInteger(move.from.x) || !Number.isInteger(move.from.y)) return false;
    if (!Number.isInteger(move.to.x) || !Number.isInteger(move.to.y)) return false;
    if (move.from.x < 0 || move.from.x > 7 || move.from.y < 0 || move.from.y > 7) return false;
    if (move.to.x < 0 || move.to.x > 7 || move.to.y < 0 || move.to.y > 7) return false;
    return true;
}

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected with ID: ' + socket.id);
    const player = new Player('Anonymous', socket.id);
    connectedPlayers.push(player);
    logConnectedPlayers();
    
    socket.on('move', (move) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id)

        if (!player) {
            socket.emit('error', 'You need to set a nickname first!')
            return
        }

        if (!validateMoveFormat(move)) {
            socket.emit('moveRejected', { reason: 'invalid_format' })
            return
        }

        const game = Object.values(games).find(g => g.players.includes(player))
        if (!game) {
            socket.emit('moveRejected', { reason: 'not_in_game' })
            return
        }

        // Verify this player is the one whose turn it is
        if ((game.turn === 'white' && player !== game.players[0]) ||
            (game.turn === 'black' && player !== game.players[1])) {
            socket.emit('moveRejected', { reason: 'not_your_turn' })
            return
        }

        const result = game.move(move)
        if (result.success) {
            io.to('game-' + game.roomCode).emit('move', move)
            sendGameDataToRoom(game.roomCode)
        } else {
            socket.emit('moveRejected', { reason: result.reason })
        }
    });

    socket.on('playCard', (index, x, y) => {
      const player = connectedPlayers.find(p => p.socketId === socket.id)
      if (!player) {
        socket.emit('error', 'Player not found')
        return
      }

      if (player.pendingCardPlay) {
        socket.emit('error', 'Card play already in progress')
        return
      }

      if (!Number.isInteger(index) || !Number.isInteger(x) || !Number.isInteger(y)) {
        socket.emit('error', 'Invalid card play parameters')
        return
      }
      if (x < 0 || x > 7 || y < 0 || y > 7) {
        socket.emit('error', 'Invalid target coordinates')
        return
      }

      const game = Object.values(games).find(g => g.players.includes(player))
      if (!game) {
        socket.emit('error', 'Not in a game')
        return
      }

      if (!player.deck[index]) {
        socket.emit('error', 'Card not found in deck')
        return
      }

      player.pendingCardPlay = true
      let card = player.deck[index]

      try {
        if (card.cost > player.energy) {
          socket.emit('error', 'Not enough energy')
          return
        }

        player.energy -= card.cost

        if (game.activateCardEffect(card, x, y, player)) {
          player.removeCardFromDeck(index)
          console.log("Player " + player.name + " played card " + card.name + " at " + x + ", " + y)
          io.to('game-' + game.roomCode).emit('receivePlayCard', player.color, index, x, y, card)
          game.evaluateGameState()
        } else {
          player.energy += card.cost
          socket.emit('error', 'Invalid card target')
        }
      } finally {
        player.pendingCardPlay = false
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
        result: game.result,
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
      this.energy = 0;
      this.deck = [];
      this.socketId = socketId;
      this.color = "unset!";
      this.pendingCardPlay = false;
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
    this.result = null
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
        return { success: false, reason: 'no_piece' };
      }

      let piece = this.getTileData(from.x, from.y).piece;

      // Validate that the piece belongs to the player whose turn it is
      if (piece.color !== this.turn) {
        return { success: false, reason: 'wrong_color' };
      }

      let availableMoves = piece.getAvailableMoves(this, from.x, from.y);

      if (!availableMoves.find(m => m.x === to.x && m.y === to.y)) {
        return { success: false, reason: 'invalid_move' };
      }

      let capturedPiece = this.getTileData(to.x, to.y).piece;

      this.setTileData(to.x, to.y, { piece: piece });
      this.setTileData(from.x, from.y, { piece: null });
      piece.lastMove = move
      this.lastMove = move
      this.lastMovedPiece = piece

      if (this.isInCheck(this.turn)) {
        this.setTileData(to.x, to.y, { piece: capturedPiece });
        this.setTileData(from.x, from.y, { piece: piece });
        return { success: false, reason: 'exposes_king' };
      }

      if (capturedPiece) {
        this.awardCaptureEnergy(this.turn, capturedPiece);
      }

      this.turn = this.turn === "white" ? "black" : "white";

      this.evaluateGameState();

      return { success: true };
    }

    awardCaptureEnergy(color, capturedPiece) {
      const player = color === "white" ? this.players[0] : this.players[1];
      if (!player) {
        return;
      }
      const reward = CAPTURE_ENERGY[capturedPiece.type] || CAPTURE_ENERGY.default;
      player.energy = Math.min(player.energy + reward, MAX_ENERGY);
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


    isInCheck(color) {
      let kingPos = this.findKing(color);
      if (!kingPos) {
        return false;
      }
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

    hasLegalMoves(color) {
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
                return true;
              }
            }
          }
        }
      }
      return false;
    }

    isCheckMate(color) {
      return this.isInCheck(color) && !this.hasLegalMoves(color);
    }

    isStaleMate(color) {
      return !this.isInCheck(color) && !this.hasLegalMoves(color);
    }

    opposingColor(color) {
      return color === "white" ? "black" : "white";
    }

    evaluateGameState() {
      if (this.result) {
        return;
      }

      for (const color of ["white", "black"]) {
        if (!this.findKing(color)) {
          this.finishGame({ type: "king_captured", winner: this.opposingColor(color), loser: color });
          return;
        }
      }

      this.check = this.isInCheck(this.turn) ? this.turn : null;

      if (this.hasLegalMoves(this.turn)) {
        return;
      }

      if (this.check) {
        this.finishGame({ type: "checkmate", winner: this.opposingColor(this.turn), loser: this.turn });
      } else {
        this.finishGame({ type: "stalemate", winner: null, loser: null });
      }
    }

    finishGame(result) {
      this.result = result;
      this.state = "finished";
      console.log("Game " + this.roomCode + " finished: " + result.type + (result.winner ? " (" + result.winner + " wins)" : " (draw)"));
      sendGameDataToRoom(this.roomCode);
      this.close();
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
      io.to(player.socketId).emit('receiveFakePiece', x, y, fakePiece)
    }

    clearFakePieceQueue() {
      this.fakePieceQueue = []
    }

}

class ChessPiece {
    constructor(type, color) {
      this.color = color;
      this.type = type;
      this.lastMove = null;
    }

    getType() {
      return this.type;
    }

    getColor() {
      return this.color;
    }

    getAvailableMoves(Game, x, y) {
      const chessBoard = Game.getBoard();
      const piece = chessBoard[x][y].piece;

      // Use shared movement logic
      let moves = PieceMovement.getAvailableMoves(Game, x, y, piece);

      // Filter moves if in check
      if (Game.check && this.color === Game.check) {
        const newMoves = [];
        for (const move of moves) {
          const tempPiece = chessBoard[move.x][move.y].piece;
          // Simulate the move
          chessBoard[move.x][move.y].piece = piece;
          chessBoard[x][y].piece = null;
          // Check if still in check
          if (!Game.isInCheck(this.color)) {
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
  

