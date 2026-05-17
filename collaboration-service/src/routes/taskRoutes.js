const express = require("express");
const router = express.Router({ mergeParams: true });

const verifyToken = require("../middleware/authMiddleware");
const {
  createTaskValidationRules,
  validate,
} = require("../middleware/validateTask");
const {
  createTask,
  getTasksByTeam,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// SECURITY: Import CSRF protection
const { csrfProtection } = require("../middleware/csrfMiddleware");

// SECURITY: Modifying endpoints (POST, PUT, DELETE) are protected with CSRF tokens
// Read-only endpoints (GET) do not require CSRF protection
router.post("/", verifyToken, csrfProtection, createTaskValidationRules, validate, createTask);
router.get("/", verifyToken, getTasksByTeam);
router.put("/:taskId", verifyToken, csrfProtection, updateTask);
router.delete("/:taskId", verifyToken, csrfProtection, deleteTask);

module.exports = router;