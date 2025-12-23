const express = require("express");
const app = express();
const http = require("http").createServer(app);
const fs = require("fs");
const bodyParser = require("body-parser");
const io = require("socket.io")(http, {
    cors: { origin: "*" }
});

app.use(express.static("public"));
app.use(bodyParser.json());

// --- DATABASE (Resets on Restart) ---
const DB_FILE = "./users.json";
function getUsers() { try { if(!fs.existsSync(DB_FILE)) return []; return JSON.parse(fs.readFileSync(DB_FILE)); } catch(e){ return []; } }
function saveUsers(u) { fs.writeFileSync(DB_FILE, JSON.stringify(u, null, 2)); }

// --- ROUTES ---
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    if(users.find(u => u.username === username)) return res.json({success:false, msg:"Taken"});
    users.push({username, password});
    saveUsers(users);
    res.json({success:true});
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const user = getUsers().find(u => u.username === username && u.password === password);
    res.json(user ? {success:true, username:user.username} : {success:false, msg:"Invalid"});
});

// --- MULTIPLAYER LOGIC ---
let activePlayers = {}; 

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join game", (username) => {
        socket.username = username;
        // Random start pos
        const x = (Math.random() * 6) - 3;
        const z = (Math.random() * 6) - 3;
        
        // Add to list
        activePlayers[socket.id] = { id: socket.id, username, x, z, action: 'Idle' };
        
        // 1. Send the updated list to the NEW person (Includes themselves + others)
        socket.emit("init players", activePlayers);

        // 2. Tell OTHERS that a new person joined
        socket.broadcast.emit("new player", activePlayers[socket.id]);
        
        io.emit("system message", `${username} has entered the room.`);
    });

    socket.on("move", (data) => {
        if(activePlayers[socket.id]) {
            activePlayers[socket.id].x = data.x;
            activePlayers[socket.id].z = data.z;
            activePlayers[socket.id].action = 'Walking';
            io.emit("player moved", { id: socket.id, x: data.x, z: data.z });
        }
    });

    socket.on("stop move", () => {
        if(activePlayers[socket.id]) {
            activePlayers[socket.id].action = 'Idle';
            io.emit("player stop", socket.id);
        }
    });

    socket.on("chat message", (data) => {
        io.emit("chat message", data);
    });

    socket.on("disconnect", () => {
        if(socket.username) {
            io.emit("system message", `${socket.username} left.`);
            io.emit("remove player", socket.id);
            delete activePlayers[socket.id];
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Running on ${PORT}`));
