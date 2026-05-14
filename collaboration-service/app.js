require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const logger = require("./src/utils/logger");

const teamRoutes = require("./routes/teamRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

const PORT = process.env.PORT || 5002;


// Middleware
app.use(cors());

app.use(express.json());

app.use(morgan("dev"));


// Root route
app.get("/", (req, res) => {

  logger.info("Collaboration Service Root Route Accessed");

  res.send("Collaboration Service Running");
});


// Routes
app.use("/teams", teamRoutes);

app.use("/teams/:teamId/tasks", taskRoutes);


// Start server
app.listen(PORT, () => {

  logger.info(`Collaboration Service running on port ${PORT}`);

  console.log(`Collaboration Service running on port ${PORT}`);
});