
import { useEffect, useState } from "react";
import "./App.css";
const API_URL = "http://localhost:5003/api/tasks";
function App() {
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

    const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activePage, setActivePage] = useState("Dashboard");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [editingTask, setEditingTask] = useState(null);
const handleAuth = async (e) => {
  e.preventDefault();
  setAuthError("");

  try {
    const endpoint =
      authMode === "login"
        ? "http://localhost:5003/api/auth/login"
        : "http://localhost:5003/api/auth/register";

    const body =
      authMode === "login"
        ? { email: authEmail, password: authPassword }
        : {
            name: authName,
            email: authEmail,
            password: authPassword
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Authentication failed");
    }

    if (authMode === "register") {
      setAuthMode("login");
      setAuthPassword("");
      setAuthError("Registration successful! Please log in.");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
    setAuthPassword("");
    setLoading(true);

  } catch (error) {
    setAuthError(error.message);
  }
};
const fetchTasks = async () => {
  if (!token) {
    setTasks([]);
    setLoading(false);
    return;
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Unable to load tasks");
    }

    const data = await response.json();
    setTasks(data.tasks || []);
  } catch (error) {
    console.error("Unable to load tasks:", error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchTasks();
}, [token]);

const startEdit = (task) => {
  setEditingTask(task);
  setTitle(task.title);
  setDescription(task.description || "");
  setPriority(task.priority);
  setDueDate(
    task.due_date ? task.due_date.slice(0, 10) : ""
  );
};

const saveTask = async (e) => {
  e.preventDefault();

  if (!title.trim()) return;

  try {
    const response = await fetch(
      editingTask ? `${API_URL}/${editingTask.id}` : API_URL,
      {
        method: editingTask ? "PUT" : "POST",
        headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
},
        body: JSON.stringify({
          title,
          description,
          priority,
          status: editingTask ? editingTask.status : "Pending",
          due_date: dueDate || null
        })
      }
    );

    if (!response.ok) throw new Error("Could not save task");

    setTitle("");
    setDescription("");
    setPriority("Medium");
    setDueDate("");
    setEditingTask(null);

    await fetchTasks();
  } catch (error) {
    alert(error.message);
  }
};

