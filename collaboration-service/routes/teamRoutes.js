const express = require("express");

const { body, validationResult } = require("express-validator");

const pool = require("../db");

const authenticate = require("../middleware/authenticate");

const logger = require("../src/utils/logger");


const router = express.Router();


// =====================================
// GET ALL TEAMS
// =====================================
router.get("/", authenticate, async (req, res) => {

  try {

    const result = await pool.query(

      `SELECT t.id, t.name, t.description, t.owner_id, t.created_at, tm.role
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,

      [req.user.userId]
    );

    logger.info(`User ${req.user.userId} fetched teams`);

    res.json({
      teams: result.rows,
    });

  } catch (err) {

    console.error("Fetch teams error:", err.message);

    logger.error(`Fetch teams error: ${err.message}`);

    res.status(500).json({
      message: "Server error fetching teams",
    });
  }
});


// =====================================
// CREATE TEAM
// =====================================
router.post(

  "/",

  authenticate,

  [
    body("name")
      .notEmpty()
      .withMessage("Team name is required"),
  ],

  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      logger.error("Validation failed during team creation");

      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { name, description } = req.body;

    const client = await pool.connect();

    try {

      await client.query("BEGIN");

      const teamResult = await client.query(

        "INSERT INTO teams (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *",

        [name, description || null, req.user.userId]
      );

      const team = teamResult.rows[0];

      await client.query(

        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'admin')",

        [team.id, req.user.userId]
      );

      await client.query("COMMIT");

      logger.info(`Team created: ${team.name} by user ${req.user.userId}`);

      res.status(201).json({
        message: "Team created",
        team,
      });

    } catch (err) {

      await client.query("ROLLBACK");

      console.error("Create team error:", err.message);

      logger.error(`Create team error: ${err.message}`);

      res.status(500).json({
        message: "Server error creating team",
      });

    } finally {

      client.release();
    }
  }
);


// =====================================
// GET SINGLE TEAM
// =====================================
router.get("/:teamId", authenticate, async (req, res) => {

  const { teamId } = req.params;

  try {

    const memberCheck = await pool.query(

      "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",

      [teamId, req.user.userId]
    );

    if (memberCheck.rows.length === 0) {

      logger.error(`Unauthorized team access attempt by user ${req.user.userId}`);

      return res.status(403).json({
        message: "Access denied: not a member of this team",
      });
    }

    const result = await pool.query(
      "SELECT * FROM teams WHERE id = $1",
      [teamId]
    );

    if (!result.rows[0]) {

      logger.error(`Team not found: ${teamId}`);

      return res.status(404).json({
        message: "Team not found",
      });
    }

    logger.info(`User ${req.user.userId} accessed team ${teamId}`);

    res.json({
      team: result.rows[0],
      role: memberCheck.rows[0].role,
    });

  } catch (err) {

    console.error("Get team error:", err.message);

    logger.error(`Get team error: ${err.message}`);

    res.status(500).json({
      message: "Server error fetching team",
    });
  }
});


// =====================================
// DELETE TEAM
// =====================================
router.delete("/:teamId", authenticate, async (req, res) => {

  const { teamId } = req.params;

  try {

    const result = await pool.query(

      "DELETE FROM teams WHERE id = $1 AND owner_id = $2 RETURNING id",

      [teamId, req.user.userId]
    );

    if (!result.rows[0]) {

      logger.error(`Unauthorized delete attempt on team ${teamId}`);

      return res.status(403).json({
        message: "Not authorised or team not found",
      });
    }

    logger.info(`Team deleted: ${teamId}`);

    res.json({
      message: "Team deleted",
    });

  } catch (err) {

    console.error("Delete team error:", err.message);

    logger.error(`Delete team error: ${err.message}`);

    res.status(500).json({
      message: "Server error deleting team",
    });
  }
});


// =====================================
// ADD MEMBER
// =====================================
router.post("/:teamId/members", authenticate, async (req, res) => {

  const { teamId } = req.params;

  const { userId, role = "member" } = req.body;

  if (!userId) {

    logger.error("Attempt to add member without userId");

    return res.status(400).json({
      message: "userId is required",
    });
  }

  try {

    const adminCheck = await pool.query(

      "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",

      [teamId, req.user.userId]
    );

    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== "admin") {

      logger.error(`Unauthorized member add attempt by user ${req.user.userId}`);

      return res.status(403).json({
        message: "Only admins can add members",
      });
    }

    await pool.query(

      "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",

      [teamId, userId, role]
    );

    logger.info(`User ${userId} added to team ${teamId}`);

    res.status(201).json({
      message: "Member added",
    });

  } catch (err) {

    console.error("Add member error:", err.message);

    logger.error(`Add member error: ${err.message}`);

    res.status(500).json({
      message: "Server error adding member",
    });
  }
});


module.exports = router;