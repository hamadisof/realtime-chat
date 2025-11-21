btnSend.onclick = () => {
    const text = inputMessage.value;
    const username = myUsername;

    socket.emit("user joined", username);

    socket.emit("chat message", {
        username,
        message: msg
    });
};