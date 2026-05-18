const express = require("express");

const { body, param, validationResult } = require("express-validator");

const pool = require("../db");

const authenticate = require("../middleware/authenticate");

const logger = require("../src/utils/logger");


// mergeParams allows access to :teamId
const router = express.Router({ mergeParams: true });

const uuidParam = (name) =>
  param(name)
    .isUUID()
    .withMessage(`${name} must be a valid UUID`);


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
// HELPER - REQUIRE USER ASSIGNED TO TEAM
// =====================================
async function requireTeamAssignee(teamId, userId, res) {

  const check = await pool.query(

    "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",

    [teamId, userId]
  );

  if (check.rows.length === 0) {

      logger.error(`Task assignment rejected for non-member ${userId} in team ${teamId}`);
      logger.audit("TASK_ASSIGNMENT_REJECTED_NON_MEMBER", {
        teamId,
        targetUserId: userId,
      });

    res.status(400).json({
      message: "Tasks can only be assigned to users who belong to this team",
    });

    return false;
  }

  return true;
}


// =====================================
// GET TASKS
// =====================================
router.get("/", authenticate, [uuidParam("teamId")], async (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    logger.error("Validation failed while fetching tasks");

    return res.status(400).json({
      errors: errors.array(),
    });
  }

  const { teamId } = req.params;

  try {

    const role = await requireMember(
      teamId,
      req.user.userId,
      res
    );

    if (!role) return;

    const taskQuery =
      role === "admin"
        ? {
            text: `SELECT * FROM tasks
                   WHERE team_id = $1
                   ORDER BY created_at DESC`,
            values: [teamId],
          }
        : {
            text: `SELECT * FROM tasks
                   WHERE team_id = $1 AND assigned_to = $2
                   ORDER BY created_at DESC`,
            values: [teamId, req.user.userId],
          };

    const result = await pool.query(
      taskQuery.text,
      taskQuery.values
    );

    logger.info(`User ${req.user.userId} fetched ${role === "admin" ? "all" : "assigned"} tasks for team ${teamId}`);

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
    uuidParam("teamId"),

    body("title")
      .trim()
      .notEmpty()
      .withMessage("Task title is required"),

    body("description")
      .optional({ checkFalsy: true })
      .trim()
      .escape(),

    body("status")
      .optional()
      .isIn(["todo", "in_progress", "done"])
      .withMessage("Status must be todo, in_progress, or done"),

    body("assignedTo")
      .notEmpty()
      .withMessage("Task assignee is required")
      .bail()
      .isUUID()
      .withMessage("assignedTo must be a valid UUID"),
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
      assignedTo,
    } = req.body;

    try {

      const role = await requireMember(
        teamId,
        req.user.userId,
        res
      );

      if (!role) return;

      const isAdmin =
        role === "admin";

      if (!isAdmin && assignedTo !== req.user.userId) {

        logger.error(`Non-admin task assignment attempt by user ${req.user.userId}`);
        logger.audit("TASK_ASSIGNMENT_DENIED_NON_ADMIN", {
          teamId,
          actingUserId: req.user.userId,
          assignedTo,
          requestId: req.requestId,
        });

        return res.status(403).json({
          message: "Members can only create tasks assigned to themselves",
        });
      }

      const assigneeExists = await requireTeamAssignee(
        teamId,
        assignedTo,
        res
      );

      if (!assigneeExists) return;

      const result = await pool.query(

        `INSERT INTO tasks
         (team_id, title, description, status, creator_id, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,

        [
          teamId,
          title,
          description || null,
          status,
          req.user.userId,
          assignedTo,
        ]
      );

      logger.info(`Task created in team ${teamId} by user ${req.user.userId} for assignee ${assignedTo}`);
      logger.audit("TASK_CREATED", {
        teamId,
        taskId: result.rows[0].id,
        creatorId: req.user.userId,
        assignedTo,
        requestId: req.requestId,
      });

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
    uuidParam("teamId"),

    uuidParam("taskId"),

    body("title")
      .optional({ checkFalsy: true })
      .trim()
      .notEmpty()
      .withMessage("Task title cannot be empty"),

    body("description")
      .optional({ checkFalsy: true })
      .trim()
      .escape(),

    body("status")
      .optional()
      .isIn(["todo", "in_progress", "done"])
      .withMessage("Status must be todo, in_progress, or done"),

    body("assignedTo")
      .optional()
      .isUUID()
      .withMessage("assignedTo must be a valid UUID"),
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
      assignedTo,
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

      const isAssignee =
        task.assigned_to === req.user.userId;

      const isAdmin =
        role === "admin";

      if (!isCreator && !isAssignee && !isAdmin) {

        logger.error(`Unauthorized task update attempt by user ${req.user.userId}`);
        logger.audit("TASK_UPDATE_DENIED", {
          teamId,
          taskId,
          actingUserId: req.user.userId,
          requestId: req.requestId,
        });

        return res.status(403).json({
          message: "Only the task assignee, creator, or an admin can update this task",
        });
      }

      if (assignedTo && !isAdmin) {

        logger.error(`Non-admin task reassignment attempt by user ${req.user.userId}`);
        logger.audit("TASK_REASSIGNMENT_DENIED_NON_ADMIN", {
          teamId,
          taskId,
          actingUserId: req.user.userId,
          assignedTo,
          requestId: req.requestId,
        });

        return res.status(403).json({
          message: "Only admins can reassign tasks",
        });
      }

      if (assignedTo) {

        const assigneeExists = await requireTeamAssignee(
          teamId,
          assignedTo,
          res
        );

        if (!assigneeExists) return;
      }

      const result = await pool.query(

        `UPDATE tasks SET
           title       = COALESCE($1, title),
           description = COALESCE($2, description),
           status      = COALESCE($3, status),
           assigned_to = COALESCE($4, assigned_to)
         WHERE id = $5
         RETURNING *`,

        [
          title || null,
          description || null,
          status || null,
          assignedTo || null,
          taskId,
        ]
      );

      logger.info(`Task ${taskId} updated by user ${req.user.userId}`);
      logger.audit("TASK_UPDATED", {
        teamId,
        taskId,
        actingUserId: req.user.userId,
        assignedTo: assignedTo || task.assigned_to,
        requestId: req.requestId,
      });

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
router.delete("/:taskId", authenticate, [uuidParam("teamId"), uuidParam("taskId")], async (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    logger.error("Validation failed while deleting task");

    return res.status(400).json({
      errors: errors.array(),
    });
  }

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
