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
        const player = connectedPlayers.find(p => p.socketId === socket.id) 
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
            console.log("Total open games: " + Object.keys(games).length + " -> " + (Object.keys(games).length - 1))
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

        // const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = new Game(roomCode);
        console.log("Total open games: " + Object.keys(games).length + " -> " + (Object.keys(games).length + 1))
        games[roomCode] = game;
        game.populateBoard();
        game.addPlayer(player);
        console.log(player.name + ' created a room with code: ' + roomCode);
        io.to(socket.id).emit('roomCreated', roomCode, player.name);
        player.setColor("white")
        player.generateBoardOnClient(game.getBoard())
        sendGameDataToRoom(roomCode)
    });

    socket.on('joinGame', (roomCode) => {
        const player = connectedPlayers.find(p => p.socketId === socket.id)
        const game = games[roomCode];
        if (game && game.players.length < 2) {
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
            const player1 = games[roomCode].players[0];
            const player2 = games[roomCode].players[1];
            if (player1) {
              player.setColor("unset!")
            }
            if (player2) {
              player.setColor("unset!")
            }
            delete games[roomCode];
            //io.to('game-' + roomCode).emit('roomClosed');
            if (player1) {
              player1.leaveRoom(player1, roomCode);
            }
            if (player2) {
              player2.leaveRoom(player2, roomCode);
            }
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
    const gameData = {
        players: game.getPlayers(),
        board: game.getBoard(),
        state: game.getState(),
        turn: game.getTurn(),
        check: game.check,
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
      this.socketId = socketId;
      this.color = "unset!";
    }

    setColor(color) {
      if (color != "white" || "black" || "unset!") {
        console.log("Invalid color: " + color)
        return
      }
      this.color = color;
      io.to(this.socketId).emit('setColor', color)
    }

    generateBoardOnClient(board) {
      io.to(this.socketId).emit('initBoard', board)
    }

    leaveRoom(roomCode) {
      const socket = io.sockets.sockets.get(this.socketId);
      io.to(this.socketId).emit('roomClosed');
      if (socket) {
        socket.leave('game-' + roomCode);
      }
    
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
        this.players[0].leaveRoom( this.roomCode)
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
      let availableMoves = piece.getAvailableMoves(this, from.x, from.y);

      if (availableMoves.find(m => m.x === to.x && m.y === to.y)) {
        this.setTileData(to.x, to.y, { piece: piece });
        this.setTileData(from.x, from.y, { piece: null });

        if (this.isInCheck("black")) {
          this.check = "black"
          if (this.isCheckMate("black")) {
            this.checkMate = "black"
            this.state = "checkmate"
            sendGameDataToRoom(this.roomCode)
            this.close()
          }
        } else if (this.isInCheck("white")) {
          this.check = "white"
          if (this.isCheckMate("white")) {
            this.checkMate = "white"
            this.state = "checkmate"
            sendGameDataToRoom(this.roomCode)
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
        this.state = "started";
        sendGameDataToRoom(this.roomCode)
      }
      isInCheck(color) {
        let kingPos = this.findKing(color);
        let king = this.getTileData(kingPos.x, kingPos.y).piece;
        //loop through the board
        for (let i = 0; i < this.height; i++) {
          for (let j = 0; j < this.width; j++) {
            //get the piece at loop location
            let piece = this.getTileData(j, i).piece;
            //if the piece exists and is not the same color as the king
            if (piece && piece.color != color) {
    
              let moves = piece.getAvailableMoves(this, j, i);
              if (moves) {
              for (let i = 0; i < moves.length; i++) {
                if (moves[i].x == kingPos.x && moves[i].y == kingPos.y) {
                  return true;
                }
              }
            }
            }
          }
        }
        return false;
    
    }

    isCheckMate(color) {
      let kingPos = this.findKing(color);
      let king = this.getTileData(kingPos.x, kingPos.y).piece;
      let moves = king.getAvailableMoves(this, kingPos.x, kingPos.y);
      let isInCheck = this.isInCheck(color);
      if (moves.length == 0 && isInCheck) {
        return true;
      }
      else {
        return false;
      }
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
        let leftCapture = { x: x - 1, y: y + direction }
        let rightCapture = { x: x + 1, y: y + direction }
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
            }
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
  
