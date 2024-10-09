// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria ou abre um banco de dados SQLite
const db = new sqlite3.Database(path.join(__dirname, 'timer.db'), (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    // Cria a tabela se não existir
    db.run(`CREATE TABLE IF NOT EXISTS timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL
    )`);
  }
});

module.exports = db;
