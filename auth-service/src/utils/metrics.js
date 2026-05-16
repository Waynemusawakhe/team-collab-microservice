// ============================================
// Prometheus Metrics Setup for Auth Service
// ============================================

const client = require("prom-client");

// MONITORING: Register default metrics (CPU, memory, event loop lag, GC)
// Provides visibility into Node.js runtime health and performance
client.collectDefaultMetrics();

// METRIC: Counter for total authentication requests
// Increments by 1 for each auth request (labeled by endpoint and status)
const authRequestsTotal = new client.Counter({
  name: "auth_requests_total",
  help: "Total number of authentication requests (login, register, verify)",
  labelNames: ["endpoint", "status"],
});

// METRIC: Histogram for authentication request duration
// Measures how long auth operations take (in seconds)
// Helps identify performance bottlenecks in auth logic
const authRequestDuration = new client.Histogram({
  name: "auth_request_duration_seconds",
  help: "Duration of authentication requests in seconds",
  labelNames: ["endpoint", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// METRIC: Counter for failed login attempts
// Tracks security incidents: how many failed logins (brute force detection)
const failedLoginAttempts = new client.Counter({
  name: "failed_login_attempts_total",
  help: "Total number of failed login attempts",
  labelNames: ["reason"], // e.g., 'invalid_email', 'wrong_password'
});

// METRIC: Counter for successful registrations
// Tracks user growth and account creation rates
const successfulRegistrations = new client.Counter({
  name: "successful_registrations_total",
  help: "Total number of successful user registrations",
});

// METRIC: Gauge for active JWT tokens
// Shows estimate of authenticated users currently using the system
const activeJWTTokens = new client.Gauge({
  name: "active_jwt_tokens",
  help: "Estimated number of active JWT tokens in use",
});

// MONITORING MIDDLEWARE: Collects metrics for each HTTP request to auth service
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const endpoint = req.route?.path || req.path;

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const status = res.statusCode;

    authRequestsTotal.labels(endpoint, status).inc();
    authRequestDuration.labels(endpoint, status).observe(duration);
  });

  next();
};

// ENDPOINT: /metrics - Returns all authentication metrics in Prometheus format
// Prometheus server periodically scrapes this endpoint
const metricsEndpoint = async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  try {
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end("Error generating metrics");
  }
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  authRequestsTotal,
  failedLoginAttempts,
  successfulRegistrations,
  activeJWTTokens,
};
