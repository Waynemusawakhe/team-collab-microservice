const tasks = require("../data/tasks");
const teams = require("../data/teams");

const createTask = (req, res) => {
  try {
    const { teamId } = req.params;
    const { title, description, status } = req.body;

    const team = teams.find((team) => team.id === parseInt(teamId));

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const isMember = team.members.some(
      (member) => member.userId === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this team.",
      });
    }

    const newTask = {
      id: tasks.length + 1,
      teamId: parseInt(teamId),
      title,
      description: description || "",
      status: status || "todo",
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);

    res.status(201).json({
      message: "Task created successfully",
      task: newTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while creating task",
      error: error.message,
    });
  }
};

const getTasksByTeam = (req, res) => {
  try {
    const { teamId } = req.params;

    const team = teams.find((team) => team.id === parseInt(teamId));

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const isMember = team.members.some(
      (member) => member.userId === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this team.",
      });
    }

    const teamTasks = tasks.filter(
      (task) => task.teamId === parseInt(teamId)
    );

    res.status(200).json({
      message: "Tasks fetched successfully",
      tasks: teamTasks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching tasks",
      error: error.message,
    });
  }
};

const updateTask = (req, res) => {
  try {
    const { teamId, taskId } = req.params;
    const { status, title, description } = req.body;

    const team = teams.find((team) => team.id === parseInt(teamId));

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const member = team.members.find(
      (member) => member.userId === req.user.id
    );

    if (!member) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this team.",
      });
    }

    const task = tasks.find(
      (task) =>
        task.id === parseInt(taskId) && task.teamId === parseInt(teamId)
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (member.role !== "admin" && task.createdBy !== req.user.id) {
      return res.status(403).json({
        message: "Only the team admin or the task creator can update this task.",
      });
    }

    if (title !== undefined) {
      task.title = title;
    }

    if (description !== undefined) {
      task.description = description;
    }

    if (status !== undefined) {
      const allowedStatuses = ["todo", "in-progress", "done"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Status must be todo, in-progress, or done",
        });
      }

      task.status = status;
    }

    res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while updating task",
      error: error.message,
    });
  }
};

const deleteTask = (req, res) => {
  try {
    const { teamId, taskId } = req.params;

    const team = teams.find((team) => team.id === parseInt(teamId));

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const member = team.members.find(
      (member) => member.userId === req.user.id
    );

    if (!member) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this team.",
      });
    }

    const taskIndex = tasks.findIndex(
      (task) =>
        task.id === parseInt(taskId) && task.teamId === parseInt(teamId)
    );

    if (taskIndex === -1) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = tasks[taskIndex];

    if (member.role !== "admin" && task.createdBy !== req.user.id) {
      return res.status(403).json({
        message: "Only the team admin or the task creator can delete this task.",
      });
    }

    tasks.splice(taskIndex, 1);

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while deleting task",
      error: error.message,
    });
  }
};

module.exports = {
  createTask,
  getTasksByTeam,
  updateTask,
  deleteTask,
};