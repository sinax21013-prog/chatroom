// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS: only allow frontend origin from env var
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET","POST"]
  }
});

const MAX_MESSAGES = 200;
const messages = []; // in-memory message history

// Serve static frontend if needed (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req,res) => res.send('ok'));

// Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Send chat history to new user
  socket.emit('history', messages);

  // Receive and broadcast messages
  socket.on('chatMessage', (msg) => {
    if(!msg || typeof msg.user !== 'string' || typeof msg.text !== 'string') return;
    msg.text = msg.text.trim().slice(0,1000);
    msg.timestamp = Date.now();

    messages.push(msg);
    if(messages.length > MAX_MESSAGES) messages.shift();

    io.emit('chatMessage', msg);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));