// ============================================
// Prometheus Metrics Setup for API Gateway
// ============================================

const client = require("prom-client");

// MONITORING: Register default metrics (CPU, memory, event loop lag)
// These metrics track Node.js runtime health and performance
client.collectDefaultMetrics();

// METRIC: Counter for total HTTP requests
// Increments by 1 for each request (labeled by method and path)
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests received",
  labelNames: ["method", "path", "status"],
});

// METRIC: Histogram for HTTP request duration
// Tracks response times in seconds (automatically buckets data)
// Helps identify slow endpoints
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // Time buckets in seconds
});

// METRIC: Gauge for active HTTP requests
// Shows how many requests are currently being processed
const httpRequestsInProgress = new client.Gauge({
  name: "http_requests_in_progress",
  help: "Number of HTTP requests currently being processed",
  labelNames: ["method", "path"],
});

// MONITORING MIDDLEWARE: Collects metrics for each HTTP request
// Records: request duration, status code, method, path
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const path = req.route?.path || req.path;

  // Track: increment in-progress counter
  httpRequestsInProgress.labels(method, path).inc();

  // Track: capture response when request ends
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const status = res.statusCode;

    // Record metrics
    httpRequestsTotal.labels(method, path, status).inc();
    httpRequestDuration.labels(method, path, status).observe(duration);
    httpRequestsInProgress.labels(method, path).dec();
  });

  next();
};

// ENDPOINT: /metrics - Returns all collected metrics in Prometheus format
// This endpoint is scrapped by Prometheus server periodically
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
};
