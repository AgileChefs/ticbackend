const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

let waitingPlayer = null;
const games = {}; // { roomId: { playerX, playerO, board, turn } }

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
      turn: "X", // X always starts
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
  const { roomId, board, playerId } = req.body;
  const game = games[roomId];

  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  const currentTurnSymbol = game.turn;
  const playerSymbol = playerId === game.playerX ? "X" : playerId === game.playerO ? "O" : null;

  if (!playerSymbol) {
    return res.status(403).json({ error: "Player not part of this game" });
  }

  if (playerSymbol !== currentTurnSymbol) {
    return res.status(403).json({ error: "It's not your turn" });
  }

  // Check that only one move was made
  const currentBoard = game.board;
  const moveCountDiff = board.filter((cell, i) => cell !== currentBoard[i]).length;

  if (moveCountDiff !== 1) {
    return res.status(400).json({ error: "Invalid move: must change exactly one cell" });
  }

  // All validations passed, update board and switch turn
  game.board = board;
  game.turn = currentTurnSymbol === "X" ? "O" : "X";
  return res.sendStatus(200);
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
