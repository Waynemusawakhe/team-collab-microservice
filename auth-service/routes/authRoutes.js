const express = require("express");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const { body, validationResult } = require("express-validator");

const pool = require("../db");

const logger = require("../src/utils/logger");
const loginSecurity = require("../src/utils/loginSecurity");


const router = express.Router();

function authenticateToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {

    logger.error("Access attempt without token");

    return res.status(401).json({
      message: "No token provided",
    });
  }

  try {

    const token = authHeader.split(" ")[1];

    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    next();

  } catch (err) {

    logger.error(`Token verification failed: ${err.message}`);

    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}


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
      logger.audit("AUTH_REGISTER_VALIDATION_FAILED", {
        ip: req.ip,
        requestId: req.requestId,
      });

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
        logger.audit("AUTH_REGISTER_DUPLICATE_EMAIL", {
          email,
          ip: req.ip,
          requestId: req.requestId,
        });

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
      logger.audit("AUTH_REGISTER_SUCCESS", {
        userId: result.rows[0].id,
        email,
        ip: req.ip,
        requestId: req.requestId,
      });

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
      logger.audit("AUTH_LOGIN_VALIDATION_FAILED", {
        ip: req.ip,
        requestId: req.requestId,
      });

      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    const ip = req.ip;

    if (loginSecurity.isLocked(email, ip)) {

      const retryAfter = loginSecurity.lockRemainingSeconds(email, ip);

      logger.error(`Locked login attempt for email: ${email}`);
      logger.audit("AUTH_LOGIN_LOCKED", {
        email,
        ip,
        retryAfter,
        requestId: req.requestId,
      });

      return res.status(429).json({
        message: `Account temporarily locked. Try again in ${retryAfter} seconds.`,
      });
    }

    try {

      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      const user = result.rows[0];

      if (!user) {

        logger.error(`Failed login attempt for email: ${email}`);
        const failure = loginSecurity.recordFailure(email, ip);
        logger.audit("AUTH_LOGIN_FAILED_UNKNOWN_EMAIL", {
          email,
          ip,
          failureCount: failure.count,
          locked: failure.locked,
          requestId: req.requestId,
        });

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
        const failure = loginSecurity.recordFailure(email, ip);
        logger.audit("AUTH_LOGIN_FAILED_BAD_PASSWORD", {
          userId: user.id,
          email,
          ip,
          failureCount: failure.count,
          locked: failure.locked,
          requestId: req.requestId,
        });

        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      loginSecurity.recordSuccess(email, ip);

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
      logger.audit("AUTH_LOGIN_SUCCESS", {
        userId: user.id,
        email,
        ip,
        requestId: req.requestId,
      });

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
router.get("/me", authenticateToken, async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (!result.rows[0]) {

      logger.error(`User not found for ID: ${req.user.userId}`);

      return res.status(404).json({
        message: "User not found",
      });
    }

    logger.info(`User verified with token: ${req.user.email}`);
    logger.audit("AUTH_TOKEN_VERIFIED", {
      userId: req.user.userId,
      email: req.user.email,
      requestId: req.requestId,
    });

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


// ==============================
// LIST USERS FOR TEAM ASSIGNMENT
// ==============================
router.get("/users", authenticateToken, async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT id, email, created_at FROM users ORDER BY email ASC"
    );

    logger.info(`User ${req.user.userId} fetched user directory`);

    res.json({
      users: result.rows,
    });

  } catch (err) {

    console.error("Fetch users error:", err.message);

    logger.error(`Fetch users error: ${err.message}`);

    res.status(500).json({
      message: "Server error fetching users",
    });
  }
});


module.exports = router;
