/**
 * db.js - simple Postgres helper module using 'pg'
 * The code is intentionally simple and synchronous-friendly for clarity.
 *
 * Replace with connection pooling or an ORM (Prisma/Sequelize) in larger projects.
 */
const { Pool } = require('pg');

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Please set SUPABASE_DB_URL or DATABASE_URL in .env');
}

const pool = new Pool({
  connectionString,
  // optional: set SSL if required by Supabase; many hosted DBs require it
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

module.exports = {
  /**
   * Search users by name or email (case-insensitive)
   */
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

  /**
   * Get conversation messages between two users (ordered ascending by timestamp)
   */
  getConversation: async (userA, userB) => {
    const q = `
      SELECT id, sender_id, receiver_id, content, timestamp
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY timestamp ASC
    `;
    const { rows } = await pool.query(q, [userA, userB]);
    return rows;
  },

  /**
   * Create message and return the inserted row
   */
  createMessage: async (senderId, receiverId, content) => {
    const q = `
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, sender_id, receiver_id, content, timestamp
    `;
    const { rows } = await pool.query(q, [senderId, receiverId, content]);
    return rows[0];
  },

  // expose pool for custom queries / seeds
  pool
};