const cancelEdit = () => {
  setEditingTask(null);
  setTitle("");
  setDescription("");
  setPriority("Medium");
  setDueDate("");
};

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;

    try {
     const response = await fetch(`${API_URL}/${id}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

      if (!response.ok) throw new Error("Could not delete task");
      fetchTasks();
    } catch (error) {
      alert(error.message);
    }
  };
  
  const updateStatus = async (id, newStatus) => {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
},
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: newStatus,
        due_date: task.due_date
          ? task.due_date.slice(0, 10)
          : null,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not update task status");
    }

    await fetchTasks();
  } catch (error) {
    alert(error.message);
  }
};

  const pending = tasks.filter(t => t.status === "Pending").length;
  const completed = tasks.filter(t => t.status === "Completed").length;

  const filteredTasks = tasks.filter((task) => {
  const matchesSearch = task.title
    .toLowerCase()
    .includes(searchTerm.toLowerCase());

  const matchesStatus =
    statusFilter === "All" || task.status === statusFilter;

  return matchesSearch && matchesStatus;
});

if (!token) {
  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleAuth}>
        <h1>TaskFlow</h1>
        <h2>
          {authMode === "login" ? "Welcome Back" : "Create Account"}
        </h2>
        <p>
          {authMode === "login"
            ? "Login to manage your tasks"
            : "Register to get started"}
        </p>

        {authMode === "register" && (
          <input
            type="text"
            placeholder="Full Name"
            value={authName}
            onChange={(e) => setAuthName(e.target.value)}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          required
        />

        {authError && <p className="auth-error">{authError}</p>}

        <button type="submit">
          {authMode === "login" ? "Login" : "Register"}
        </button>

        <p>
          {authMode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}
          <span
            className="auth-toggle"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthError("");
            }}
          >
            {authMode === "login" ? " Register" : " Login"}
          </span>
        </p>
      </form>
    </div>
  );
}
  return (
    <div className="app">
      <aside className="sidebar">
        <h2>TaskFlow<span>.</span></h2>
        <p className="side-label">MENU</p>
        <div
  className={`nav-item ${activePage === "Dashboard" ? "active" : ""}`}
  onClick={() => setActivePage("Dashboard")}
>
  ▦ &nbsp; Dashboard
</div>

<div
  className={`nav-item ${activePage === "My Tasks" ? "active" : ""}`}
  onClick={() => setActivePage("My Tasks")}
>
  ✓ &nbsp; My Tasks
</div>

<div
  className={`nav-item ${activePage === "Settings" ? "active" : ""}`}
  onClick={() => setActivePage("Settings")}
>
  ⚙ &nbsp; Settings
</div>
        <div className="sidebar-bottom">
          Task Management App<br />Version 1.0
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
           <h1>{activePage}</h1>
<p>
  {activePage === "Dashboard"
    ? "Manage your work and stay organized."
    : activePage === "My Tasks"
    ? "View and manage all your tasks."
    : "Manage your TaskFlow preferences."}
</p> 
          </div>
         <div className="user-profile">
  <div className="profile-details">
    <h4>{user?.name}</h4>
    <span>{user?.email}</span>
  </div>
  <div className="profile">{user?.name?.charAt(0) || "U"}</div>
  <button
    onClick={() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setTasks([]);
    }}
  >
    Logout
  </button>
</div>
        </header>
        {activePage === "Dashboard" && (
          <section className="stats">
          <div className="stat-card">
            <span>Total Tasks</span>
            <h2>{tasks.length}</h2>
            <small>All your tasks</small>
          </div>
          <div className="stat-card">
            <span>Pending</span>
            <h2>{pending}</h2>
            <small>Tasks to complete</small>
          </div>
          <div className="stat-card">
            <span>Completed</span>
            <h2>{completed}</h2>
            <small>Finished tasks</small>
          </div>
        </section>
       )}
      
        {activePage === "My Tasks" && (
        <section className="content">
          <div className="task-panel">
            <h2>My Tasks</h2>
            <p className="muted">Your latest tasks appear here.</p>
         <div className="filter-buttons">
           {["All", "Pending", "In Progress", "Completed"].map((status) => (
             <button
               key={status}
               className={statusFilter === status ? "filter-btn active" : "filter-btn"}
               onClick={() => setStatusFilter(status)}
              >
               {status}
              </button>
            ))}
          </div>
          <div className="search-container">
           <input
             type="text"
             placeholder="Search tasks by title..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="search-input"
           />
        </div>

            {loading ? (
              <p>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="empty">No tasks yet. Add your first task!</p>
            ) : (
              filteredTasks.map(task => (
                <div className="task-row" key={task.id}>
                  <div>
                    <h3>{task.title}</h3>
                    <p>{task.description}</p>

        {task.due_date && (
          <p
            className={`task-due-date ${
              new Date(task.due_date) < new Date() &&
              task.status !== "Completed"
                ? "overdue"
                : ""
            }`}
          >
            Due Date: {new Date(task.due_date).toLocaleDateString("en-IN")}
            {new Date(task.due_date) < new Date() &&
              task.status !== "Completed" && " (Overdue)"}
          </p>
        )}

                    <span className="priority">{task.priority}</span>
                    <span className="status">{task.status}</span>
                  </div>
                  <div className="task-actions">
<select
  value={task.status}
  onChange={(e) => updateStatus(task.id, e.target.value)}
  className="status-select"
>
  <option value="Pending">Pending</option>
  <option value="In Progress">In Progress</option>
  <option value="Completed">Completed</option>
</select>
  <button
    className="edit-btn"
    onClick={() => startEdit(task)}
  >
    Edit
  </button>

  <button
    className="delete-btn"
    onClick={() => deleteTask(task.id)}
  >
    Delete
  </button>
</div>
                </div>
              ))
            )}
          </div>

          <div className="form-panel">
            <h2>{editingTask ? "Edit Task" : "Add New Task"}</h2>
            <p className="muted">Create a task to get started.</p>

            <form onSubmit={saveTask}>
              <label>Task Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />

              <label>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Enter task description"
              />

              <label>Priority</label>
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
<button className="add-btn" type="submit">
  {editingTask ? "Save Changes" : "+ Add Task"}
</button>
            </form>
          </div>
        </section>
        )}
        {activePage === "Settings" && (
          <section className="content">
            <div className="task-panel">
              <h2>Settings</h2>
              <p className="muted">TaskFlow application settings.</p>

              <h3>Application Information</h3>
              <p>Application: Task Management App</p>
              <p>Version: 1.0</p>
              <p>Frontend: React</p>
              <p>Backend: Node.js and Express</p>
              <p>Database: MySQL</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;