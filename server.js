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
