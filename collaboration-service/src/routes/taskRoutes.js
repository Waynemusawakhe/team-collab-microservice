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

router.post("/", verifyToken, createTaskValidationRules, validate, createTask);
router.get("/", verifyToken, getTasksByTeam);
router.put("/:taskId", verifyToken, updateTask);
router.delete("/:taskId", verifyToken, deleteTask);

module.exports = router;