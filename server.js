// ===============================
//   Serveur Node + Express
// ===============================

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Port dynamique
const PORT = process.env.PORT || 3000;

// Servir les fichiers du dossier public
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// Liste des utilisateurs connectés
let users = {};

// ===============================
//   Gestion Socket.io
// ===============================
io.on('connection', (socket) => {

    console.log("Nouvel utilisateur :", socket.id);

    // Réception du pseudo
    socket.on("user joined", (username) => {
        users[socket.id] = username;
        io.emit("server message", `🟢 ${username} a rejoint le chat.`);
    });

    // Message reçu
    socket.on("chat message", (data) => {
        io.emit("chat message", data);
    });

    // Indicateur d’écriture
    socket.on("typing", (username) => {
        socket.broadcast.emit("typing", username);
    });

    // Déconnexion
    socket.on("disconnect", () => {
        const username = users[socket.id];
        if (username) {
            io.emit("server message", `🔴 ${username} s'est déconnecté.`);
            delete users[socket.id];
        }
    });
});

// ===============================
//   Démarrage du serveur
// ===============================
http.listen(PORT, () => {
    console.log("Serveur démarré sur http://localhost:" + PORT);
});
