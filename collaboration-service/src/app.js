require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// MONITORING: Import Prometheus metrics specific to collaboration service
const { metricsMiddleware, metricsEndpoint } = require("./utils/metrics");

// SECURITY: Import CSRF protection middleware
const { sessionConfig, csrfProtection, csrfErrorHandler } = require("./middleware/csrfMiddleware");

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

// CORS: Allow requests from frontend (port 3000) and allow cookies for CSRF session tokens
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// SECURITY: Session configuration (required for CSRF token storage)
// Stores CSRF tokens server-side, preventing token theft via XSS
app.use(sessionConfig);

// MONITORING: Prometheus metrics collection (tracks teams/tasks operations)
// Collects: team CRUD metrics, task status changes, authorization failures
app.use(metricsMiddleware);

// JSON Parsing: Convert incoming request body to JavaScript object
app.use(express.json());

// HTTP Request Logging: Log every HTTP request (method, path, status) for monitoring
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Collaboration Service Running");
});

// SECURITY: CSRF token endpoint - Frontend calls this to get a CSRF token before making POST/PUT/DELETE requests
// The token is stored in the session cookie and validated on protected team/task routes below.
app.get("/teams/csrf-token", (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
    message: "CSRF token generated. Include in X-CSRF-Token header for POST/PUT/DELETE requests",
  });
});

// MONITORING: Metrics endpoint - Prometheus server scrapes this periodically
// Metrics include: team/task operations, authorization checks, response times, active teams count
app.get("/metrics", metricsEndpoint);

app.use("/teams", teamRoutes);
app.use("/teams/:teamId/tasks", taskRoutes);

// SECURITY: CSRF error handler must be registered after routes so it can catch validation failures
app.use(csrfErrorHandler);

app.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});