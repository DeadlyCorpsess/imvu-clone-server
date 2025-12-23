const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Serve the main folder files (index.html, etc)
app.use(express.static(__dirname));

// 2. Serve the models folder explicitly
app.use('/models', express.static(path.join(__dirname, 'models')));

let players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join game', (username) => {
        players[socket.id] = {
            id: socket.id,
            username: username || "Guest",
            x: (Math.random() - 0.5) * 4,
            z: (Math.random() - 0.5) * 4
        };
        // Send everyone to the new player
        socket.emit('init players', players);
        // Tell everyone else about the new player
        socket.broadcast.emit('new player', players[socket.id]);
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('remove player', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
