const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, 'data.db')
  : path.join(__dirname, 'data.db');

let db = null;
let SQL = null;

async function initDatabase() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      foto TEXT,
      username_tiktok TEXT NOT NULL DEFAULT '',
      username_ig TEXT NOT NULL DEFAULT '',
      jurusan TEXT NOT NULL,
      angkatan TEXT NOT NULL,
      no_hp TEXT NOT NULL,
      alasan TEXT NOT NULL,
      file_siakad TEXT,
      file_tiktok TEXT,
      file_instagram TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  const result = db.exec("SELECT COUNT(*) as count FROM admin");
  if (result[0].values[0][0] === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run("INSERT INTO admin (username, password) VALUES (?, ?)", ['admin', hashedPassword]);
  }

  saveDatabase();
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDatabase() {
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDatabase, saveDatabase, getDatabase, closeDatabase };
