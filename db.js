const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || 'ossma.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS stickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sticker_id TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL,
  is_registered INTEGER NOT NULL DEFAULT 0,
  vehicle_plate TEXT, full_name TEXT, email TEXT, phone TEXT, address TEXT,
  tin_number TEXT, next_of_kin_phone TEXT, vehicle_type TEXT, num_tyres INTEGER,
  state TEXT, lga TEXT, registered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_plate ON stickers(vehicle_plate);
`);
module.exports = db;
