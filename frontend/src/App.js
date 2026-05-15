import { useState, useCallback, useEffect } from "react";

const API = "http://localhost:5000";

function request(path, options = {}, token) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(async (res) => {
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  });
}


// =====================================================
// ALERT COMPONENT
// =====================================================

function Alert({ type, message, onClose }) {

  if (!message) return null;

  const colors = {
    error: {
      bg: "#FEE2E2",
      border: "#FCA5A5",
      text: "#991B1B",
    },
    success: {
      bg: "#DCFCE7",
      border: "#86EFAC",
      text: "#166534",
    },
  };

  const c = colors[type] || colors.success;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        padding: "12px 14px",
        borderRadius: 8,
        marginBottom: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>{message}</span>

      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: c.text,
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        ×
      </button>
    </div>
  );
}


// =====================================================
// INPUT COMPONENT
// =====================================================

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          marginBottom: 5,
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
        }}
      >
        {label}
      </label>

      <input
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #D1D5DB",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}


// =====================================================
// BUTTON COMPONENT
// =====================================================

function Button({
  children,
  variant = "primary",
  loading,
  style,
  ...props
}) {

  const variants = {
    primary: {
      background: "#4F46E5",
      color: "#fff",
    },

    secondary: {
      background: "#F3F4F6",
      color: "#111827",
      border: "1px solid #D1D5DB",
    },

    danger: {
      background: "#DC2626",
      color: "#fff",
    },
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      style={{
        padding: "10px 16px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        opacity: loading ? 0.7 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}


// =====================================================
// CARD COMPONENT
// =====================================================

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}


// =====================================================
// STATUS BADGE
// =====================================================

function Badge({ status }) {

  const styles = {
    todo: {
      bg: "#F3F4F6",
      color: "#6B7280",
      label: "TO DO",
    },

    in_progress: {
      bg: "#FEF3C7",
      color: "#92400E",
      label: "IN PROGRESS",
    },

    done: {
      bg: "#DCFCE7",
      color: "#166534",
      label: "DONE",
    },
  };

  const s = styles[status] || styles.todo;

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}


// =====================================================
// AUTH SCREEN
// =====================================================

function AuthScreen({ onLogin }) {

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [alert, setAlert] = useState(null);

  const [loading, setLoading] = useState(false);


  async function handleSubmit(e) {

    e.preventDefault();

    setAlert(null);

    setLoading(true);

    try {

      if (mode === "register") {

        await request("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        });

        setAlert({
          type: "success",
          message: "Registration successful. Please log in.",
        });

        setMode("login");

      } else {

        const data = await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        });

        localStorage.setItem("token", data.token);

        onLogin(data.token);
      }

    } catch (err) {

      setAlert({
        type: "error",
        message: err.message,
      });

    } finally {

      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card style={{ width: 420 }}>

        <h1
          style={{
            marginTop: 0,
            marginBottom: 8,
            fontSize: 28,
            color: "#111827",
          }}
        >
          Secure Team Collaboration Platform
        </h1>

        <p
          style={{
            color: "#6B7280",
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          JWT Authentication • RBAC • Microservice Architecture
        </p>

        {alert && (
          <Alert
            {...alert}
            onClose={() => setAlert(null)}
          />
        )}

        <form onSubmit={handleSubmit}>

          <Input
            label="Email"
            type="email"
            value={email}
            placeholder="you@example.com"
            required
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            placeholder="••••••••"
            required
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            loading={loading}
            style={{
              width: "100%",
              marginTop: 8,
            }}
          >
            {mode === "login"
              ? "Sign In"
              : "Create Account"}
          </Button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 13,
          }}
        >
          {mode === "login"
            ? "No account?"
            : "Already have an account?"}

          <button
            onClick={() => {
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              );
            }}
            style={{
              marginLeft: 6,
              border: "none",
              background: "none",
              color: "#4F46E5",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {mode === "login"
              ? "Register"
              : "Sign In"}
          </button>
        </p>

      </Card>
    </div>
  );
}


// =====================================================
// TASK PANEL
// =====================================================

function TaskPanel({
  team,
  token,
  userId,
  onBack,
}) {

  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [alert, setAlert] = useState(null);

  const [loading, setLoading] = useState(false);


  const loadTasks = useCallback(async () => {

    try {

      const data = await request(
        `/teams/${team.id}/tasks`,
        {},
        token
      );

      setTasks(data.tasks || []);

    } catch (err) {

      setAlert({
        type: "error",
        message: err.message,
      });
    }

  }, [team.id, token]);


  useEffect(() => {
    loadTasks();
  }, [loadTasks]);


  async function createTask(e) {

    e.preventDefault();

    setLoading(true);

    try {

      await request(
        `/teams/${team.id}/tasks`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            status: "todo",
          }),
        },
        token
      );

      setTitle("");
      setDescription("");

      await loadTasks();

    } catch (err) {

      setAlert({
        type: "error",
        message: err.message,
      });

    } finally {

      setLoading(false);
    }
  }

  return (
    <div>

      <Button
        variant="secondary"
        onClick={onBack}
        style={{ marginBottom: 20 }}
      >
        ← Back to Teams
      </Button>

      <Card style={{ marginBottom: 24 }}>

        <h2 style={{ marginTop: 0 }}>
          {team.name}
        </h2>

        <p style={{ color: "#6B7280" }}>
          {team.description}
        </p>

        <div
          style={{
            marginTop: 14,
            display: "inline-block",
            background:
              team.role === "admin"
                ? "#FEE2E2"
                : "#DBEAFE",

            color:
              team.role === "admin"
                ? "#991B1B"
                : "#1E40AF",

            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {team.role.toUpperCase()}
        </div>

        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          {team.role === "admin"
            ? "Admins can manage all tasks and team members."
            : "Members can manage only their own tasks."}
        </p>

      </Card>

      {alert && (
        <Alert
          {...alert}
          onClose={() => setAlert(null)}
        />
      )}

      <Card style={{ marginBottom: 24 }}>

        <h3>Create Task</h3>

        <form onSubmit={createTask}>

          <Input
            label="Task Title"
            value={title}
            required
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button
            type="submit"
            loading={loading}
          >
            Create Task
          </Button>

        </form>
      </Card>

      <h3>Tasks</h3>

      {tasks.length === 0 && (
        <p>No tasks available.</p>
      )}

      {tasks.map((task) => {

        const canManage =
          task.creator_id === userId ||
          team.role === "admin";

        return (
          <Card
            key={task.id}
            style={{ marginBottom: 12 }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >

              <div>

                <h4 style={{ margin: 0 }}>
                  {task.title}
                </h4>

                <p
                  style={{
                    color: "#6B7280",
                    fontSize: 14,
                  }}
                >
                  {task.description}
                </p>

                <Badge status={task.status} />

              </div>

              {canManage && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Authorized User
                </div>
              )}

            </div>

          </Card>
        );
      })}
    </div>
  );
}


// =====================================================
// TEAMS SCREEN
// =====================================================

function TeamsScreen({
  token,
  userId,
  onSelectTeam,
}) {

  const [teams, setTeams] = useState([]);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [alert, setAlert] = useState(null);

  const [loading, setLoading] = useState(false);


  const loadTeams = useCallback(async () => {

    try {

      const data = await request(
        "/teams",
        {},
        token
      );

      setTeams(data.teams || []);

    } catch (err) {

      setAlert({
        type: "error",
        message: err.message,
      });
    }

  }, [token]);


  useEffect(() => {
    loadTeams();
  }, [loadTeams]);


  async function createTeam(e) {

    e.preventDefault();

    setLoading(true);

    try {

      await request(
        "/teams",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            description,
          }),
        },
        token
      );

      setName("");
      setDescription("");

      await loadTeams();

    } catch (err) {

      setAlert({
        type: "error",
        message: err.message,
      });

    } finally {

      setLoading(false);
    }
  }

  return (
    <div>

      <Card style={{ marginBottom: 24 }}>

        <h2
          style={{
            marginTop: 0,
            marginBottom: 10,
          }}
        >
          Collaboration Dashboard
        </h2>

        <p
          style={{
            color: "#6B7280",
            lineHeight: 1.6,
          }}
        >
          This platform demonstrates secure
          microservice architecture using
          JWT authentication,
          role-based access control,
          protected API routes,
          centralized gateway routing,
          and audit logging.
        </p>

      </Card>

      {alert && (
        <Alert
          {...alert}
          onClose={() => setAlert(null)}
        />
      )}

      <Card style={{ marginBottom: 24 }}>

        <h3>Create Team</h3>

        <form onSubmit={createTeam}>

          <Input
            label="Team Name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button
            type="submit"
            loading={loading}
          >
            Create Team
          </Button>

        </form>
      </Card>

      <h3>Your Teams</h3>

      {teams.length === 0 && (
        <p>No teams available.</p>
      )}

      {teams.map((team) => (

        <Card
          key={team.id}
          style={{ marginBottom: 12 }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >

            <div>

              <h4
                style={{
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {team.name}
              </h4>

              <p
                style={{
                  color: "#6B7280",
                  fontSize: 14,
                }}
              >
                {team.description}
              </p>

              <div
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  background:
                    team.role === "admin"
                      ? "#FEE2E2"
                      : "#DBEAFE",

                  color:
                    team.role === "admin"
                      ? "#991B1B"
                      : "#1E40AF",

                  padding: "5px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {team.role.toUpperCase()}
              </div>

            </div>

            <Button
              onClick={() => onSelectTeam(team)}
            >
              Open Workspace
            </Button>

          </div>

        </Card>
      ))}
    </div>
  );
}


// =====================================================
// ROOT APP
// =====================================================

export default function App() {

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [userId, setUserId] = useState(null);

  const [userEmail, setUserEmail] = useState("");

  const [selectedTeam, setSelectedTeam] =
    useState(null);


  useEffect(() => {

    try {

      if (!token) return;

      const decoded = JSON.parse(
        atob(token.split(".")[1])
      );

      setUserId(decoded.userId);

      setUserEmail(decoded.email);

    } catch (err) {

      console.error(err);
    }

  }, [token]);


  function handleLogin(newToken) {

    localStorage.setItem(
      "token",
      newToken
    );

    setToken(newToken);
  }


  function handleLogout() {

    localStorage.removeItem("token");

    setToken("");

    setUserId(null);

    setUserEmail("");

    setSelectedTeam(null);
  }


  if (!token) {
    return (
      <AuthScreen
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >

      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

        <div>

          <div
            style={{
              fontWeight: 700,
              fontSize: 20,
              color: "#111827",
            }}
          >
            Secure Team Collaboration Platform
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 4,
            }}
          >
            JWT Authentication • RBAC • Logging • API Gateway
          </div>

        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >

          <div
            style={{
              fontSize: 13,
              color: "#374151",
            }}
          >
            {userEmail}
          </div>

          <Button
            variant="secondary"
            onClick={handleLogout}
          >
            Sign Out
          </Button>

        </div>

      </div>

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 24,
        }}
      >

        {selectedTeam ? (

          <TaskPanel
            team={selectedTeam}
            token={token}
            userId={userId}
            onBack={() =>
              setSelectedTeam(null)
            }
          />

        ) : (

          <TeamsScreen
            token={token}
            userId={userId}
            onSelectTeam={setSelectedTeam}
          />

        )}

      </div>

    </div>
  );
}