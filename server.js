const mongoose = require("mongoose");
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

mongoose
    .connect(
        `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    )
    .then(() => {
        console.log("🟢 Connecté à MongoDB");
    })
    .catch((err) => {
        console.log("❌ ERREUR MongoDB", err);
    });

// Modèles
const User = require("./models/User");
const Message = require("./models/Message");

// Port dynamique
const PORT = process.env.PORT || 3000;

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Routes HTML

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Utilisateurs connectés en mémoire
let connectedUsers = {};

function sanitizeText(text = "") {
    return text
        .toString()
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function broadcastUserList() {
    const list = Object.values(connectedUsers);
    io.emit("user list", list);
}

// Middleware Socket.io pour imposer le username
io.use((socket, next) => {
    const username = socket.handshake.auth?.username;
    if (!username) {
        return next(new Error("NO_USERNAME"));
    }
    socket.username = sanitizeText(username);
    next();
});

// connexion à SOCKET.IO
io.on("connection", async (socket) => {
    const username = socket.username;
    connectedUsers[socket.id] = username;

    console.log("Nouvel utilisateur :", username, socket.id);
    await User.findOneAndUpdate(
        { username },
        {
            username,
            isOnline: true,
            lastSeen: new Date(),
        },
        { upsert: true, new: true }
    );

    // Envoie l'historique complet des messages à ce socket
    const messages = await Message.find().sort({ createdAt: 1 }).lean();
    socket.emit("history", messages);

    // Message système : nouvelle connexion
    io.emit("server message", `🟢 ${username} a rejoint le chat.`);
    broadcastUserList();

    // Nouveau message texte
    socket.on("chat message", async (data) => {
        const cleanText = sanitizeText(data.text || "");
        if (!cleanText) return;

        const msg = await Message.create({
            username,
            text: cleanText,
        });
        io.emit("chat message", msg);
    });

    // Nouvelle image
    socket.on("chat image", async (data) => {
        if (!data || !data.image) return;
        if (data.image.length > 2_000_000) {
            console.log("Image trop lourde, ignorée.");
            return;
        }

        const msg = await Message.create({
            username,
            image: data.image,
        });

        io.emit("chat image", msg);
    });

    // Typing
    socket.on("typing", () => {
        socket.broadcast.emit("typing", username);
    });

    // Déconnexion (fermeture onglet / socket.disconnect())
    socket.on("disconnect", async () => {
        delete connectedUsers[socket.id];

        await User.findOneAndUpdate(
            { username },
            {
                isOnline: false,
                lastSeen: new Date(),
            }
        );

        io.emit("server message", `🔴 ${username} s'est déconnecté.`);
        broadcastUserList();
    });
});

// Démarrage serveur
http.listen(PORT, () => {
    console.log("Serveur démarré sur :" + PORT);
});
