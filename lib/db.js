const { Pool } = require('pg');

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Please set SUPABASE_DB_URL or DATABASE_URL in .env');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  searchUsers: async (searchTerm) => {
    const q = `
      SELECT id, name, email
      FROM users
      WHERE name ILIKE $1 OR email ILIKE $1
      ORDER BY name
      LIMIT 50
    `;
    const val = ['%' + searchTerm + '%'];
    const { rows } = await pool.query(q, val);
    return rows;
  },

  getConversation: async (userA, userB) => {
    const q = `
      SELECT id, sender_id, receiver_id, content, attachment_url, timestamp
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY timestamp ASC
    `;
    const { rows } = await pool.query(q, [userA, userB]);
    return rows;
  },

  createMessage: async (senderId, receiverId, content, attachmentUrl = null) => {
    const q = `
      INSERT INTO messages (sender_id, receiver_id, content, attachment_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id, receiver_id, content, attachment_url, timestamp
    `;
    const { rows } = await pool.query(q, [senderId, receiverId, content, attachmentUrl]);
    return rows[0];
  },

  pool,
};
