const express = require('express');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const PieceMovement = require('./public/shared/pieceMovement.js');
const ChessAI = require('./chessAI.js');
const CardDefinitions = require('./public/shared/cardDefinitions.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const MAX_ENERGY = 6;
const THINK_MS = 500;
const CAPTURE_ENERGY = { pawn: 1, default: 2 };

let connectedPlayers = [];
let games = Object.create(null);
const MAX_GAMES = 200;

process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

function findRoomCodeBySocket(socketId) {
    return Object.keys(games).find(code => games[code].players.find(p => p.socketId === socketId));
}

function buildServerDeck(deckData) {
    let parsed = deckData;
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed) } catch { return null }
    }
    if (!Array.isArray(parsed) || parsed.length > 4) return null;
    const deck = [];
    for (let card of parsed) {
        const existing = card && cardDataManager.cardData.find(c => c.id === card.id && c.name === card.name);
        if (!existing) return null;
        deck.push(new Card(existing.id, existing.name, existing.cost));
    }
    return deck;
}

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

app.use(compression());
//Assets are large and change rarely; code is left on revalidation so deploys take effect immediately
app.use('/Assets', express.static('public/Assets', {
    maxAge: '7d',
    //Models are plain text; the default mime guess for .obj stops gzip from applying
    setHeaders: (res, filePath) => { if (/\.(obj|mtl)$/.test(filePath)) res.type('text/plain'); }
}));
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

    socket.on('playCard', (index, x, y, extra) => {
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

      player.pendingCardPlay = true
      try {
        const error = game.playCard(player, index, x, y, extra)
        if (error) socket.emit('error', error)
      } finally {
        player.pendingCardPlay = false
      }
    });

    socket.on('disconnect', () => {
      if (Object.keys(games).length === 0) {
        console.log("No games found!")
        return
      }
      const roomCode = findRoomCodeBySocket(socket.id);
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
        nickname = typeof nickname === 'string' ? nickname.trim().slice(0, 20) : '';
        if (!nickname) return;
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

    socket.on('createRoom', (deckData, solo) => {
        const serverSideDeck = buildServerDeck(deckData);
        if (!serverSideDeck) {
          console.log("Player " + player.name + " tried to set an invalid deck!");
          return;
        }
        if (Object.keys(games).length >= MAX_GAMES || findRoomCodeBySocket(socket.id)) {
          io.to(socket.id).emit('error', 'Could not create a room right now!');
          return;
        }
        let roomCode = generateRoomCode6Digits();
        while (games[roomCode]) roomCode = generateRoomCode6Digits();
        const game = new Game(roomCode);
        game.solo = !!solo;
        
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
        if (solo) {
          const bot = new Player('Computer', 'bot-' + roomCode)
          bot.isBot = true
          game.addPlayer(bot)
          bot.setColor("black")
          bot.setDeck(cardDataManager.cardData.map(c => new Card(c.id, c.name, c.cost)))
          game.start()
        }
    });

    socket.on('joinGame', (roomCode, deckData) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const serverSideDeck = buildServerDeck(deckData);
        if (!player || !serverSideDeck) return;
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

    socket.on('cancelCloseRoom', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.find(p => p.socketId === socket.id)) {
            games[roomCode].cancelClose()
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
    let gameData = {
        players: game.getPlayers().map(player => player && { name: player.name, energy: player.energy }),
        board: game.getBoard(),
        state: game.getState(),
        solo: game.solo,
        turn: game.getTurn(),
        lastMove: game.lastMove,
        lastMovedPiece: game.lastMovedPiece,
        check: game.check,
        result: game.result,
        roomCode: roomCode
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
    this.closeToken = 0
    this.stateBeforeClosing = null
    this.lastMove = null
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
    cancelClose() {
      if (this.state !== "closing") return
      if (this.result) return
      this.closeToken++
      this.state = this.stateBeforeClosing || "started"
      this.stateBeforeClosing = null
      console.log('Close cancelled for room: ' + this.roomCode)
      io.to('game-' + this.roomCode).emit('closeCancelled')
      sendGameDataToRoom(this.roomCode)
    }
    async close() {
      if (this.state === "closing") return
      const token = ++this.closeToken
      this.stateBeforeClosing = this.state
      this.state = "closing";
      sendGameDataToRoom(this.roomCode)
      for (let i = 0; i <= 5; i++) {
        if (this.closeToken !== token) return
        if (this.players[0]) {
          io.to(this.players[0].socketId).emit('leavingSoon', 5-i);
        }
        if (this.players[1]) {
          io.to(this.players[1].socketId).emit('leavingSoon', 5-i);
        }
        await sleep(1000)
      }
      if (this.closeToken !== token) return
      if (this.players[0]) {
        this.players[0].leaveRoom(this.roomCode)
      }
      if (this.players[1]) {
        this.players[1].leaveRoom(this.roomCode)
      }
      console.log("Game closed with ropm code: " + this.roomCode);
      console.log("Total open games: " + Object.keys(games).length + " -> " + (Object.keys(games).length - 1))
      delete games[this.roomCode];
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
      this.maybeBotMove();

      return { success: true };
    }

    maybeBotMove() {
      const bot = this.players[this.turn === "white" ? 0 : 1];
      if (this.result || !bot || !bot.isBot) return;
      const started = Date.now();
      for (let i = bot.deck.length - 1; i >= 0; i--) {
        const target = ChessAI.bestCardTarget(bot.deck[i], this, bot);
        if (target) this.playCard(bot, i, target.x, target.y);
      }
      if (this.result) return;
      const moves = ChessAI.rankedMoves(this, this.turn);
      setTimeout(() => {
        const played = moves.find(m => this.move(m).success);
        if (played) {
          io.to('game-' + this.roomCode).emit('move', played);
          sendGameDataToRoom(this.roomCode);
        }
      }, Math.max(0, THINK_MS - (Date.now() - started)));
    }

    playCard(player, index, x, y, extra) {
      const card = player.deck[index];
      if (!card) return 'Card not found in deck';
      if (card.cost > player.energy) return 'Not enough energy';
      player.energy -= card.cost;
      if (!this.activateCardEffect(card, x, y, player, extra)) {
        player.energy += card.cost;
        return 'Invalid card target';
      }
      player.removeCardFromDeck(index);
      console.log("Player " + player.name + " played card " + card.name + " at " + x + ", " + y);
      io.to('game-' + this.roomCode).emit('receivePlayCard', player.color, index, x, y, card, extra);
      this.evaluateGameState();
      return null;
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

    activateCardEffect(card, x, y, player, extra) {
      if (!CardDefinitions.applyEffect(card.name, this, x, y, player.color, extra)) {
        console.error("Invalid target for " + card.name);
        return false;
      }
      sendGameDataToRoom(this.roomCode)
      return true
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
  }

class CardDataManager {
  constructor() {
    this.cardData = []
    this.loadCardData()
  }

  loadCardData() {
    this.cardData = CardDefinitions.CARDS.map(card => ({ id: card.id, name: card.name, cost: card.cost }));
  }

  cardExists(name) {
    return this.cardData.find(card => card.name === name);
  }


}

CardDefinitions.setPieceClass(ChessPiece);

let cardDataManager = new CardDataManager();
  

