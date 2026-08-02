const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/ping', (req, res) => res.send('ok'));

let waiting = null;

io.on('connection', socket => {
  socket.on('findPartner', () => {
    if (waiting && waiting.id!== socket.id) {
      const partner = waiting;
      waiting = null;
      const room = partner.id + '#' + socket.id;
      partner.join(room);
      socket.join(room);
      partner.partnerRoom = room;
      socket.partnerRoom = room;
      io.to(room).emit('matched');
    } else {
      waiting = socket;
      socket.emit('waiting');
    }
  });

  socket.on('signal', data => {
    if (socket.partnerRoom) socket.to(socket.partnerRoom).emit('signal', data);
  });

  socket.on('next', () => {
    if (socket.partnerRoom) {
      socket.to(socket.partnerRoom).emit('partnerLeft');
      socket.leave(socket.partnerRoom);
    }
    socket.partnerRoom = null;
  });

  socket.on('disconnect', () => {
    if (waiting === socket) waiting = null;
    if (socket.partnerRoom) socket.to(socket.partnerRoom).emit('partnerLeft');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('CONAP ON'));
