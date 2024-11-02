const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/wordmem.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected');
    initDatabase();
  }
});

function initDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
  
// pos - 
// pos_id : pos_name
// p: phrase verb 
// v: verb
// n: noun
// x: adjective
// f: adverb
// c: conjunction
// d: pronoun
// j: preposition

  db.run(`CREATE TABLE IF NOT EXISTS words (
    wid TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    pron TEXT,
    pos TEXT,
    explain TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS study_records (
    wid TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    ldate DATETIME,
    level INTEGER,
    note TEXT,
    score INTEGER,
    PRIMARY KEY (wid, user_id)
  )`);

  // 插入初始管理员用户
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin', 10);
  db.run('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
}

module.exports = db;
