const express = require("express");
const router = express.Router();
const authenticationController = require("../controllers/authentication");

//router.get("/", authenticationController.get);
router.get("/callback", authenticationController.callback);
router.get("/getCredentials", authenticationController.getCredentials);
router.get("/loggedIn", authenticationController.loggedIn);
router.get("/logout", authenticationController.logout);


module.exports = router