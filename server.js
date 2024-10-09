const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let startTime, elapsedTime = 0, interval, isRunning = false;

// Função para iniciar o cronômetro
function startTimer(ws) {
    if (!isRunning) {
        startTime = Date.now() - elapsedTime;
        interval = setInterval(() => updateTimer(ws), 1000);
        isRunning = true;
    }
}

// Função para pausar o cronômetro
function pauseTimer() {
    if (isRunning) {
        clearInterval(interval);
        elapsedTime = Date.now() - startTime;
        isRunning = false;
    }
}

// Função para reiniciar o cronômetro
function resetTimer(ws) {
    if (isRunning) {
        pauseTimer();
    }
    const timeSpent = calculateTimeSpent(elapsedTime);
    elapsedTime = 0;
    ws.send(JSON.stringify({ action: 'reset', timeSpent: "00:00:00" }));
    saveLogToDB(timeSpent); // Salva o log ao reiniciar o cronômetro
}

// Atualiza o cronômetro e envia para os clientes WebSocket conectados
function updateTimer(ws) {
    elapsedTime = Date.now() - startTime;
    const timeSpent = calculateTimeSpent(elapsedTime);
    ws.send(JSON.stringify({ action: 'update', timeSpent }));
}

// Função para calcular o tempo em formato HH:MM:SS
function calculateTimeSpent(time) {
    const totalSeconds = Math.floor(time / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Função para salvar o log no banco de dados (dummy)
function saveLogToDB(timeSpent) {
    // Simulação de salvamento de log
    const log = {
        id: Math.floor(Math.random() * 10000),
        timeSpent,
        timestamp: new Date()
    };
    console.log('Log salvo:', log); // Exibir log no console (substituir pela lógica real de banco de dados)
}

// WebSocket connections
wss.on('connection', (ws) => {
    console.log('Novo cliente conectado.');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.action === 'start') {
            startTimer(ws);
        } else if (data.action === 'pause') {
            pauseTimer();
        } else if (data.action === 'reset') {
            resetTimer(ws);
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
        pauseTimer(); // Pausa quando o cliente desconecta
    });
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
