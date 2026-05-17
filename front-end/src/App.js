import React, { useState } from "react";

function App() {
  const [email, setEmail] = useState("wayne@example.com");
  const [password, setPassword] = useState("123456");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [message, setMessage] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const getCsrfToken = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
  };

  const API_BASE_URL = "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const csrfToken = await getCsrfToken("/auth/csrf-token");
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      setToken(data.token);
      localStorage.setItem("token", data.token);
      setMessage("Login successful");
    } catch (error) {
      setMessage("Error connecting to server");
    }
  };

  const handleLogout = () => {
    setToken("");
    setTeams([]);
    setTasks([]);
    setSelectedTeamId("");
    localStorage.removeItem("token");
    setMessage("Logged out");
  };

  const fetchTeams = async () => {
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to fetch teams");
        return;
      }

      setTeams(data.teams || []);
      setMessage("Teams loaded successfully");
    } catch (error) {
      setMessage("Error fetching teams");
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const csrfToken = await getCsrfToken("/teams/csrf-token");
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create team");
        return;
      }

      setMessage("Team created successfully");
      setTeamName("");
      setTeamDescription("");
      fetchTeams();
    } catch (error) {
      setMessage("Error creating team");
    }
  };

  const fetchTasks = async (teamId) => {
    setMessage("");
    setSelectedTeamId(teamId);

    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/tasks`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to fetch tasks");
        return;
      }

      setTasks(data.tasks || []);
      setMessage("Tasks loaded successfully");
    } catch (error) {
      setMessage("Error fetching tasks");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!selectedTeamId) {
      setMessage("Please select a team first");
      return;
    }

    setMessage("");

    try {
      const csrfToken = await getCsrfToken("/teams/csrf-token");
      const response = await fetch(`${API_BASE_URL}/teams/${selectedTeamId}/tasks`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          status: "todo",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create task");
        return;
      }

      setMessage("Task created successfully");
      setTaskTitle("");
      setTaskDescription("");
      fetchTasks(selectedTeamId);
    } catch (error) {
      setMessage("Error creating task");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Team Collaboration Frontend</h1>

      {message && <p><strong>{message}</strong></p>}

      {!token ? (
        <div>
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "10px" }}>
              <label>Email: </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label>Password: </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit">Login</button>
          </form>
        </div>
      ) : (
        <div>
          <h2>Dashboard</h2>
          <button onClick={handleLogout}>Logout</button>

          <hr />

          <h3>Create Team</h3>
          <form onSubmit={handleCreateTeam}>
            <div style={{ marginBottom: "10px" }}>
              <label>Team Name: </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label>Description: </label>
              <input
                type="text"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
              />
            </div>

            <button type="submit">Create Team</button>
          </form>

          <hr />

          <h3>Teams</h3>
          <button onClick={fetchTeams}>Load My Teams</button>

          <ul>
            {teams.map((team) => (
              <li key={team.id} style={{ marginTop: "10px" }}>
                <strong>{team.name}</strong> - {team.description}
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={() => fetchTasks(team.id)}
                >
                  View Tasks
                </button>
              </li>
            ))}
          </ul>

          <hr />

          <h3>Create Task</h3>
          <p>Selected Team ID: {selectedTeamId || "None selected"}</p>

          <form onSubmit={handleCreateTask}>
            <div style={{ marginBottom: "10px" }}>
              <label>Task Title: </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label>Description: </label>
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>

            <button type="submit">Create Task</button>
          </form>

          <hr />

          <h3>Tasks</h3>
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> - {task.description} - [{task.status}]
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;