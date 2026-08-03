const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static('public'));
let waiting = null;
io.on('connection', (socket) => {
  console.log('conectado', socket.id);
  socket.on('ready', () => {
    if (waiting && waiting.id!== socket.id && waiting.connected) {
      const partner = waiting;
      waiting = null;
      socket.partner = partner.id;
      partner.partner = socket.id;
      partner.emit('matched', { initiator: false });
      socket.emit('matched', { initiator: true });
    } else {
      waiting = socket;
    }
  });
  socket.on('offer', o => { if(socket.partner) io.to(socket.partner).emit('offer', o); });
  socket.on('answer', a => { if(socket.partner) io.to(socket.partner).emit('answer', a); });
  socket.on('ice', c => { if(socket.partner) io.to(socket.partner).emit('ice', c); });
  socket.on('next', () => {
    if(socket.partner){
      const p = io.sockets.sockets.get(socket.partner);
      if(p){ p.partner = null; p.emit('partner-left'); }
    }
    socket.partner = null;
    // volver a cola
    if (waiting && waiting.id!== socket.id) {
      const partner = waiting;
      waiting = null;
      socket.partner = partner.id;
      partner.partner = socket.id;
      partner.emit('matched', { initiator: false });
      socket.emit('matched', { initiator: true });
    } else {
      waiting = socket;
      socket.emit('searching');
    }
  });
  socket.on('disconnect', () => {
    if(waiting && waiting.id === socket.id) waiting = null;
    if(socket.partner){
      const p = io.sockets.sockets.get(socket.partner);
      if(p){ p.partner = null; p.emit('partner-left'); }
    }
  });
});
server.listen(process.env.PORT || 3000, () => console.log('ON'));
