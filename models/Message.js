const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    text: { type: String },        // ← corrigé ici
    image: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", MessageSchema);
