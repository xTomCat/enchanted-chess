const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

let connectedPlayers = [];

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected with IP: ' + socket.handshake.address);
    socket.on('move', (move) => {
        socket.broadcast.emit('move', move)
        console.log(move)
    })

    socket.on('disconnect', () => {
        console.log('Client disconnected with IP: ' + socket.handshake.address);
        //Filter creates an array filled with all array elements that pass a test (provided as a function). In this case, the test is that the IP address of the disconnected player is not equal to the IP address of the player in the connectedPlayers array.
        //Cool!!
        connectedPlayers = connectedPlayers.filter(p => p.ip !== socket.handshake.address)
        logConnectedPlayers()
    });

    socket.on('nickname', (nickname) => {
        const player = new Player('Anonymous', socket.handshake.address, socket.id)
        player.name = nickname
        connectedPlayers.push(player)
        logConnectedPlayers()
    });
})

function logConnectedPlayers() {
    console.log('Connected Players:');
    connectedPlayers.forEach(player => {
        console.log(`Name: ${player.name}, IP: ${player.ip}`, `UUID: ${player.UUID}`);
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
})

function generateRoomCode6Digits() {
    return Math.floor(100000 + Math.random() * 900000);
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
  constructor(board, player1, player2) {
    this.players = [];
    this.board = board;
    this.state = "waiting";
    this.addPlayer(player1);
    this.addPlayer(player2);
    this.roomCode = generateRoomCode6Digits()
  }
  addPlayer(player) {
    this.players.push(player);
    socket.emit('askToJoin', player.name);
    io.to(player.socketId).emit('askToJoin', player.name);
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