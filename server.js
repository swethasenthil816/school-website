// ============================================================
//  server.js - Main Backend Server for School Management System
//  Uses: Express, MySQL2, CORS, Body-Parser
//  Port: 3000
// ============================================================

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// -------------------------------------------------------
// Middleware Setup
// -------------------------------------------------------
app.use(cors());                          // Allow cross-origin requests
app.use(bodyParser.json());              // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from /public

// -------------------------------------------------------
// MySQL Database Connection
// Uses environment variables for deployment (Railway, Render, etc.)
// For local development, set these in a .env file or use defaults
// -------------------------------------------------------
const db = mysql.createConnection({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'swetha17',
  database: process.env.MYSQLDATABASE || 'school_db',
  port: process.env.MYSQLPORT || 3306,
  multipleStatements: true  // Allows running multiple SQL statements at once
});

// -------------------------------------------------------
// Step 1: Connect to MySQL Server (without selecting a DB)
// -------------------------------------------------------
let dbConnected = false;
let dbError = null;

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    dbError = err.message;
    dbConnected = false;
    return;
  }
  console.log('✅ Connected to MySQL Server');

  // Step 2: Create the database if it doesn't exist
  db.query('CREATE DATABASE IF NOT EXISTS school_db', (err) => {
    if (err) {
      console.error('❌ Failed to create database:', err.message);
      dbError = err.message;
      dbConnected = false;
      return;
    }
    console.log('✅ Database "school_db" ready');

    // Step 3: Switch to school_db
    db.changeUser({ database: 'school_db' }, (err) => {
      if (err) {
        console.error('❌ Failed to switch database:', err.message);
        dbError = err.message;
        dbConnected = false;
        return;
      }

      // Step 4: Create all required tables
      dbConnected = true;
      dbError = null;
      createTables();
    });
  });
});

// -------------------------------------------------------
// Step 4: Create Tables if They Don't Exist
// -------------------------------------------------------
function createTables() {
  const createStudentsTable = `
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_name VARCHAR(100) NOT NULL,
      reg_no VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createTeachersTable = `
    CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createStudentLoginHistoryTable = `
    CREATE TABLE IF NOT EXISTS student_login_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_name VARCHAR(100) NOT NULL,
      reg_no VARCHAR(50) NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createTeacherLoginHistoryTable = `
    CREATE TABLE IF NOT EXISTS teacher_login_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Run all table creation queries
  db.query(createStudentsTable, (err) => {
    if (err) { console.error('❌ Error creating students table:', err.message); return; }
    console.log('✅ Table "students" ready');
  });

  db.query(createTeachersTable, (err) => {
    if (err) { console.error('❌ Error creating teachers table:', err.message); return; }
    console.log('✅ Table "teachers" ready');
  });

  db.query(createStudentLoginHistoryTable, (err) => {
    if (err) { console.error('❌ Error creating student_login_history table:', err.message); return; }
    console.log('✅ Table "student_login_history" ready');
  });

  db.query(createTeacherLoginHistoryTable, (err) => {
    if (err) { console.error('❌ Error creating teacher_login_history table:', err.message); return; }
    console.log('✅ Table "teacher_login_history" ready');
  });

  console.log('');
  console.log('🚀 Server running at: http://localhost:' + PORT);
  console.log('📌 Open access mode: any student name/reg_no and any teacher username/password will work.');
  console.log('');
}

// -------------------------------------------------------
// Middleware to check database connection status
// -------------------------------------------------------
const checkDbConnection = (req, res, next) => {
  if (!dbConnected) {
    return res.status(500).json({
      success: false,
      message: 'Database connection is not established. If you are running on Vercel, please make sure you have set up your cloud MySQL database and configured the environment variables (MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT) in the Vercel Dashboard.',
      error: dbError
    });
  }
  next();
};

// ============================================================
//  API ROUTES
// ============================================================

