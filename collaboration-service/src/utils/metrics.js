// ============================================
// Prometheus Metrics Setup for Collaboration Service
// ============================================

const client = require("prom-client");

// MONITORING: Register default metrics (CPU, memory, event loop lag)
// Provides runtime health visibility for the collaboration service
client.collectDefaultMetrics();

// METRIC: Counter for total collaboration API requests
// Increments by 1 for each request to teams/tasks endpoints
const collaborationRequestsTotal = new client.Counter({
  name: "collaboration_requests_total",
  help: "Total number of collaboration API requests (teams, tasks)",
  labelNames: ["resource", "operation", "status"], // e.g., resource='teams', operation='GET'
});

// METRIC: Histogram for collaboration request duration
// Measures performance of team/task operations
const collaborationRequestDuration = new client.Histogram({
  name: "collaboration_request_duration_seconds",
  help: "Duration of collaboration API requests in seconds",
  labelNames: ["resource", "operation", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// METRIC: Gauge for active teams in system
// Real-time count of teams created and still active
const activeTeamsCount = new client.Gauge({
  name: "active_teams_count",
  help: "Total number of active teams",
});

// METRIC: Gauge for total tasks count
// Real-time count of all tasks (across all statuses)
const totalTasksCount = new client.Gauge({
  name: "total_tasks_count",
  help: "Total number of tasks in all teams",
});

// METRIC: Counter for task status changes
// Tracks workflow: how many tasks moved through todo -> in_progress -> done
const taskStatusChanges = new client.Counter({
  name: "task_status_changes_total",
  help: "Total number of task status changes",
  labelNames: ["from_status", "to_status"], // e.g., from_status='todo', to_status='in_progress'
});

// METRIC: Counter for authorization failures
// Security metric: tracks denied access attempts
const authorizationFailures = new client.Counter({
  name: "authorization_failures_total",
  help: "Total number of authorization failures (access denied)",
  labelNames: ["resource", "reason"], // e.g., reason='not_team_member', 'insufficient_role'
});

// MONITORING MIDDLEWARE: Collects metrics for each HTTP request
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const resource = req.path.includes("teams") ? "teams" : "tasks";
  const operation = req.method;

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const status = res.statusCode;

    collaborationRequestsTotal.labels(resource, operation, status).inc();
    collaborationRequestDuration.labels(resource, operation, status).observe(duration);
  });

  next();
};

// ENDPOINT: /metrics - Returns all collaboration metrics in Prometheus format
// This endpoint is scraped by Prometheus server to collect data
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
  activeTeamsCount,
  totalTasksCount,
  taskStatusChanges,
  authorizationFailures,
};
