'use strict';

var express = require('express');
const app = require('express')();
var cookieParser = require('cookie-parser');
var cors = require('cors')
const bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');

const port = process.env.PORT || 3001;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// Routes
const authentication = require("./routes/authentication");
const data = require("./routes/data");

// Express middlewares
app.use(bodyParser.json());
app.use(cookieParser());
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


app.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
