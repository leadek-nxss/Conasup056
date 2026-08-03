const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// === CANDADO DE SEGURIDAD ===
app.use((req,res,next)=>{
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Content-Security-Policy","default-src 'self' 'unsafe-inline' blob: data:; connect-src 'self' ws: wss: stun:; media-src 'self' blob: data: mediastream:;");
  res.setHeader("X-Content-Type-Options","nosniff");
  next();
});
// === FIN CANDADO ===

let waiting = null;

io.on('connection', (socket) => {
  socket.on('ready', () => {
    if (waiting && waiting.id!== socket.id) {
      const partner = waiting;
      waiting = null;
      socket.partner = partner.id;
      partner.partner = socket.id;
      partner.emit('matched', { initiator: true });
      socket.emit('matched', { initiator: false });
    } else {
      waiting = socket;
      socket.emit('searching');
    }
  });

  socket.on('stop', () => {
    if (waiting && waiting.id === socket.id) waiting = null;
  });

  socket.on('next', () => {
    if (socket.partner) {
      const p = io.sockets.sockets.get(socket.partner);
      if (p) { p.partner = null; p.emit('partner-left'); }
      socket.partner = null;
    }
    if (waiting && waiting.id === socket.id) waiting = null;

    if (waiting && waiting.id!== socket.id) {
      const partner = waiting;
      waiting = null;
      socket.partner = partner.id;
      partner.partner = socket.id;
      partner.emit('matched', { initiator: true });
      socket.emit('matched', { initiator: false });
    } else {
      waiting = socket;
      socket.emit('searching');
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

  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) waiting = null;
    if (socket.partner) {
      const p = io.sockets.sockets.get(socket.partner);
      if (p) { p.partner = null; p.emit('partner-left'); }
    }
  });
});

server.listen(process.env.PORT || 3000);
