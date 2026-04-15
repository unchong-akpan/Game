const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client', 'dist')));


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        gmId: socket.id,
        gameState: 'waiting',
        question: '',
        answer: '',
        timer: 60,
        interval: null
      };
    }

    // Don't allow join if game is in progress
    if (rooms[roomId].gameState === 'started') {
      socket.emit('error-msg', 'Game is already in progress');
      return;
    }

    rooms[roomId].players[socket.id] = {
      id: socket.id,
      name: playerName,
      score: 0,
      attempts: 0
    };

    socket.join(roomId);
    io.to(roomId).emit('player-update', Object.values(rooms[roomId].players));
    io.to(roomId).emit('gm-update', rooms[roomId].gmId);
    
    console.log(`${playerName} joined room ${roomId}`);
  });

  socket.on('set-question', ({ roomId, question, answer }) => {
    const room = rooms[roomId];
    if (room && room.gmId === socket.id) {
      room.question = question;
      room.answer = answer.toLowerCase().trim();
      io.to(roomId).emit('question-ready', { question: room.question });
    }
  });

  socket.on('start-game', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.gmId === socket.id) {
      const playerCount = Object.keys(room.players).length;
      if (playerCount < 3) {
        socket.emit('error-msg', 'Need at least 3 players to start');
        return;
      }

      if (!room.question || !room.answer) {
        socket.emit('error-msg', 'Please set a question and answer first');
        return;
      }

      room.gameState = 'started';
      room.timer = 60;
      
      // Reset attempts
      Object.values(room.players).forEach(p => p.attempts = 0);
      io.to(roomId).emit('game-started', { question: room.question });
      io.to(room.gmId).emit('gm-answer', { answer: room.answer });

      room.interval = setInterval(() => {
        room.timer--;
        io.to(roomId).emit('timer-update', room.timer);

        if (room.timer <= 0) {
          endGame(roomId, null);
        }
      }, 1000);
    }
  });

  socket.on('submit-guess', ({ roomId, guess }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'started') return;

    const player = room.players[socket.id];
    if (socket.id === room.gmId) return; // GM can't guess
    if (player.attempts >= 3) return;

    player.attempts++;
    const isCorrect = guess.toLowerCase().trim() === room.answer;

    if (isCorrect) {
      player.score += 10;
      endGame(roomId, socket.id);
    } else {
      socket.emit('wrong-answer', { attemptsLeft: 3 - player.attempts });
      if (player.attempts >= 3) {
        socket.emit('out-of-attempts');
      }
      io.to(roomId).emit('player-update', Object.values(room.players));
    }
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        delete rooms[roomId].players[socket.id];
        
        const remainingPlayers = Object.keys(rooms[roomId].players);
        if (remainingPlayers.length === 0) {
          clearInterval(rooms[roomId].interval);
          delete rooms[roomId];
        } else {
          if (rooms[roomId].gmId === socket.id) {
            // Assign new GM
            rooms[roomId].gmId = remainingPlayers[0];
            io.to(roomId).emit('gm-update', rooms[roomId].gmId);
          }
          io.to(roomId).emit('player-update', Object.values(rooms[roomId].players));
        }
      }
    }
  });

  function endGame(roomId, winnerId) {
    const room = rooms[roomId];
    if (!room) return;

    clearInterval(room.interval);
    room.gameState = 'waiting';
    
    io.to(roomId).emit('game-ended', {
      winnerId,
      winnerName: winnerId ? room.players[winnerId].name : null,
      answer: room.answer,
      players: Object.values(room.players)
    });

    // Rotate GM
    const playerIds = Object.keys(room.players);
    const currentGmIndex = playerIds.indexOf(room.gmId);
    const nextGmIndex = (currentGmIndex + 1) % playerIds.length;
    room.gmId = playerIds[nextGmIndex];
    
    io.to(roomId).emit('gm-update', room.gmId);
    room.question = '';
    room.answer = '';
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*all', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
