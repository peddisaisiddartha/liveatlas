const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = [];

io.on("connection", socket => {
  console.log("User connected:", socket.id);
  users.push(socket.id);

  if (users.length === 2) {
    io.emit("ready");
  }

  socket.on("offer", offer => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", answer => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice", candidate => {
    socket.broadcast.emit("ice", candidate);
  });

  socket.on("disconnect", () => {
    users = users.filter(id => id !== socket.id);
    console.log("User disconnected:", socket.id);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("LiveAtlas server running");
});
