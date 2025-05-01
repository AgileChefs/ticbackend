const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

let players = [];
let board = Array(9).fill(null);
let turn = "X";
let winner = null;
let winningLine = [];
let chatMessages = []; // Store chat messages

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

function broadcastChat(message) {
  const data = JSON.stringify({
    type: "chat",
    message
  });
  players.forEach((p) => p.send(data));
}

server.on("connection", (ws) => {
  if (players.length >= 2) {
    ws.send(JSON.stringify({ type: "full", message: "Game is full" }));
    ws.close(); // Only allow 2 players
    return;
  }

  const symbol = players.length === 0 ? "X" : "O";
  players.push(ws);
  ws.send(JSON.stringify({ type: "init", symbol }));
  
  // Send chat history to new player
  chatMessages.forEach(msg => {
    ws.send(JSON.stringify({ type: "chat", message: msg }));
  });

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
    
    // Handle chat messages
    if (data.type === "chat") {
      const playerIndex = players.indexOf(ws);
      const playerSymbol = playerIndex === 0 ? "X" : "O";
      const chatMessage = {
        text: data.text,
        sender: playerSymbol,
        timestamp: new Date().toISOString()
      };
      
      // Store message in history (limit to last 50 messages)
      chatMessages.push(chatMessage);
      if (chatMessages.length > 50) {
        chatMessages.shift();
      }
      
      // Broadcast to all players
      broadcastChat(chatMessage);
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