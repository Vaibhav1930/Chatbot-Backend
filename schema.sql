-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT, -- ✅ NEW COLUMN
  attachment_name TEXT, -- ✅ optional file name
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
