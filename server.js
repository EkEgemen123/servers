// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const rooms = {};

// Başlangıç dizilişini tanımla (görüntüdeki gibi)
const initialBoard = Array(24).fill(0);
initialBoard[0] = 2;  // 2 beyaz pul (beyazlar pozitif, siyahlar negatif)
initialBoard[5] = -5; // 5 siyah pul
initialBoard[7] = -3; // 3 siyah pul
initialBoard[11] = 5; // 5 beyaz pul
initialBoard[12] = -5; // 5 siyah pul
initialBoard[16] = 3; // 3 beyaz pul
initialBoard[18] = 5; // 5 beyaz pul
initialBoard[23] = -2; // 2 siyah pul

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  // Oda oluşturma
  socket.on('createRoom', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [socket.id],
        board: [...initialBoard], // Tahtanın bir kopyasını al
        turn: 'white' // İlk sıra beyazın
      };
      socket.join(roomName);
      socket.emit('roomCreated', roomName);
      console.log(`Oda oluşturuldu: ${roomName}`);
    } else {
      socket.emit('error', 'Bu oda adı zaten kullanılıyor.');
    }
  });

  // Odaya katılma
  socket.on('joinRoom', (roomName) => {
    if (rooms[roomName] && rooms[roomName].players.length < 2) {
      rooms[roomName].players.push(socket.id);
      socket.join(roomName);
      socket.emit('roomJoined', roomName);
      io.to(roomName).emit('playerJoined', rooms[roomName].players.length);
      console.log(`${socket.id} odaya katıldı: ${roomName}`);

      // İki oyuncu da katıldıysa oyunu başlat
      if (rooms[roomName].players.length === 2) {
        io.to(roomName).emit('gameStart', {
          board: rooms[roomName].board,
          turn: rooms[roomName].turn
        });
      }
    } else {
      socket.emit('error', 'Oda dolu veya mevcut değil.');
    }
  });

  // Bağlantı kesilmesi
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
    for (const roomName in rooms) {
      const index = rooms[roomName].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomName].players.splice(index, 1);
        io.to(roomName).emit('playerLeft');
        // Eğer odada kimse kalmadıysa odayı sil
        if (rooms[roomName].players.length === 0) {
          delete rooms[roomName];
          console.log(`Oda silindi: ${roomName}`);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});