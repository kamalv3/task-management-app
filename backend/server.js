
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// User Registration
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const [existingUsers] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        res.status(201).json({
            message: "Registration successful!",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// User Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed"
        });
    }
});





// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. Please login."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({
                message: "Invalid or expired token"
            });
        }

        req.user = user;
        next();
    });
}
// Home route
app.get("/", (req, res) => {
    res.send("Task Management API is running!");
});

// Create a new task
app.post("/api/tasks", authenticateToken, async (req, res) => {
    try {
        const {
            title,
            description,
            priority = "Medium",
            status = "Pending",
            due_date = null
        } = req.body;

        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required"
            });
        }

        const validPriorities = ["Low", "Medium", "High"];
        const validStatuses = [
            "Pending",
            "In Progress",
            "Completed"
        ];

        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Invalid priority"
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const sql = `
    INSERT INTO tasks
    (title, description, priority, status, due_date, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
`;

const [result] = await db.execute(sql, [
    title.trim(),
    description || null,
    priority,
    status,
    due_date || null,
    req.user.id
]);

        res.status(201).json({
            message: "Task created successfully!",
            task: {
                id: result.insertId,
                title: title.trim(),
                description: description || null,
                priority,
                status,
                due_date: due_date || null
            }
        });

    } catch (error) {
        console.error("Create task error:", error);

        res.status(500).json({
            message: "Failed to create task"
        });
    }
});

// Get all tasks
app.get("/api/tasks", authenticateToken, async (req, res) => {
    try {
       const [tasks] = await db.execute(
    "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
);

        res.status(200).json({
            message: "Tasks retrieved successfully!",
            count: tasks.length,
            tasks: tasks
        });

    } catch (error) {
        console.error("Get tasks error:", error);

        res.status(500).json({
            message: "Failed to retrieve tasks"
        });
    }
});
    // Update an existing task
app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            priority,
            status,
            due_date
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Task title is required"
            });
        }

      const sql = `
    UPDATE tasks
    SET title = ?, description = ?, priority = ?,
        status = ?, due_date = ?
    WHERE id = ? AND user_id = ?
`;

       const [result] = await db.execute(sql, [
    title.trim(),
    description || null,
    priority,
    status,
    due_date || null,
    id,
    req.user.id
]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({
            message: "Task updated successfully!"
        });

    } catch (error) {
        console.error("Update task error:", error);

        res.status(500).json({
            message: "Failed to update task"
        });
    }
});
     // Delete a task
app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

       const [result] = await db.execute(
    "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    [id, req.user.id]
);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully!"
        });

    } catch (error) {
        console.error("Delete task error:", error);

        res.status(500).json({
            message: "Failed to delete task"
        });
    }
});
    const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

