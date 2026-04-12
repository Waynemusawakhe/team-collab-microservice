const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const {
  createTeamValidationRules,
  validate,
} = require("../middleware/validateTeam");
const { createTeam, getMyTeams } = require("../controllers/teamController");

router.post("/", verifyToken, createTeamValidationRules, validate, createTeam);
router.get("/", verifyToken, getMyTeams);

module.exports = router;