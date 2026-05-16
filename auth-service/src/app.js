require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// MONITORING: Import Prometheus metrics specific to auth service
const { metricsMiddleware, metricsEndpoint } = require("./utils/metrics");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// SECURITY: Helmet - HTTP response headers that prevent browser-based attacks
// Protection includes: prevents clicking through (X-Frame-Options), blocks inline scripts (CSP),
// prevents MIME type guessing (X-Content-Type-Options), and forces HTTPS (HSTS)
app.use(helmet());

// CORS: Allow cross-origin requests from frontend (port 3000) and other services
app.use(cors());

// MONITORING: Prometheus metrics collection (tracks login/register performance)
// Collects: request count, duration, status codes, failed login attempts
app.use(metricsMiddleware);

// JSON Parser: Automatically convert incoming request body from JSON string to JavaScript object
app.use(express.json());

// LOGGING: Log every HTTP request (GET, POST, etc.) for debugging and audit purposes
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

// MONITORING: Metrics endpoint - Prometheus scrapes this for metrics
// Metrics include: login attempts, registrations, token validation, response times
app.get("/metrics", metricsEndpoint);

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});