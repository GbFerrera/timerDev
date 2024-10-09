const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Rota para iniciar um cronômetro (armazenar tempo)
app.post('/timers', (req, res) => {
  const { time } = req.body; // Tempo em segundos
  const startTime = new Date().toISOString(); // Armazena o tempo atual como início
  const status = 'active'; // Define um status padrão

  // Adiciona um log para verificação

  db.run(`INSERT INTO timers (time, start_time, status) VALUES (?, ?, ?)`, [time, startTime, status], function(err) {
    if (err) {
      console.error('Erro ao inserir no banco de dados:', err.message); // Log de erro mais informativo
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, time });
  });
});

// Rota para listar todos os cronômetros
app.get('/timers', (req, res) => {
  db.all(`SELECT * FROM timers`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Rota para excluir um cronômetro pelo ID
app.delete('/timers/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM timers WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Cronômetro excluído', id });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
