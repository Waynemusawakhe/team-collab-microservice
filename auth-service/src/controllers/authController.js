const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const users = require("../data/users");
// MONITORING: Import metrics for auth security tracking
const {
  failedLoginAttempts,
  successfulRegistrations,
  activeJWTTokens,
} = require("../utils/metrics");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role: "user",
    };

    users.push(newUser);

    // MONITORING: Track successful registration for user growth metrics
    successfulRegistrations.inc();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find((user) => user.email === email);

    if (!user) {
      // MONITORING: Track failed login due to invalid email (security incident)
      failedLoginAttempts.labels("invalid_email").inc();
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      // MONITORING: Track failed login due to wrong password (brute force attempt)
      failedLoginAttempts.labels("invalid_password").inc();
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // MONITORING: Increment active token count (tracks estimated active users)
    activeJWTTokens.inc();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};