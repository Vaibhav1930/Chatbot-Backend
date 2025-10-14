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
    // create sample users
    await db.pool.query("INSERT INTO users (name,email) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING", ['Alice Johnson','alice@example.com']);
    await db.pool.query("INSERT INTO users (name,email) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING", ['Bob Sharma','bob@example.com']);
    await db.pool.query("INSERT INTO users (name,email) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING", ['Charlie Rao','charlie@example.com']);

    // get ids
    const res = await db.pool.query("SELECT id,email FROM users WHERE email IN ($1,$2,$3)", ['alice@example.com','bob@example.com','charlie@example.com']);
    console.log('Users present:', res.rows);

    // sample message
    await db.createMessage(1, 2, 'Hello Bob, this is Alice – welcome!');
    await db.createMessage(2, 1, 'Thanks Alice! Happy to be here.');
    console.log('Seeding done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

seed();
