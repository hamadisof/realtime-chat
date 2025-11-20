// ===============================
//   Serveur Node + Express
// ===============================
require("dotenv").config();
const mongoose = require("mongoose");
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Connexion MongoDB
mongoose.connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/chat-realtime?retryWrites=true&w=majority`
).then(() => {
    console.log(" Connecté à MongoDB");
}).catch((err) => {
    console.log(" ERREUR MongoDB", err);
});

// Modèles Mongoose
const User = require("./models/User");
const Message = require("./models/Message");

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
io.on('connection', async (socket) => {

    console.log("Nouvel utilisateur :", socket.id);

    // ➤ ENVOYER L'HISTORIQUE AU NOUVEL UTILISATEUR
    const messages = await Message.find().sort({ createdAt: 1 });
    socket.emit("history", messages);

    // Réception du pseudo
    socket.on("user joined", async (username) => {
        users[socket.id] = username;
        await User.create({ username });
        io.emit("server message", `🟢 ${username} a rejoint le chat.`);
    });

    // Message texte reçu
    socket.on("chat message", async (data) => {
        console.log("📥 MESSAGE REÇU PAR LE SERVEUR :", data);

        await Message.create({
            username: data.username,
            text: data.text
        });

        io.emit("chat message", data);
    });

    // Réception d'une image
    socket.on("chat image", async (data) => {
        console.log("📥 IMAGE REÇUE PAR LE SERVEUR :", data);
        await Message.create({
            username: data.username,
            image: data.image
        });

        io.emit("chat image", data);
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
