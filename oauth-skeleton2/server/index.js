'use strict';

var express = require('express');
const app = express();
//const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
const http = require("http");
const path = require("path");

const { Server } = require("socket.io");

const port = process.env.PORT || 3001;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// Routes
const authentication = require("./routes/authentication");
const data = require("./routes/data");

// Express middlewares
app.use(bodyParser.json());
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, "build")));

app.use(express.static(__dirname + '/client/public'))
app.use(cors());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Register Routes
app.use("/v1/data", data);
app.use(authentication);

/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });

  return;
});

////////////// SOCKETS ////////////////

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
let users = [];

io.on("connection", (socket) => {
  // each socket automatically joins room identified by its own id
  console.log(`User Connected: ${socket.id}`);
  const user = {
    id: socket.id,
  };
  users.push(user);
  // emits all active users on server/every single connected client
  // io.emit("new user", users);

  // call when alert is selected
  // a socket can only be subscribed to one alert, but it can have multiple subscribers
  socket.on("subscribe_to_alert", (alert_data_arg) => {
    console.log(
      `Client ${socket.id} subscribed to alert #: ` + alert_data_arg.socketID
    );
    // join room of passed in alert's socketID
    socket.join(alert_data_arg.alertRoomName);
    // when a user subscribes to a specific alert, update GeoJson Circle rendered on map to be that of the
    // alert socketID they subscribed to
  });

  // call when alert has been triggered and relay message to all alert # subscribers
  socket.on("send_alert_trigger", (data) => {
    console.log(
      `Message all subscribers that alert ${data.sender} has been triggered!`
    );
    console.log("Alert Room Name: " + data.to);
    console.log("Alert Type: " + data.content);

    socket.to(data.to).emit("alert_triggered", {
      sender: data.sender,
      alertMessage: "Proximity Alert",
    });
  });

  socket.on("send_hide_alert", (data) => {
    console.log("Alert Room Name: " + data.to);
    socket.to(data.to).emit("hide_alert", {
      sender: data.sender,
    });
  });

  // broadcast to all users a new alert was created and update each user's alertMenuItems
  socket.on("new_alert_create", (data) => {
    console.log(
      `Message all subscribers that a new alert from user ${data.socketID} has been created!`
    );
    console.log(
      `user ${data.socketID} has the following alertRoomName: ${data.alertRoomName} `
    );
    socket.broadcast.emit("newAlertCreated", {
      socketID: data.socketID,
      alertRoomName: data.alertRoomName,
      lat: data.lat,
      lon: data.lon,
      radius: data.radius,
    });
  });

  // call when a client unsubscribes from an alert
  socket.on("unsubscribe", (data) => {
    socket.leave(data.socketID);
    // this event should remove any alertPanels and any active GeoJsonCircles that are rendered on a map
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

/////////////// SOCKETS //////////////

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

server.listen(3002, () => {
  console.log("SERVER RUNNING");
});