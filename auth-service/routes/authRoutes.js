const express = require("express");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const { body, validationResult } = require("express-validator");

const pool = require("../db");

const logger = require("../src/utils/logger");


const router = express.Router();


// ==============================
// REGISTER
// ==============================
router.post(

  "/register",

  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],

  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      logger.error("Validation failed during registration");

      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {

      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existing.rows.length > 0) {

        logger.error(`Registration attempt with existing email: ${email}`);

        return res.status(409).json({
          message: "Email already registered",
        });
      }

      const hashed = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
        [email, hashed]
      );

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        message: "User registered successfully",
        user: result.rows[0],
      });

    } catch (err) {

      console.error("Register error:", err.message);

      logger.error(`Register error: ${err.message}`);

      res.status(500).json({
        message: "Server error during registration",
      });
    }
  }
);


// ==============================
// LOGIN
// ==============================
router.post(

  "/login",

  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),

    body("password")
      .notEmpty()
      .withMessage("Password required"),
  ],

  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      logger.error("Validation failed during login");

      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {

      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      const user = result.rows[0];

      if (!user) {

        logger.error(`Failed login attempt for email: ${email}`);

        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const passwordMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordMatch) {

        logger.error(`Incorrect password attempt for email: ${email}`);

        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign(

        {
          userId: user.id,
          email: user.email,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "1h",
        }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        token,
        userId: user.id,
        email: user.email,
      });

    } catch (err) {

      console.error("Login error:", err.message);

      logger.error(`Login error: ${err.message}`);

      res.status(500).json({
        message: "Server error during login",
      });
    }
  }
);


// ==============================
// VERIFY TOKEN
// ==============================
router.get("/me", async (req, res) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {

    logger.error("Access attempt without token");

    return res.status(401).json({
      message: "No token provided",
    });
  }

  try {

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const result = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (!result.rows[0]) {

      logger.error(`User not found for ID: ${decoded.userId}`);

      return res.status(404).json({
        message: "User not found",
      });
    }

    logger.info(`User verified with token: ${decoded.email}`);

    res.json({
      user: result.rows[0],
    });

  } catch (err) {

    logger.error(`Token verification failed: ${err.message}`);

    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
});


module.exports = router;
