require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const crypto = require("crypto");
const {
  monitoringMiddleware,
  metricsText,
} = require("./monitoring");
const logger = require("./logger");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(cors({
  origin: FRONTEND_URL,
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
}));
app.use(morgan(
  ":method :url :status :response-time ms - :res[content-length] :req[x-request-id]",
  {
    stream: {
      write: (message) => logger.info(`HTTP ${message.trim()}`),
    },
  }
));
app.use(monitoringMiddleware);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests from this IP. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/", (req, res) => {
  logger.audit("GATEWAY_ROOT_ACCESSED", {
    requestId: req.requestId,
    ip: req.ip,
  });

  res.send("API Gateway Running");
});

app.get("/health", (req, res) => {
  res.json({
    service: "api-gateway",
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get("/metrics", (req, res) => {
  res.type("text/plain").send(metricsText("api-gateway"));
});

app.use("/auth/login", loginLimiter);
app.use(generalLimiter);

// Auth Service proxy — /auth/* → auth-service /auth/*
app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/auth/" },
    on: {
      error: (err, req, res) => {
        console.error("Auth proxy error:", err.message);
        logger.error("AUTH_PROXY_ERROR", {
          message: err.message,
          requestId: req.requestId,
        });
        res.status(502).json({ message: "Auth service unavailable" });
      },
    },
  })
);

// Collaboration Service proxy — /teams/* → collab-service /teams/*
app.use(
  "/teams",
  createProxyMiddleware({
    target: process.env.COLLAB_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/teams/" },
    on: {
      error: (err, req, res) => {
        console.error("Collab proxy error:", err.message);
        logger.error("COLLAB_PROXY_ERROR", {
          message: err.message,
          requestId: req.requestId,
        });
        res.status(502).json({ message: "Collaboration service unavailable" });
      },
    },
  })
);

app.listen(PORT, () => {
  logger.audit("GATEWAY_STARTED", {
    port: PORT,
    frontendUrl: FRONTEND_URL,
  });

  console.log(`API Gateway running on port ${PORT}`);
});
