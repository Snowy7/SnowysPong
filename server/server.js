const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const { gameLoop, handleMovement, initGame } = require("./game");

const { makeId } = require("./utils");

app.set("port", 3000);
app.use('/', express.static(path.join(__dirname, '../frontend')));
//app.use("/frontend", express.static("../frontend"));

app.get("/", function (request, response) {
  response.sendFile(path.join(__dirname, "/index.html"));
});

// Starts the server.
server.listen(process.env.PORT || 3000, function () {
  console.log("Starting server on port 3000");
});

const FRAME_RATE = 60;
const state = {};
const clientRooms = {};
const clientNames = {};

io.on("connection", (client) => {
  client.on("movement", (data) =>
    handleMovement(data, state, client, clientRooms)
  );
  client.on("newGame", (data) => handleNewGame(data, client));
  client.on("joinGame", (data) => handleJoinGame(data, client));

  client.on("disconnect", (data) => {
    delete clientNames[client.id];
  });
});

function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomName]);

    if (!winner) {
      emitGameState(roomName, state[roomName]);
    } else {
      emitGameOver(roomName, winner);
      state[roomName] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(roomName, state) {
  io.sockets.in(roomName).emit("gameState", JSON.stringify(state));
}

function emitGameOver(roomName, winner) {
  io.sockets.in(roomName).emit("gameOver", JSON.stringify({ winner }));
}

function handleNewGame(data, client) {
  let roomName = makeId(5);
  clientRooms[client.id] = roomName;
  clientNames[client.id] = data.playerName;

  client.emit("gameCode", roomName);
  state[roomName] = initGame();

  client.join(roomName);
  client.number = 1;
  client.emit("init", 1);
}

function handleJoinGame(data, client) {
  const roomName = data.code;
  if (io.sockets.adapter.rooms.get(roomName) === undefined) {
    client.emit("unknownGame");
    return;
  }
  const room = io.sockets.adapter.rooms.get(roomName);

  let numClients = 0;

  if (room.size) {
    numClients = room.size;
  }

  if (numClients == 0) {
    client.emit("unknownGame");
    return;
  } else if (numClients > 1) {
    client.emit("tooManyPlayers");
    return;
  }

  clientRooms[client.id] = roomName;
  clientNames[client.id] = data.playerName;

  client.join(roomName);
  client.number = 2;
  client.emit("init", 2);

  const roomPlayerNames = [];
  Array.from(room).forEach((clientId) => {
    roomPlayerNames.push(clientNames[clientId]);
  });

  io.sockets.in(roomName).emit("playerNames", JSON.stringify(roomPlayerNames));

  startGameInterval(roomName);
}
