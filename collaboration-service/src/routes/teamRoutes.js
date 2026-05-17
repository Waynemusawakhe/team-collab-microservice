const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const {
  createTeamValidationRules,
  validate,
} = require("../middleware/validateTeam");
const { createTeam, getMyTeams } = require("../controllers/teamController");

// SECURITY: Import CSRF protection
const { csrfProtection } = require("../middleware/csrfMiddleware");

// SECURITY: POST endpoints are protected with CSRF tokens
// Clients must include X-CSRF-Token header or _csrf form field with valid token
router.post("/", verifyToken, csrfProtection, createTeamValidationRules, validate, createTeam);
router.get("/", verifyToken, getMyTeams);

module.exports = router;