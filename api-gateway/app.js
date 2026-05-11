require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan("dev"));

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
  res.send("API Gateway Running");
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
        res.status(502).json({ message: "Collaboration service unavailable" });
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
