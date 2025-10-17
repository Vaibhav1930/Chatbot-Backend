/**
 * Simple seeding script to create sample users and messages.
 * Usage: node seed.js
 *
 * IMPORTANT: This runs queries directly. Use with care on production DB.
 */
require('dotenv').config();
const db = require('./lib/db');

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create sample users
    await db.pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
      ['Alice Johnson', 'alice@example.com']
    );
    await db.pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
      ['Bob Sharma', 'bob@example.com']
    );
    await db.pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
      ['Charlie Rao', 'charlie@example.com']
    );

    // Fetch the actual IDs for these users
    const result = await db.pool.query(
      "SELECT id, email FROM users WHERE email IN ($1, $2, $3)",
      ['alice@example.com', 'bob@example.com', 'charlie@example.com']
    );

    const users = {};
    for (const row of result.rows) {
      users[row.email] = row.id;
    }

    console.log('👥 Users present:', users);

    // Create sample messages using the real IDs
    await db.createMessage(
      users['alice@example.com'],
      users['bob@example.com'],
      'Hello Bob, this is Alice – welcome to the chat!',
      null
    );

    await db.createMessage(
      users['bob@example.com'],
      users['alice@example.com'],
      'Thanks Alice! Happy to be here 😊',
      null
    );

    await db.createMessage(
      users['charlie@example.com'],
      users['alice@example.com'],
      'Hey Alice! Check out this cool image!',
      'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/chat-attachments/sample-image.jpg'
    );

    console.log('✅ Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
