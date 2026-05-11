import { useState, useCallback } from "react";

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
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  });
}

// ── Reusable UI components ──────────────────────────────────────────────────

function Alert({ type, message, onClose }) {
  if (!message) return null;
  const colors = {
    error: { bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
    success: { bg: "#DCFCE7", border: "#86EFAC", text: "#166534" },
    info: { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF" },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex",
      justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: "none", border: "none",
          cursor: "pointer", color: c.text, fontWeight: 700, fontSize: 16, marginLeft: 12 }}>
          ×
        </button>
      )}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600,
        marginBottom: 4, color: "#374151" }}>{label}</label>}
      <input {...props} style={{ width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB",
        borderRadius: 7, fontSize: 14, boxSizing: "border-box",
        outline: "none", fontFamily: "inherit", ...props.style }} />
    </div>
  );
}

function Button({ children, variant = "primary", loading, style: s, ...props }) {
  const base = { padding: "9px 18px", borderRadius: 7, border: "none", cursor: "pointer",
    fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "opacity .15s" };
  const variants = {
    primary:  { background: "#4F46E5", color: "#fff" },
    secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
    danger:   { background: "#EF4444", color: "#fff" },
    ghost:    { background: "none", color: "#4F46E5", padding: "6px 10px" },
  };
  return (
    <button {...props} disabled={loading || props.disabled}
      style={{ ...base, ...variants[variant], opacity: (loading || props.disabled) ? .6 : 1, ...s }}>
      {loading ? "…" : children}
    </button>
  );
}

function Card({ children, style: s }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB",
      borderRadius: 10, padding: 20, ...s }}>
      {children}
    </div>
  );
}

function Badge({ status }) {
  const map = {
    todo:        { bg: "#F3F4F6", color: "#6B7280", label: "To Do" },
    in_progress: { bg: "#FEF3C7", color: "#92400E", label: "In Progress" },
    done:        { bg: "#D1FAE5", color: "#065F46", label: "Done" },
  };
  const { bg, color, label } = map[status] || map.todo;
  return (
    <span style={{ background: bg, color, padding: "2px 9px", borderRadius: 20,
      fontSize: 12, fontWeight: 600 }}>{label}</span>
  );
}

