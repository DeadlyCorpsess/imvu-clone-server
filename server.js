const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 1. Serve static files (Your HTML, CSS, JS)
app.use(express.static(__dirname));

// 2. EXPLICITLY serve the models folder so the browser can see the .glb files
app.use('/models', express.static(path.join(__dirname, 'models')));

// Store player data
let players = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join game', (username) => {
        // Initial random position
        players[socket.id] = {
            id: socket.id,
            username: username || "Guest",
            x: Math.random() * 5 - 2.5,
            z: Math.random() * 5 - 2.5
        };

        // Send existing players to the new player
        socket.emit('init players', players);
        
        // Tell others a new player joined
        socket.broadcast.emit('new player', players[socket.id]);
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            io.emit('player moved', { id: socket.id, x: data.x, z: data.z });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('remove player', socket.id);
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
