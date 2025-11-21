const mongoose = require("mongoose");
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require("path");
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

mongoose.connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
).then(() => {
    console.log("🟢 Connecté à MongoDB");
}).catch((err) => {
    console.log("❌ ERREUR MongoDB", err);
});


// Modèles
const User = require("./models/User");
const Message = require("./models/Message");

// Port dynamique
const PORT = process.env.PORT || 3000;

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Page HTML principale
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Utilisateurs connectés
let users = {};

// SOCKET.IO
io.on('connection', async (socket) => {

    console.log("Nouvel utilisateur :", socket.id);

    // Historique
    const messages = await Message.find().sort({ createdAt: 1 });
    socket.emit("history", messages);

    // Nouveau user
    socket.on("user joined", async (username) => {
        users[socket.id] = username;
        await User.create({ username });
        io.emit("server message", `🟢 ${username} a rejoint le chat.`);
    });

    // Nouveau message
    socket.on("chat message", async (data) => {
        await Message.create({
            username: data.username,
            text: data.text
        });
        io.emit("chat message", data);
    });

    // Nouvelle image
    socket.on("chat image", async (data) => {
        await Message.create({
            username: data.username,
            image: data.image
        });
        io.emit("chat image", data);
    });

    // Typing
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

// Démarrage serveur
http.listen(PORT, () => {
    console.log("Serveur démarré sur :" + PORT);
});
