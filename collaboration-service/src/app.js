require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// MONITORING: Import Prometheus metrics specific to collaboration service
const { metricsMiddleware, metricsEndpoint } = require("./utils/metrics");

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

// MONITORING: Metrics endpoint - Prometheus server scrapes this periodically
// Metrics include: team/task operations, authorization checks, response times, active teams count
app.get("/metrics", metricsEndpoint);

app.use("/teams", teamRoutes);
app.use("/teams/:teamId/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});