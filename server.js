const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let waiting = [];

function pair(a, b) {
  a.partner = b.id;
  b.partner = a.id;
  a.emit('matched');
  b.emit('matched');
}

io.on('connection', (socket) => {
  socket.on('ready', () => {
    if (waiting.length > 0) {
      const partner = waiting.shift();
      if (partner && partner.connected) {
        pair(socket, partner);
      } else {
        waiting.push(socket);
      }
    } else {
      waiting.push(socket);
    }
  });

  socket.on('offer', (o) => {
    if (socket.partner) io.to(socket.partner).emit('offer', o);
  });
  socket.on('answer', (a) => {
    if (socket.partner) io.to(socket.partner).emit('answer', a);
  });
  socket.on('ice', (c) => {
    if (socket.partner) io.to(socket.partner).emit('ice', c);
  });

  socket.on('next', () => {
    if (socket.partner) {
      const old = io.sockets.sockets.get(socket.partner);
      if (old) { old.partner = null; old.emit('partner-left'); }
      socket.partner = null;
    }
    waiting.push(socket);
    if (waiting.length >= 2) {
      const a = waiting.shift();
      const b = waiting.shift();
      if (a.connected && b.connected) pair(a, b);
    }
  });

  socket.on('disconnect', () => {
    waiting = waiting.filter(s => s.id !== socket.id);
    if (socket.partner) {
      const p = io.sockets.sockets.get(socket.partner);
      if (p) { p.partner = null; p.emit('partner-left'); }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('ON ' + PORT));
