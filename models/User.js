const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    connectedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
