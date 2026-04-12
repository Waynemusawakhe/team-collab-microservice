const teams = require("../data/teams");

const createTeam = (req, res) => {
  try {
    const { name, description } = req.body;

    const newTeam = {
      id: teams.length + 1,
      name,
      description: description || "",
      createdBy: req.user.id,
      members: [
        {
          userId: req.user.id,
          role: "admin",
        },
      ],
      createdAt: new Date().toISOString(),
    };

    teams.push(newTeam);

    res.status(201).json({
      message: "Team created successfully",
      team: newTeam,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while creating team",
      error: error.message,
    });
  }
};

const getMyTeams = (req, res) => {
  try {
    const userTeams = teams.filter((team) =>
      team.members.some((member) => member.userId === req.user.id)
    );

    res.status(200).json({
      message: "Teams fetched successfully",
      teams: userTeams,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching teams",
      error: error.message,
    });
  }
};

module.exports = {
  createTeam,
  getMyTeams,
};