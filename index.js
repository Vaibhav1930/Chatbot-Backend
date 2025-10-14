/**
 * Chat Module - Server (Node.js + Express + Socket.IO)
 * Human-readable, well-commented code intended for learning and integration.
 *
 * NOTE: For Supabase, we connect directly using a Postgres connection string.
 * In production you might use Supabase client or Row Level Security and service keys.
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./lib/db');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || '*'
}));
app.use(bodyParser.json());

// Simple health check
app.get('/', (req, res) => {
  res.json({ status: 'Chat module server is running' });
});

/**
 * REST API endpoints
 */

// Search users (by name or email)
app.get('/api/users', async (req, res) => {
  const { search } = req.query;
  try {
    const users = await db.searchUsers(search || '');
    res.json(users);
  } catch (err) {
    console.error('Error searching users', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get messages between the authenticated user (assumed) and another userId
app.get('/api/messages/:userId', async (req, res) => {
  const otherUserId = parseInt(req.params.userId, 10);
  // NOTE: We don't implement auth here. The client should supply its userId via query for demo.
  const currentUserId = parseInt(req.query.myUserId, 10) || null;
  if (!currentUserId) {
    return res.status(400).json({ error: 'Missing myUserId in query string' });
  }
  try {
    const messages = await db.getConversation(currentUserId, otherUserId);
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message (persist and emit)
app.post('/api/messages', async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  if (!sender_id || !receiver_id || !content) {
    return res.status(400).json({ error: 'sender_id, receiver_id and content are required' });
  }
  try {
    const saved = await db.createMessage(sender_id, receiver_id, content);
    // emit to receiver room
    io.to(`user_${receiver_id}`).emit('new_message', saved);
    // echo back to sender as confirmation
    io.to(`user_${sender_id}`).emit('new_message', saved);
    res.json(saved);
  } catch (err) {
    console.error('Error saving message', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

/**
 * Socket.IO: very simple convention
 * - clients join a room called `user_<userId>` after connecting and telling the server their userId
 * - server emits 'new_message' events into the target user's room when a message is created
 */
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('join', (payload) => {
    // payload: { userId: 123 }
    const userId = payload && payload.userId;
    if (userId) {
      const room = `user_${userId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