// ── Auth screens ────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");       // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await request("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setAlert({ type: "success", message: "Registered! Please log in." });
        setMode("login");
      } else {
        const data = await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("token", data.token);
        onLogin(data.token);
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F9FAFB" }}>
      <Card style={{ width: 380 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "#111827" }}>
          Team Collaboration
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6B7280" }}>
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} required
            placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} required
            placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" loading={loading} style={{ width: "100%", marginTop: 4 }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#6B7280" }}>
          {mode === "login" ? "No account? " : "Already registered? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setAlert(null); }}
            style={{ background: "none", border: "none", color: "#4F46E5",
              cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {mode === "login" ? "Register" : "Sign In"}
          </button>
        </p>
      </Card>
    </div>
  );
}

// ── Task panel ──────────────────────────────────────────────────────────────

function TaskPanel({ team, token, userId, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request(`/teams/${team.id}/tasks`, {}, token);
      setTasks(data.tasks || []);
      setLoaded(true);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [team.id, token]);

  useState(() => { loadTasks(); }, []);  // load on mount

  const createTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setAlert(null);
    try {
      await request(`/teams/${team.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title, description, status: "todo" }),
      }, token);
      setTitle("");
      setDescription("");
      await loadTasks();
      setAlert({ type: "success", message: "Task created" });
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (taskId) => {
    setLoading(true);
    try {
      await request(`/teams/${team.id}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(editFields),
      }, token);
      setEditingId(null);
      await loadTasks();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setLoading(true);
    try {
      await request(`/teams/${team.id}/tasks/${taskId}`, { method: "DELETE" }, token);
      await loadTasks();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Button variant="ghost" onClick={onBack} style={{ padding: "6px 0" }}>← Back</Button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{team.name}</h2>
          {team.description && <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{team.description}</p>}
        </div>
      </div>

      {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Add Task</h3>
        <form onSubmit={createTask}>
          <Input label="Title" value={title} required placeholder="What needs to be done?"
            onChange={(e) => setTitle(e.target.value)} />
          <Input label="Description (optional)" value={description}
            placeholder="Add more detail…" onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" loading={loading}>Create Task</Button>
        </form>
      </Card>

      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
        Tasks {loaded && `(${tasks.length})`}
      </h3>

      {!loaded && <p style={{ color: "#6B7280", fontSize: 14 }}>Loading…</p>}
      {loaded && tasks.length === 0 && (
        <p style={{ color: "#9CA3AF", fontSize: 14 }}>No tasks yet. Create one above.</p>
      )}

      {tasks.map((task) => {
        const isEditing = editingId === task.id;
        const canEdit = task.creator_id === userId;
        return (
          <Card key={task.id} style={{ marginBottom: 10 }}>
            {isEditing ? (
              <div>
                <Input value={editFields.title}
                  onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} />
                <Input value={editFields.description || ""}
                  placeholder="Description"
                  onChange={(e) => setEditFields({ ...editFields, description: e.target.value })} />
                <select value={editFields.status}
                  onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #D1D5DB",
                    fontSize: 14, marginBottom: 12, fontFamily: "inherit" }}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => saveEdit(task.id)} loading={loading}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                  {task.description && (
                    <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
                      {task.description}
                    </div>
                  )}
                  <Badge status={task.status} />
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <Button variant="secondary" onClick={() => {
                      setEditingId(task.id);
                      setEditFields({ title: task.title, description: task.description || "", status: task.status });
                    }}>Edit</Button>
                    <Button variant="danger" onClick={() => deleteTask(task.id)}>Delete</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Teams list ──────────────────────────────────────────────────────────────

function TeamsScreen({ token, userId, onSelectTeam }) {
  const [teams, setTeams] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      const data = await request("/teams", {}, token);
      setTeams(data.teams || []);
      setLoaded(true);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    }
  }, [token]);

  useState(() => { loadTeams(); }, []);

  const createTeam = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setAlert(null);
    try {
      await request("/teams", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      }, token);
      setName("");
      setDescription("");
      await loadTeams();
      setAlert({ type: "success", message: "Team created" });
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm("Delete this team and all its tasks?")) return;
    try {
      await request(`/teams/${teamId}`, { method: "DELETE" }, token);
      await loadTeams();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>My Teams</h2>

      {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Create Team</h3>
        <form onSubmit={createTeam}>
          <Input label="Team Name" value={name} required placeholder="e.g. Frontend Squad"
            onChange={(e) => setName(e.target.value)} />
          <Input label="Description (optional)" value={description}
            placeholder="What does this team work on?"
            onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" loading={loading}>Create Team</Button>
        </form>
      </Card>

      {!loaded && <p style={{ color: "#6B7280", fontSize: 14 }}>Loading teams…</p>}
      {loaded && teams.length === 0 && (
        <p style={{ color: "#9CA3AF", fontSize: 14 }}>No teams yet. Create one above.</p>
      )}

      {teams.map((team) => (
        <Card key={team.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{team.name}</div>
              {team.description && (
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{team.description}</div>
              )}
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                Role: <strong>{team.role}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => onSelectTeam(team)}>View Tasks</Button>
              {team.owner_id === userId && (
                <Button variant="danger" onClick={() => deleteTeam(team.id)}>Delete</Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [userId, setUserId] = useState(() => {
    try {
      const t = localStorage.getItem("token");
      if (!t) return null;
      return JSON.parse(atob(t.split(".")[1])).userId;
    } catch { return null; }
  });
  const [selectedTeam, setSelectedTeam] = useState(null);

  const handleLogin = (newToken) => {
    setToken(newToken);
    try {
      setUserId(JSON.parse(atob(newToken.split(".")[1])).userId);
    } catch { setUserId(null); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUserId(null);
    setSelectedTeam(null);
  };

  if (!token) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 56 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
          Team Collaboration
        </span>
        <Button variant="secondary" onClick={handleLogout}>Sign Out</Button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        {selectedTeam ? (
          <TaskPanel
            team={selectedTeam}
            token={token}
            userId={userId}
            onBack={() => setSelectedTeam(null)}
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
