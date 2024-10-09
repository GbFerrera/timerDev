const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require("./database")

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


let currentTime = 0;
let timerInterval = null;
let timerStatus = 'stopped';
let timersList = [];

// Rota para listar todos os tempos registrados
app.get('/timers', (req, res) => {
    db.all(`SELECT * FROM timers`, [], (err, rows) => {
        if (err) {
            console.error('Erro ao recuperar dados:', err.message); // Log de erro
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Dados retornados do banco de dados:', rows); // Log dos dados retornados
        res.json(rows); // Retorna os tempos armazenados no banco de dados
    });
});

// Função para iniciar o cronômetro
function startTimer() {
    if (timerStatus === 'running') return;

    timerStatus = 'running';
    const startTime = Date.now() - currentTime;

    timerInterval = setInterval(() => {
        currentTime = Date.now() - startTime;
        broadcast({ action: 'updateTime', time: formatTime(currentTime) });
    }, 1000);
}

// Função para pausar o cronômetro
function pauseTimer() {
    if (timerStatus !== 'running') return;

    timerStatus = 'paused';
    clearInterval(timerInterval);
    timerInterval = null;
    broadcast({ action: 'timerPaused' });
}

app.delete('/timers/:id', (req, res) => {
    const {id} = req.params;
    db.run(`DELETE FROM timers WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        broadcast({ action: 'timerDeleted', id });
        res.status(204).send(); // Retorna um status 204 No Content
    });
});

// Modifique a parte do stopTimer para enviar a lista atualizada após adicionar o tempo ao DB
function stopTimer() {
    if (timerStatus === 'stopped') return;

    clearInterval(timerInterval);
    timerInterval = null;

    const endTime = Date.now();
    const timeSpent = currentTime;

    db.run(`INSERT INTO timers (time, start_time, end_time, status) VALUES (?, ?, ?, ?)`, [
        timeSpent,
        new Date(endTime - timeSpent).toISOString(),
        new Date(endTime).toISOString(),
        'completed'
    ], function(err) {
        if (err) {
            console.error('Erro ao inserir no banco de dados:', err.message);
            return;
        }
        
        // Adiciona o tempo à lista em memória
        timersList.push({
            id: this.lastID, // Captura o ID do último registro
            time: timeSpent,
            start_time: new Date(endTime - timeSpent).toISOString(),
            end_time: new Date(endTime).toISOString(),
            status: 'completed'
        });

        broadcast({ action: 'timerStopped', time: formatTime(timeSpent) });
        
        // Envia a lista atualizada para todos os clientes
        broadcast({ action: 'timersUpdated', timers: timersList });
    });

    currentTime = 0; // Reseta o tempo
    timerStatus = 'stopped';
}

// WebSocket connections
wss.on('connection', (ws) => {
    console.log('Novo cliente conectado.');

    // Envia o tempo atual e a lista de tempos registrados para o cliente ao conectar
    ws.send(JSON.stringify({ action: 'init', time: formatTime(currentTime), status: timerStatus, timers: timersList }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.action === 'start') {
            startTimer();
        } else if (data.action === 'pause') {
            pauseTimer();
        } else if (data.action === 'stop') {
            stopTimer();
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
    });
});

// Função para enviar mensagens a todos os clientes
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Função para formatar o tempo
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.min(Math.floor(totalSeconds / 3600), 99); // Limite de 99 horas
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Inicia o servidor
server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
