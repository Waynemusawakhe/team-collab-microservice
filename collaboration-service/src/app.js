require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const teamRoutes = require("./routes/teamRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 5002;

// ============================================
// Middleware Stack - Security & Processing
// ============================================

// SECURITY: Helmet - Adds HTTP response headers to protect against common web attacks
// Examples: X-Frame-Options (clickjacking), X-Content-Type-Options (MIME sniffing), CSP (XSS)
app.use(helmet());

// CORS: Allow requests from different domains (frontend, other microservices)
app.use(cors());

// JSON Parsing: Convert incoming request body to JavaScript object
app.use(express.json());

// HTTP Request Logging: Log every HTTP request (method, path, status) for monitoring
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Collaboration Service Running");
});

app.use("/teams", teamRoutes);
app.use("/teams/:teamId/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});