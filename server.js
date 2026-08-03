const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let waiting = [];

function pair(a, b){
  a.partner = b.id;
  b.partner = a.id;
  a.emit('matched');
  b.emit('matched');
}

io.on('connection', (socket) => {
  console.log
