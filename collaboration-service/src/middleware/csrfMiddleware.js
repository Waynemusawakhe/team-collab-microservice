const session = require("express-session");
const csrf = require("csurf");

// SECURITY: Session configuration for CSRF token storage
// Tokens must be stored server-side (in session or cookie) for validation
const sessionConfig = session({
  secret: process.env.SESSION_SECRET || "csrf-session-secret-change-in-production",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    sameSite: "strict", // CSRF protection: prevent cross-site cookie sending
  },
});

// SECURITY: CSRF middleware configuration
// Validates CSRF tokens from X-CSRF-Token header or _csrf form field
const csrfProtection = csrf({ cookie: false }); // Uses session instead of cookies

// SECURITY: Error handler for CSRF token mismatches
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    // CSRF token was invalid or missing
    res.status(403).json({
      message: "CSRF token validation failed. Request rejected.",
      error: "Invalid or missing CSRF token",
    });
  } else {
    next(err);
  }
};

module.exports = {
  sessionConfig,
  csrfProtection,
  csrfErrorHandler,
};
