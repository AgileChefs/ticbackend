const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

let players = [];
let board = Array(9).fill(null);
let turn = "X";
let winner = null;
let winningLine = [];

const winningCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner() {
  for (const [a, b, c] of winningCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (!board.includes(null)) return { winner: "Draw", line: [] };
  return { winner: null, line: [] };
}

function broadcastUpdate() {
  const data = JSON.stringify({
    type: "update",
    board,
    turn,
    winner,
    winningLine,
  });
  players.forEach((p) => p.send(data));
}

server.on("connection", (ws) => {
  if (players.length >= 2) {
    ws.close(); // Only allow 2 players
    return;
  }

  const symbol = players.length === 0 ? "X" : "O";
  players.push(ws);
  ws.send(JSON.stringify({ type: "init", symbol }));

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "move" && !winner) {
      const index = data.index;
      if (board[index] === null) {
        const playerIndex = players.indexOf(ws);
        const playerSymbol = playerIndex === 0 ? "X" : "O";
        if (playerSymbol === turn) {
          board[index] = turn;
          const result = checkWinner();
          winner = result.winner;
          winningLine = result.line;
          turn = turn === "X" ? "O" : "X";
          broadcastUpdate();
        }
      }
    }

    if (data.type === "reset" && winner !== null) {
      board = Array(9).fill(null);
      turn = "X";
      winner = null;
      winningLine = [];
      players.forEach((p) => p.send(JSON.stringify({ type: "reset" })));
    }
  });

  ws.on("close", () => {
    players = players.filter((p) => p !== ws);
    board = Array(9).fill(null);
    turn = "X";
    winner = null;
    winningLine = [];
  });
});
