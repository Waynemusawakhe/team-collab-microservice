require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

// MONITORING: Import Prometheus metrics
const { metricsMiddleware, metricsEndpoint } = require("./utils/metrics");

const app = express();
const PORT = process.env.PORT || 5000;

// SECURITY: Session configuration and CSRF token storage
// CSRF validation requires a server-side session or cookie store
const { sessionConfig, csrfProtection, csrfErrorHandler } = require("./middleware/csrfMiddleware");

// SECURITY: Helmet middleware adds HTTP response headers to prevent common web vulnerabilities
// This protects against: clickjacking (X-Frame-Options), XSS (CSP), MIME sniffing, etc.
app.use(helmet());

// CORS: Allow requests from frontend (port 3000) and allow browser cookies for CSRF/session tokens
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// SECURITY: Session configuration (required for CSRF token storage)
app.use(sessionConfig);

// MONITORING: Prometheus metrics collection middleware (must be early in chain)
// Tracks: request count, duration, status codes for all endpoints
app.use(metricsMiddleware);

// LOGGING: Log all HTTP requests (method, path, response time) for debugging and monitoring
app.use(morgan("dev"));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many requests from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/", (req, res) => {
  res.send("API Gateway Running");
});

// MONITORING: Metrics endpoint - returns Prometheus metrics in text format
app.get("/metrics", metricsEndpoint);

// SECURITY: CSRF token endpoint for clients to request a valid token
// The returned token must be included in X-CSRF-Token for protected requests
app.get("/csrf-token", (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
    message: "CSRF token generated. Include in X-CSRF-Token header for state-changing requests",
  });
});

app.use("/auth/login", loginLimiter);
app.use(generalLimiter);
app.use(csrfErrorHandler);

app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    router: () => process.env.AUTH_SERVICE_URL,
  })
);

app.use(
  "/teams",
  createProxyMiddleware({
    target: process.env.COLLAB_SERVICE_URL,
    changeOrigin: true,
    router: () => process.env.COLLAB_SERVICE_URL,
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});