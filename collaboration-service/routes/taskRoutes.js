const express = require("express");

const { body, validationResult } = require("express-validator");

const pool = require("../db");

const authenticate = require("../middleware/authenticate");

const logger = require("../src/utils/logger");


// mergeParams allows access to :teamId
const router = express.Router({ mergeParams: true });


// =====================================
// HELPER — REQUIRE TEAM MEMBER
// =====================================
async function requireMember(teamId, userId, res) {

  const check = await pool.query(

    "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",

    [teamId, userId]
  );

  if (check.rows.length === 0) {

    logger.error(`Unauthorized access attempt to team ${teamId} by user ${userId}`);

    res.status(403).json({
      message: "Access denied: not a member of this team",
    });

    return null;
  }

  return check.rows[0].role;
}


// =====================================
// GET TASKS
// =====================================
router.get("/", authenticate, async (req, res) => {

  const { teamId } = req.params;

  try {

    const role = await requireMember(
      teamId,
      req.user.userId,
      res
    );

    if (!role) return;

    const result = await pool.query(

      `SELECT * FROM tasks
       WHERE team_id = $1
       ORDER BY created_at DESC`,

      [teamId]
    );

    logger.info(`User ${req.user.userId} fetched tasks for team ${teamId}`);

    res.json({
      tasks: result.rows,
    });

  } catch (err) {

    console.error("Fetch tasks error:", err.message);

    logger.error(`Fetch tasks error: ${err.message}`);

    res.status(500).json({
      message: "Server error fetching tasks",
    });
  }
});


// =====================================
// CREATE TASK
// =====================================
router.post(

  "/",

  authenticate,

  [
    body("title")
      .notEmpty()
      .withMessage("Task title is required"),

    body("status")
      .optional()
      .isIn(["todo", "in_progress", "done"])
      .withMessage("Status must be todo, in_progress, or done"),
  ],

  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      logger.error("Validation failed during task creation");

      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { teamId } = req.params;

    const {
      title,
      description,
      status = "todo",
    } = req.body;

    try {

      const role = await requireMember(
        teamId,
        req.user.userId,
        res
      );

      if (!role) return;

      const result = await pool.query(

        `INSERT INTO tasks
         (team_id, title, description, status, creator_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,

        [
          teamId,
          title,
          description || null,
          status,
          req.user.userId,
        ]
      );

      logger.info(`Task created in team ${teamId} by user ${req.user.userId}`);

      res.status(201).json({
        message: "Task created",
        task: result.rows[0],
      });

    } catch (err) {

      console.error("Create task error:", err.message);

      logger.error(`Create task error: ${err.message}`);

      res.status(500).json({
        message: "Server error creating task",
      });
    }
  }
);


// =====================================
// UPDATE TASK
// =====================================
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

    if (!errors.isEmpty()) {

      logger.error("Validation failed during task update");

      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { teamId, taskId } = req.params;

    const {
      title,
      description,
      status,
    } = req.body;

    try {

      const role = await requireMember(
        teamId,
        req.user.userId,
        res
      );

      if (!role) return;

      const taskResult = await pool.query(

        "SELECT * FROM tasks WHERE id = $1 AND team_id = $2",

        [taskId, teamId]
      );

      const task = taskResult.rows[0];

      if (!task) {

        logger.error(`Task not found: ${taskId}`);

        return res.status(404).json({
          message: "Task not found",
        });
      }

      const isCreator =
        task.creator_id === req.user.userId;

      const isAdmin =
        role === "admin";

      if (!isCreator && !isAdmin) {

        logger.error(`Unauthorized task update attempt by user ${req.user.userId}`);

        return res.status(403).json({
          message: "Only the task creator or an admin can update this task",
        });
      }

      const result = await pool.query(

        `UPDATE tasks SET
           title       = COALESCE($1, title),
           description = COALESCE($2, description),
           status      = COALESCE($3, status)
         WHERE id = $4
         RETURNING *`,

        [
          title || null,
          description || null,
          status || null,
          taskId,
        ]
      );

      logger.info(`Task ${taskId} updated by user ${req.user.userId}`);

      res.json({
        message: "Task updated",
        task: result.rows[0],
      });

    } catch (err) {

      console.error("Update task error:", err.message);

      logger.error(`Update task error: ${err.message}`);

      res.status(500).json({
        message: "Server error updating task",
      });
    }
  }
);


// =====================================
// DELETE TASK
// =====================================
router.delete("/:taskId", authenticate, async (req, res) => {

  const { teamId, taskId } = req.params;

  try {

    const role = await requireMember(
      teamId,
      req.user.userId,
      res
    );

    if (!role) return;

    const taskResult = await pool.query(

      "SELECT * FROM tasks WHERE id = $1 AND team_id = $2",

      [taskId, teamId]
    );

    const task = taskResult.rows[0];

    if (!task) {

      logger.error(`Task not found for deletion: ${taskId}`);

      return res.status(404).json({
        message: "Task not found",
      });
    }

    const isCreator =
      task.creator_id === req.user.userId;

    const isAdmin =
      role === "admin";

    if (!isCreator && !isAdmin) {

      logger.error(`Unauthorized delete attempt by user ${req.user.userId}`);

      return res.status(403).json({
        message: "Only the task creator or an admin can delete this task",
      });
    }

    await pool.query(
      "DELETE FROM tasks WHERE id = $1",
      [taskId]
    );

    logger.info(`Task ${taskId} deleted by user ${req.user.userId}`);

    res.json({
      message: "Task deleted",
    });

  } catch (err) {

    console.error("Delete task error:", err.message);

    logger.error(`Delete task error: ${err.message}`);

    res.status(500).json({
      message: "Server error deleting task",
    });
  }
});


module.exports = router;