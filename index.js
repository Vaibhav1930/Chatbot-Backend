require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js'); // ✅ NEW
const db = require('./lib/db');
const { v4: uuidv4 } = require('uuid'); // ✅ For unique filenames

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
  })
);
app.use(bodyParser.json());

// ✅ Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ Simple health check
app.get('/', (req, res) => {
  res.json({ status: 'Chat module server with Supabase storage is running' });
});

// ✅ Upload file to Supabase Storage
app.post('/api/upload', async (req, res) => {
  try {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const filename = `${uuidv4()}`;

      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const fileExt = contentType.split('/')[1] || 'bin';
      const path = `${filename}.${fileExt}`;

      // Upload to Supabase bucket
      const { error: uploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_NAME)
        .upload(path, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Generate public URL
      const { data } = supabase.storage
        .from(process.env.SUPABASE_BUCKET_NAME)
        .getPublicUrl(path);

      res.json({ url: data.publicUrl });
    });
  } catch (err) {
    console.error('Supabase upload error:', err.message);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// ✅ Search users
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

// ✅ Fetch messages
app.get('/api/messages/:userId', async (req, res) => {
  const otherUserId = parseInt(req.params.userId, 10);
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

// ✅ Send a message
app.post('/api/messages', async (req, res) => {
  const { sender_id, receiver_id, content, attachment_url } = req.body;
  if (!sender_id || !receiver_id) {
    return res.status(400).json({ error: 'sender_id and receiver_id are required' });
  }
  try {
    const saved = await db.createMessage(
      sender_id,
      receiver_id,
      content || '',
      attachment_url || null
    );
    io.to(`user_${receiver_id}`).emit('new_message', saved);
    io.to(`user_${sender_id}`).emit('new_message', saved);
    res.json(saved);
  } catch (err) {
    console.error('Error saving message', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ✅ Socket setup
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('join', (payload) => {
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
