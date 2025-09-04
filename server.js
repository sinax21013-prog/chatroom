// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");  // password hashing
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// 🔥 Set this to your deployed Netlify URL
const FRONTEND_ORIGIN = "https://verdant-moxie-0f5883.netlify.app";

// Middleware
app.use(express.json());
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Users (in real-world → database)
const users = [
  {
    id: 1,
    username: "admin",
    // password = "password123" (already hashed)
    password: bcrypt.hashSync("password123", 10)
  },
  {
    id: 2,
    username: "test",
    password: bcrypt.hashSync("test123", 10)
  }
];

// Secret key for JWT (store in Render env var!)
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// --- Authentication Routes ---
// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

  // Sign JWT token
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "2h"
  });

  res.json({ token });
});

// Middleware to check JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Example protected route
app.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error("Authentication error"));
    socket.user = user;
    next();
  });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.username}`);

  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", {
      user: socket.user.username,
      message: msg,
      time: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.username}`);
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
