const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow from all origins during dev
  },
});

let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Check if there's a waiting player
  if (waitingPlayer) {
    const room = `${waitingPlayer.id}#${socket.id}`; // Create a unique room using both player IDs
    socket.join(room);  // Join the new player to the room
    waitingPlayer.join(room);  // Join the waiting player to the room

    // Start the game and inform both players of their roles
    io.to(room).emit("startGame", {
      room,
      playerX: waitingPlayer.id,  // First player is X
      playerO: socket.id,  // Second player is O
    });

    waitingPlayer = null;  // Reset waiting player to allow new players to connect
  } else {
    // If no one is waiting, this player will wait for another player to connect
    waitingPlayer = socket;
    console.log("Waiting for another player...");
  }

  // Handle the move made by a player and update the board
  socket.on("makeMove", ({ room, squares }) => {
    io.to(room).emit("updateBoard", squares);  // Broadcast the new board state to both players
  });

  // Handle disconnection of players
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;  // If the waiting player disconnects, reset waitingPlayer
    } else {
      // Cleanup if a player in the active game disconnects
      const room = Object.keys(socket.rooms)[0];  // Get the room the player is part of
      if (room) {
        io.to(room).emit("gameOver", { message: "The other player disconnected." });
        io.in(room).disconnectSockets();  // Disconnect both players from the room
      }
    }
  });
});

server.listen(5000, () => {
  console.log("Multiplayer server running on http://localhost:5000");
});
