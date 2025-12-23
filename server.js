const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the main folder and the models folder
app.use(express.static(__dirname));
app.use('/models', express.static(path.join(__dirname, 'models')));

let players = {};

io.on('connection', (socket) => {
    socket.on('join game', (username) => {
        players[socket.id] = {
            id: socket.id,
            username: username || "Guest",
            x: 0, z: 0
        };
        socket.emit('init players', players);
        socket.broadcast.emit('new player', players[socket.id]);
    });

    socket.on('chat message', (data) => { io.emit('chat message', data); });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            io.emit('player moved', { id: socket.id, x: data.x, z: data.z });
        }
    });

    socket.on('stop move', () => {
        io.emit('player stopped', { id: socket.id });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('remove player', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
