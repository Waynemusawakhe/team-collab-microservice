const logger = require("./src/utils/logger");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const crypto = require("crypto");
const {
  monitoringMiddleware,
  metricsText,
} = require("./src/utils/monitoring");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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

app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

app.get("/health", (req, res) => {
  res.json({
    service: "auth-service",
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get("/metrics", (req, res) => {
  res.type("text/plain").send(metricsText("auth-service"));
});

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);

});
