const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('move', (move) => {
        socket.broadcast.emit('move', move)
        console.log(move)
    })

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
})

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
})