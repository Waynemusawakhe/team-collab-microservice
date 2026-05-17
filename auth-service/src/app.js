require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// MONITORING: Import Prometheus metrics specific to auth service
const { metricsMiddleware, metricsEndpoint } = require("./utils/metrics");

// SECURITY: Import CSRF protection middleware
const { sessionConfig, csrfProtection, csrfErrorHandler } = require("./middleware/csrfMiddleware");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// SECURITY: Helmet - HTTP response headers that prevent browser-based attacks
// Protection includes: prevents clicking through (X-Frame-Options), blocks inline scripts (CSP),
// prevents MIME type guessing (X-Content-Type-Options), and forces HTTPS (HSTS)
app.use(helmet());

// CORS: Allow cross-origin requests from frontend (port 3000) and allow cookies for CSRF session tokens
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// SECURITY: Session configuration (required for CSRF token storage)
// Stores CSRF tokens server-side, preventing token theft via XSS
app.use(sessionConfig);

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

// SECURITY: CSRF token endpoint - Frontend calls this to get a CSRF token before making POST/PUT/DELETE requests
// The token is stored in the session cookie and validated on the protected auth routes below.
app.get("/auth/csrf-token", csrfProtection, (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
    message: "CSRF token generated. Include in X-CSRF-Token header for POST/PUT/DELETE requests",
  });
});

app.use("/auth", authRoutes);

// SECURITY: CSRF error handler must be registered after routes so it can catch validation failures
app.use(csrfErrorHandler);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});