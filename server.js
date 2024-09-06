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
    console.log('New client connected with IP: ' + socket.handshake.address);
    const player = new Player('Anonymous', socket.handshake.address, socket.id);
    connectedPlayers.push(player);
    logConnectedPlayers();
    socket.on('move', (move) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id) 
        if (player) {
            const game = Object.values(games).find(g => g.players.includes(player))
            if (game) {
                io.to(game.roomCode).emit('move', move)
                console.log(move)
            }
        } else {
            io.to(socket.id).emit('error', 'You need to set a nickname first!')
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected with IP: ' + socket.handshake.address);
        console.log('Client disconnected with ID: ' + socket.id);
        connectedPlayers = connectedPlayers.filter(p => p.socketId !== socket.id);
        logConnectedPlayers();
    });

    socket.on('nickname', (nickname, roomCode) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id);
        console.log("Changing nickname of player with ID: " + socket.id);
        console.log("changing the name of: " + player)
        if (player) {
            player.name = nickname;
            io.to(socket.id).emit('nicknameChanged', nickname);
            console.log(`Nickname changed to ${nickname}`);
            logConnectedPlayers()
            if (roomCode) {
                if (games[roomCode]) {
                    sendGameDataToRoom(roomCode)
                }
        }
        }
    });

    socket.on('createRoom', () => {
        let roomCode = generateRoomCode6Digits();
        socket.join('game-' + roomCode);

        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = new Game(roomCode);
        games[roomCode] = game;
        game.addPlayer(player);
        console.log(player.name + ' created a room with code: ' + roomCode);
        console.log(game.getPlayers());
        console.log(games)
        io.to(socket.id).emit('roomCreated', roomCode, player.name);
        sendGameDataToRoom(roomCode)
    });

    socket.on('joinGame', (roomCode) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = games[roomCode];
        console.log("attempting to join game with room code: " + roomCode)
        console.log("game found: " + game)
        if (game && game.players.length < 2) {
            game.addPlayer(player);
            socket.join('game-' + roomCode);
            console.log(player.name + ' joined a room with code: ' + roomCode);
            console.log(game.getPlayers());
        } else {
            io.to(socket.id).emit('error', 'Room code not found!')
        }
        sendGameDataToRoom(roomCode)
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
    const gameData = {
        players: game.getPlayers(),
        board: game.getBoard(),
        state: game.getState(),
        roomCode: roomCode
}
io.to('game-' + roomCode).emit('gameData', gameData);
console.log("gamedata sent to: " + roomCode)
}

class Player {
    constructor(name, ip, socketId) {
      this.name = name;
      this.ip = ip;
      this.UUID = uuidv4();
      this.socketId = socketId
    }
  }

class Game {
  constructor(roomCode) {
    this.players = [];
    this.state = "waiting";
    this.roomCode = roomCode
    this.board = new Chessboard(8, 8, 20)
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
        return this.board;
    }
    getState() {
        return this.state;
    }
    setState(state) {
        this.state = state;
    }
}

class Chessboard {
    constructor(width, height, tileSize) {
      this.width = width
      this.height = height
      this.tileSize = tileSize
      this.chessBoard = []
  
     
      
      for (let i = 0; i < this.height; i++) {
        this.chessBoard.push([]);
        for (let j = 0; j < this.width; j++) {
          if ((i + j) % 2 === 0) {
            this.chessBoard[i].push({type: "black"});
          } else {
            this.chessBoard[i].push({type: "white"});
          }
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