require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const teamRoutes = require("./routes/teamRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Collaboration Service Running");
});

app.use("/teams", teamRoutes);
app.use("/teams/:teamId/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});