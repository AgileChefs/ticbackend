const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow from all origins during dev
  },
});

let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  if (waitingPlayer) {
    const room = `${waitingPlayer.id}#${socket.id}`;
    socket.join(room);
    waitingPlayer.join(room);

    io.to(room).emit("startGame", {
      room,
      playerX: waitingPlayer.id,
      playerO: socket.id,
    });

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
  }

  socket.on("makeMove", ({ room, squares }) => {
    io.to(room).emit("updateBoard", squares);
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

server.listen(8080, () => {
  console.log("Multiplayer server running on http://localhost:5000");
});
