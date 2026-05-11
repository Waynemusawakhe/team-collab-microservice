const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const authenticate = require("../middleware/authenticate");

// mergeParams: true lets us access :teamId from the parent route
const router = express.Router({ mergeParams: true });

// Helper: check user is a member of the team
async function requireMember(teamId, userId, res) {
  const check = await pool.query(
    "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
    [teamId, userId]
  );
  if (check.rows.length === 0) {
    res.status(403).json({ message: "Access denied: not a member of this team" });
    return null;
  }
  return check.rows[0].role;
}

// GET /teams/:teamId/tasks
router.get("/", authenticate, async (req, res) => {
  const { teamId } = req.params;

  try {
    const role = await requireMember(teamId, req.user.userId, res);
    if (!role) return;

    const result = await pool.query(
      `SELECT * FROM tasks WHERE team_id = $1 ORDER BY created_at DESC`,
      [teamId]
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error("Fetch tasks error:", err.message);
    res.status(500).json({ message: "Server error fetching tasks" });
  }
});

// POST /teams/:teamId/tasks
router.post(
  "/",
  authenticate,
  [
    body("title").notEmpty().withMessage("Task title is required"),
    body("status")
      .optional()
      .isIn(["todo", "in_progress", "done"])
      .withMessage("Status must be todo, in_progress, or done"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { teamId } = req.params;
    const { title, description, status = "todo" } = req.body;

    try {
      const role = await requireMember(teamId, req.user.userId, res);
      if (!role) return;

      const result = await pool.query(
        `INSERT INTO tasks (team_id, title, description, status, creator_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [teamId, title, description || null, status, req.user.userId]
      );

      res.status(201).json({ message: "Task created", task: result.rows[0] });
    } catch (err) {
      console.error("Create task error:", err.message);
      res.status(500).json({ message: "Server error creating task" });
    }
  }
);

// PATCH /teams/:teamId/tasks/:taskId — creator or admin can update
router.patch(
  "/:taskId",
  authenticate,
  [
    body("status")
      .optional()
      .isIn(["todo", "in_progress", "done"])
      .withMessage("Status must be todo, in_progress, or done"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { teamId, taskId } = req.params;
    const { title, description, status } = req.body;

    try {
      const role = await requireMember(teamId, req.user.userId, res);
      if (!role) return;

      // Fetch the task first
      const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1 AND team_id = $2", [
        taskId,
        teamId,
      ]);
      const task = taskResult.rows[0];

      if (!task) return res.status(404).json({ message: "Task not found" });

      // Only creator or admin can edit
      const isCreator = task.creator_id === req.user.userId;
      const isAdmin = role === "admin";
      if (!isCreator && !isAdmin) {
        return res.status(403).json({ message: "Only the task creator or an admin can update this task" });
      }

      const result = await pool.query(
        `UPDATE tasks SET
           title       = COALESCE($1, title),
           description = COALESCE($2, description),
           status      = COALESCE($3, status)
         WHERE id = $4
         RETURNING *`,
        [title || null, description || null, status || null, taskId]
      );

      res.json({ message: "Task updated", task: result.rows[0] });
    } catch (err) {
      console.error("Update task error:", err.message);
      res.status(500).json({ message: "Server error updating task" });
    }
  }
);

// DELETE /teams/:teamId/tasks/:taskId — creator or admin can delete
router.delete("/:taskId", authenticate, async (req, res) => {
  const { teamId, taskId } = req.params;

  try {
    const role = await requireMember(teamId, req.user.userId, res);
    if (!role) return;

    const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1 AND team_id = $2", [
      taskId,
      teamId,
    ]);
    const task = taskResult.rows[0];

    if (!task) return res.status(404).json({ message: "Task not found" });

    const isCreator = task.creator_id === req.user.userId;
    const isAdmin = role === "admin";
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Only the task creator or an admin can delete this task" });
    }

    await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err.message);
    res.status(500).json({ message: "Server error deleting task" });
  }
});

module.exports = router;
