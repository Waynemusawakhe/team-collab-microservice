require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const crypto = require("crypto");

const logger = require("./src/utils/logger");
const pool = require("./db");
const {
  monitoringMiddleware,
  metricsText,
} = require("./src/utils/monitoring");

const teamRoutes = require("./routes/teamRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

const PORT = process.env.PORT || 5002;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";


async function runDatabaseMigrations() {

  await pool.query(`
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS assigned_to UUID
  `);

  await pool.query(`
    UPDATE tasks
    SET assigned_to = creator_id
    WHERE assigned_to IS NULL
  `);

  await pool.query(`
    ALTER TABLE tasks
      ALTER COLUMN assigned_to SET NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
      ON tasks(assigned_to)
  `);
}


// Middleware
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

app.use(cors({
  origin: FRONTEND_URL,
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
}));

app.use(express.json());

app.use(morgan(
  ":method :url :status :response-time ms - :res[content-length] :req[x-request-id]",
  {
    stream: {
      write: (message) => logger.info(`HTTP ${message.trim()}`),
    },
  }
));

app.use(monitoringMiddleware);


// Root route
app.get("/", (req, res) => {

  logger.info("Collaboration Service Root Route Accessed");

  res.send("Collaboration Service Running");
});


app.get("/health", (req, res) => {

  res.json({
    service: "collaboration-service",
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});


app.get("/metrics", (req, res) => {

  res.type("text/plain").send(metricsText("collaboration-service"));
});


// Routes
app.use("/teams", teamRoutes);

app.use("/teams/:teamId/tasks", taskRoutes);


// Start server
runDatabaseMigrations()
  .then(() => {

    app.listen(PORT, () => {

      logger.info(`Collaboration Service running on port ${PORT}`);

      console.log(`Collaboration Service running on port ${PORT}`);
    });
  })
  .catch((err) => {

    logger.error(`Collaboration Service migration failed: ${err.message}`);

    console.error("Collaboration Service migration failed:", err.message);

    process.exit(1);
  });
