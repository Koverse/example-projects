const express = require("express");
const router = express.Router();
const dataController = require("../controllers/data");

// Get all data
router.get("/getData", dataController.getData);


module.exports = router;