// -------------------------------------------------------
// POST /student-login
// OPEN ACCESS: Any student_name + reg_no is accepted.
// - If the student doesn't exist yet → auto-register them.
// - Then log the login in student_login_history.
// -------------------------------------------------------
app.post('/student-login', checkDbConnection, (req, res) => {
  const { student_name, reg_no } = req.body;

  // Validate: both fields must be non-empty
  if (!student_name || !student_name.trim() || !reg_no || !reg_no.trim()) {
    return res.status(400).json({ success: false, message: 'Please enter both Student Name and Register Number.' });
  }

  const name = student_name.trim();
  const regNo = reg_no.trim();

  // Auto-register the student if they don't exist yet (INSERT IGNORE skips duplicate reg_no)
  const upsertQuery = 'INSERT IGNORE INTO students (student_name, reg_no) VALUES (?, ?)';
  db.query(upsertQuery, [name, regNo], (err) => {
    if (err) {
      console.error('DB Error (student upsert):', err.message);
      return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }

    // Log this login in student_login_history
    const logQuery = 'INSERT INTO student_login_history (student_name, reg_no) VALUES (?, ?)';
    db.query(logQuery, [name, regNo], (err) => {
      if (err) console.error('Error logging student login:', err.message);
    });

    // Return success
    return res.json({
      success: true,
      message: 'Login successful!',
      student: {
        name: name,
        reg_no: regNo
      }
    });
  });
});

// -------------------------------------------------------
// POST /teacher-login
// OPEN ACCESS: Any username + password is accepted.
// - If the teacher doesn't exist yet → auto-register them.
// - Then log the login in teacher_login_history.
// -------------------------------------------------------
app.post('/teacher-login', checkDbConnection, (req, res) => {
  const { username, password } = req.body;

  // Validate: both fields must be non-empty
  if (!username || !username.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Please enter both Username and Password.' });
  }

  const user = username.trim();

  // Auto-register the teacher if username doesn't exist yet.
  // INSERT IGNORE skips the insert if username already exists (keeps original password).
  const upsertQuery = 'INSERT IGNORE INTO teachers (username, password) VALUES (?, ?)';
  db.query(upsertQuery, [user, password], (err) => {
    if (err) {
      console.error('DB Error (teacher upsert):', err.message);
      return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }

    // Log this login in teacher_login_history
    const logQuery = 'INSERT INTO teacher_login_history (username) VALUES (?)';
    db.query(logQuery, [user], (err) => {
      if (err) console.error('Error logging teacher login:', err.message);
    });

    // Return success (never send the password back)
    return res.json({
      success: true,
      message: 'Login successful!',
      teacher: {
        username: user
      }
    });
  });
});

// -------------------------------------------------------
// GET /teacher-history
// Returns unique teacher login history with latest login time
// Uses GROUP BY to show only one entry per teacher
// -------------------------------------------------------
app.get('/teacher-history', checkDbConnection, (req, res) => {
  const query = `
    SELECT 
      MIN(username) AS username,
      MAX(login_time) AS latest_login,
      COUNT(*) AS total_logins
    FROM teacher_login_history
    GROUP BY LOWER(TRIM(username))
    ORDER BY latest_login DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('DB Error (teacher-history):', err.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch teacher history.' });
    }
    return res.json({ success: true, data: results });
  });
});

// -------------------------------------------------------
// GET /student-history
// Returns unique student login history with latest login time
// Uses GROUP BY to show only one entry per student
// -------------------------------------------------------
app.get('/student-history', checkDbConnection, (req, res) => {
  const query = `
    SELECT 
      MIN(student_name) AS student_name,
      MIN(reg_no) AS reg_no,
      MAX(login_time) AS latest_login,
      COUNT(*) AS total_logins
    FROM student_login_history
    GROUP BY LOWER(TRIM(student_name)), LOWER(TRIM(reg_no))
    ORDER BY latest_login DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('DB Error (student-history):', err.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch student history.' });
    }
    return res.json({ success: true, data: results });
  });
});

// -------------------------------------------------------
// GET /admin-dashboard
// Serves the admin dashboard page
// -------------------------------------------------------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// -------------------------------------------------------
// Start the Express Server (only when running locally, not on Vercel)
// -------------------------------------------------------
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ Express server started on port ${PORT}`);
  });
}

// Export the app for Vercel serverless deployment
module.exports = app;
