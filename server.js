const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];

io.on("connection", socket => {
  users.push(socket.id);
  console.log("User connected:", socket.id);

  // assign role
  socket.emit("role", users.length === 1 ? "caller" : "receiver");

  // notify when both users are present
  if (users.length === 2) {
    io.emit("ready");
  }

  socket.on("offer", data => socket.broadcast.emit("offer", data));
  socket.on("answer", data => socket.broadcast.emit("answer", data));
  socket.on("ice", data => socket.broadcast.emit("ice", data));

  socket.on("disconnect", () => {
    users = users.filter(id => id !== socket.id);
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
