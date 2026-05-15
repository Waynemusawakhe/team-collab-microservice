require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 5000;

// SECURITY: Helmet middleware adds HTTP response headers to prevent common web vulnerabilities
// This protects against: clickjacking (X-Frame-Options), XSS (CSP), MIME sniffing, etc.
app.use(helmet());

// CORS: Allow requests from different origins (frontend on port 3000, other microservices)
app.use(cors());

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

app.use("/auth/login", loginLimiter);
app.use(generalLimiter);

app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    router: () => process.env.AUTH_SERVICE_URL,
    pathRewrite: (path) => `/auth${path}`,
  })
);

app.use(
  "/teams",
  createProxyMiddleware({
    target: process.env.COLLAB_SERVICE_URL,
    changeOrigin: true,
    router: () => process.env.COLLAB_SERVICE_URL,
    pathRewrite: (path) => `/teams${path}`,
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});