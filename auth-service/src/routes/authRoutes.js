const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require("../controllers/authController");
const {
  registerValidationRules,
  loginValidationRules,
  validate,
} = require("../middleware/validateAuth");
const verifyToken = require("../middleware/authMiddleware");

// SECURITY: Import CSRF protection
const { csrfProtection } = require("../middleware/csrfMiddleware");

// SECURITY: POST endpoints are protected with CSRF tokens
// Clients must include X-CSRF-Token header or _csrf form field with valid token
router.post("/register", csrfProtection, registerValidationRules, validate, registerUser);
router.post("/login", csrfProtection, loginValidationRules, validate, loginUser);

router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Protected profile accessed successfully",
    user: req.user,
  });
});

// CSRF token endpoint
router.get("/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;