const express = require("express");
const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("ROOT WORKING");
});

app.get("/health", (req, res) => {
  res.send("HEALTH WORKING");
});

app.listen(3000, () => {
  console.log("DEBUG SERVER RUNNING ON 3000");
});