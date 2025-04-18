const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

let waitingPlayer = null;
const games = {}; // { roomId: { playerX, playerO, board } }

function createRoomId(p1, p2) {
  return `${p1}-${p2}`;
}

app.post("/join", (req, res) => {
  const playerId = req.body.playerId;

  if (waitingPlayer) {
    const roomId = createRoomId(waitingPlayer, playerId);
    games[roomId] = {
      playerX: waitingPlayer,
      playerO: playerId,
      board: Array(9).fill(null),
    };
    const playerSymbol = "O";
    const opponent = waitingPlayer;
    waitingPlayer = null;
    return res.json({ roomId, symbol: playerSymbol, opponent });
  } else {
    waitingPlayer = playerId;
    return res.json({ roomId: null, symbol: "X" });
  }
});

app.post("/move", (req, res) => {
  const { roomId, board } = req.body;
  if (games[roomId]) {
    games[roomId].board = board;
    return res.sendStatus(200);
  }
  return res.status(404).json({ error: "Game not found" });
});

app.get("/state/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  if (games[roomId]) {
    return res.json(games[roomId].board);
  }
  return res.status(404).json({ error: "Game not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
