const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require("../controllers/authController");
const {
  registerValidationRules,
  loginValidationRules,
  validate,
} = require("../middleware/validateAuth");
const verifyToken = require("../middleware/authMiddleware");

router.post("/register", registerValidationRules, validate, registerUser);
router.post("/login", loginValidationRules, validate, loginUser);

router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Protected profile accessed successfully",
    user: req.user,
  });
});

module.exports = router;