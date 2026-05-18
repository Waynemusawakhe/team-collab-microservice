const startedAt = Date.now();

const metrics = {
  requestsTotal: 0,
  responsesByStatus: {},
};

function monitoringMiddleware(req, res, next) {
  metrics.requestsTotal += 1;

  res.on("finish", () => {
    const status = String(res.statusCode);
    metrics.responsesByStatus[status] =
      (metrics.responsesByStatus[status] || 0) + 1;
  });

  next();
}

function metricsText(serviceName) {
  const lines = [
    "# HELP app_uptime_seconds Service uptime in seconds.",
    "# TYPE app_uptime_seconds gauge",
    `app_uptime_seconds{service="${serviceName}"} ${Math.floor((Date.now() - startedAt) / 1000)}`,
    "# HELP app_requests_total Total HTTP requests received.",
    "# TYPE app_requests_total counter",
    `app_requests_total{service="${serviceName}"} ${metrics.requestsTotal}`,
    "# HELP app_responses_total Total HTTP responses by status code.",
    "# TYPE app_responses_total counter",
  ];

  Object.entries(metrics.responsesByStatus).forEach(([status, count]) => {
    lines.push(
      `app_responses_total{service="${serviceName}",status="${status}"} ${count}`
    );
  });

  return `${lines.join("\n")}\n`;
}

module.exports = {
  monitoringMiddleware,
  metricsText,
};
