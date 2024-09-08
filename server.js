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
    const player = new Player('Anonymous', socket.handshake.address, socket.id);
    connectedPlayers.push(player);
    logConnectedPlayers();
    
    socket.on('move', (move) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id) 
        if (player) {
            const game = Object.values(games).find(g => g.players.includes(player))
            if (game) {
                game.move(move)
                io.to('game-' + game.roomCode).emit('move', move)
                sendGameDataToRoom(game.roomCode)
                console.log(move)
            }
        } else {
            io.to(socket.id).emit('error', 'You need to set a nickname first!')
        }
    });

    socket.on('disconnect', () => {
        const roomCode = Object.keys(games).find(roomCode => games[roomCode].players.find(p => p.socketId === socket.id));
        console.log('Client disconnected with ID: ' + socket.id);
        connectedPlayers = connectedPlayers.filter(p => p.socketId !== socket.id);
        logConnectedPlayers();
        if (roomCode && games[roomCode]) {
          games[roomCode].players = games[roomCode].players.filter(p => p.socketId !== socket.id);
          if (games[roomCode].players.length === 0) {
            delete games[roomCode];
            console.log('Room closed: ' + roomCode);
          }
          sendGameDataToRoom(roomCode)
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

    socket.on('createRoom', () => {
        let roomCode = generateRoomCode6Digits();
        socket.join('game-' + roomCode);

        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = new Game(roomCode);
        games[roomCode] = game;
        game.populateBoard();
        game.addPlayer(player);
        console.log(player.name + ' created a room with code: ' + roomCode);
        io.to(socket.id).emit('roomCreated', roomCode, player.name);
        makeClientGenerateBoard(player, game.getBoard())
        sendGameDataToRoom(roomCode)
    });

    socket.on('joinGame', (roomCode) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = games[roomCode];
        if (game && game.players.length < 2) {
            game.addPlayer(player);
            socket.join('game-' + roomCode);
            console.log(player.name + ' joined a room with code: ' + roomCode);
            makeClientGenerateBoard(player, game.getBoard())
            sendGameDataToRoom(roomCode)
        } else {
            io.to(socket.id).emit('error', 'Room code not found!')
        
      }
    })

    socket.on('closeRoom', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.find(p => p.socketId === socket.id)) {
            const player1 = games[roomCode].players[0];
            const player2 = games[roomCode].players[1];
            delete games[roomCode];
            io.to('game-' + roomCode).emit('roomClosed');
            if (player1) {
                socket.leave('game-' + roomCode);
            }
            if (player2) {
                socket.leave('game-' + roomCode);
            }
        };
    })
})

function logConnectedPlayers() {
    console.log('Connected Players:');
    connectedPlayers.forEach(player => {
        console.log(`Name: ${player.name}, IP: ${player.ip}`, `UUID: ${player.UUID}`, `Socket ID: ${player.socketId}`);
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
    const gameData = {
        players: game.getPlayers(),
        board: game.getBoard(),
        state: game.getState(),
        roomCode: roomCode
}
io.to('game-' + roomCode).emit('gameData', gameData);
}

function makeClientGenerateBoard(player, board) {
    io.to(player.socketId).emit('initBoard', board);
    console.log("Asked player to generate client-side board: " + player.name);
}

class Player {
    constructor(name, ip, socketId) {
      this.name = name;
      this.ip = ip;
      this.UUID = uuidv4();
      this.socketId = socketId;
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
    this.players.push(player);
    //socket.emit('askToJoin', player.name);
    //io.to(player.socketId).emit('askToJoin', player.name);
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
    move(move) {
      let from = move.from;
      let to = move.to;
      let piece = this.getTileData(from.x, from.y).piece;
      this.setTileData(to.x, to.y, { piece: piece });
      this.setTileData(from.x, from.y, { piece: null });
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
      }
}

class ChessPiece {
    constructor(type, color) {
      this.color = color
      this.type = type
    }
      getType() {
        return this.type;
      }
  
      getColor() {
        return this.color;
      }
  
    }
  
