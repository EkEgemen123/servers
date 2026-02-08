// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io"); // Socket.io v4+ kullanımı

const app = express();
const server = http.createServer(app);

// --- CORS AYARI VE SOCKET.IO BAŞLATMA ---
const io = new Server(server, {
  cors: {
    // Kendi Netlify adresini buraya ekle (Hata almamak için sondaki '/' işaretini koyma)
    origin: ["https://magical-croquembouche-fcef3d.netlify.app", "http://localhost:3000"], 
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.static('public'));

const rooms = {};

// Başlangıç dizilişi (Görseldeki gibi hassas ayarlandı)
const initialBoard = Array(24).fill(0);
initialBoard[0] = 2;  // 2 beyaz pul
initialBoard[5] = -5; // 5 siyah pul
initialBoard[7] = -3; // 3 siyah pul
initialBoard[11] = 5; // 5 beyaz pul
initialBoard[12] = -5; // 5 siyah pul
initialBoard[16] = 3; // 3 beyaz pul
initialBoard[18] = 5; // 5 beyaz pul
initialBoard[23] = -2; // 2 siyah pul

io.on('connection', (socket) => {
  console.log('Bağlantı başarılı: ', socket.id);

  // Oda oluşturma
  socket.on('createRoom', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [socket.id],
        board: [...initialBoard],
        turn: 'white'
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
      
      console.log(`${socket.id} odaya katıldı: ${roomName}`);

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

  // Zar Atma Senkronizasyonu
  socket.on('diceRoll', (data) => {
    // Gelen zar bilgisini odadaki diğer oyuncuya da gönder
    io.to(data.room).emit('diceResult', {
      d1: data.d1,
      d2: data.d2
    });
  });

  // Bağlantı kesilmesi
  socket.on('disconnect', () => {
    for (const roomName in rooms) {
      const index = rooms[roomName].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomName].players.splice(index, 1);
        io.to(roomName).emit('playerLeft');
        if (rooms[roomName].players.length === 0) {
          delete rooms[roomName];
          console.log(`Oda silindi: ${roomName}`);
        }
        break;
      }
    }
  });
});

// Render.com için port ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Efsanevi Tavla Sunucusu ${PORT} portunda aktif!`);
});
