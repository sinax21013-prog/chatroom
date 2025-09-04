// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// --- User database (with bcrypt hashes) ---
const users = [
  {
    username: "niqqaz",
    passwordHash: bcrypt.hashSync("Gaylords2025", 10)
  },
  {
    username: "saladin",
    passwordHash: bcrypt.hashSync("Gaylords2025", 10)
  }
];

// --- Login endpoint ---
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// --- Socket.IO setup with CORS ---
const allowedOrigins = [
  "https://verdant-moxie-0f5883.netlify.app",
  "https://verdant-moxie-0f5833.netlify.app"
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked CORS request from:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"]
  }
});

// --- Socket.IO Auth middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token provided"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload.username;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// --- Socket events ---
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.user);

  socket.on("chatMessage", (msg) => {
    const data = { user: socket.user, msg };
    io.emit("chatMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.user);
  });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
