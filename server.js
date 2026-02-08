const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// CORS Ayarları: Her yerden bağlantıya izin verir (Netlify için en güvenli yol)
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const rooms = {};

// GÖRSELDEKİ (image_c3585c.png) STANDART DİZİLİŞ
// 0-23 arası indeksler (1-24 kapıları)
const getInitialBoard = () => {
    let board = Array(24).fill(0);
    board[0] = 2;   // Kapı 1: 2 Beyaz
    board[5] = -5;  // Kapı 6: 5 Siyah
    board[7] = -3;  // Kapı 8: 3 Siyah
    board[11] = 5;  // Kapı 12: 5 Beyaz
    board[12] = -5; // Kapı 13: 5 Siyah
    board[16] = 3;  // Kapı 17: 3 Beyaz
    board[18] = 5;  // Kapı 19: 5 Beyaz
    board[23] = -2; // Kapı 24: 2 Siyah
    return board;
};

io.on('connection', (socket) => {
  console.log('Oyuncu bağlandı:', socket.id);

  // ODA OLUŞTURMA / KATILMA (Tek bir sistemde birleştirildi)
  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [socket.id],
        board: getInitialBoard(),
        turn: 'white'
      };
      socket.emit('roomCreated', roomName);
    } else {
      if (rooms[roomName].players.length < 2) {
        rooms[roomName].players.push(socket.id);
        socket.emit('roomJoined', roomName);
        
        // İki kişi gelince oyunu başlat
        io.to(roomName).emit('gameStart', {
          board: rooms[roomName].board,
          turn: rooms[roomName].turn
        });
      } else {
        socket.emit('error', 'Oda dolu!');
      }
    }
  });

  // ZAR ATMA SENKRONİZASYONU
  socket.on('diceRolled', (data) => {
    // Odadaki HERKESE (atan dahil) zarı gönder
    io.to(data.room).emit('updateDice', data.dice);
  });

  socket.on('disconnect', () => {
    console.log('Ayrıldı:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} üzerinde devrede!`));
