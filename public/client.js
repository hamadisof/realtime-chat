btnSend.onclick = () => {
    const text = inputMessage.value;
    const username = myUsername; // récupéré au login

    socket.emit("user joined", username);

    socket.emit("chat message", {
        username,
        message: msg
    });
};
