require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// SECURITY: Helmet - HTTP response headers that prevent browser-based attacks
// Protection includes: prevents clicking through (X-Frame-Options), blocks inline scripts (CSP),
// prevents MIME type guessing (X-Content-Type-Options), and forces HTTPS (HSTS)
app.use(helmet());

// CORS: Allow cross-origin requests from frontend (port 3000) and other services
app.use(cors());

// JSON Parser: Automatically convert incoming request body from JSON string to JavaScript object
app.use(express.json());

// LOGGING: Log every HTTP request (GET, POST, etc.) for debugging and audit purposes
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});