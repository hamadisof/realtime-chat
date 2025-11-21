// model message
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        text: { type: String },
        image: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
