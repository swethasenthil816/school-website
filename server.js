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
// MySQL Database Connection (Serverless-friendly with connection pool)
// Uses environment variables for deployment (Railway, Render, etc.)
// -------------------------------------------------------
const isCloudDB = !!process.env.MYSQLHOST;

const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'swetha17',
  port: parseInt(process.env.MYSQLPORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 5000  // 5 second timeout — fail fast, don't hang
};

// Set database for cloud, skip for local (we create it)
if (process.env.MYSQLDATABASE) {
  dbConfig.database = process.env.MYSQLDATABASE;
}

// Cloud MySQL providers (Railway) require SSL
if (isCloudDB) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

// Use a connection pool (better for serverless — reuses connections)
const pool = mysql.createPool(dbConfig);

// Track if tables have been created
let tablesReady = false;

// -------------------------------------------------------
// DEBUG endpoint — NO DB needed, always responds immediately
// -------------------------------------------------------
app.get('/api/debug', (req, res) => {
  res.json({
    cloud_mode: isCloudDB,
    env_vars: {
      MYSQLHOST: process.env.MYSQLHOST ? '✅ SET (' + process.env.MYSQLHOST + ')' : '❌ NOT SET',
      MYSQLUSER: process.env.MYSQLUSER ? '✅ SET' : '❌ NOT SET',
      MYSQLPASSWORD: process.env.MYSQLPASSWORD ? '✅ SET' : '❌ NOT SET',
      MYSQLDATABASE: process.env.MYSQLDATABASE ? '✅ SET (' + process.env.MYSQLDATABASE + ')' : '❌ NOT SET',
      MYSQLPORT: process.env.MYSQLPORT ? '✅ SET (' + process.env.MYSQLPORT + ')' : '❌ NOT SET'
    },
    tables_ready: tablesReady,
    config_host: dbConfig.host,
    config_port: dbConfig.port,
    config_database: dbConfig.database || '(not set)',
    ssl_enabled: !!dbConfig.ssl
  });
});

// -------------------------------------------------------
// Ensure tables exist (lazy — only runs on first API call)
// -------------------------------------------------------
function ensureTables(callback) {
  if (tablesReady) return callback();

  const queries = [
    `CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_name VARCHAR(100) NOT NULL,
      reg_no VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS student_login_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_name VARCHAR(100) NOT NULL,
      reg_no VARCHAR(50) NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS teacher_login_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  let completed = 0;
  let hasError = false;
  for (const q of queries) {
    pool.query(q, (err) => {
      if (err && !hasError) {
        hasError = true;
        console.error('❌ Table creation error:', err.message);
        return callback(err);
      }
      completed++;
      if (completed === queries.length && !hasError) {
        tablesReady = true;
        console.log('✅ All tables ready');
        callback();
      }
    });
  }
}

// For local only: create database at startup (non-blocking for cloud)
if (!isCloudDB) {
  const tempDb = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port
  });
  tempDb.query('CREATE DATABASE IF NOT EXISTS school_db', (err) => {
    if (err) console.error('❌ Create DB error:', err.message);
    else console.log('✅ Database "school_db" ready');
    tempDb.end();
  });
}

// -------------------------------------------------------
// Middleware: check DB connection + ensure tables (with timeout)
// -------------------------------------------------------
const checkDbConnection = (req, res, next) => {
  const timeout = setTimeout(() => {
    return res.status(500).json({
      success: false,
      message: 'Database connection timed out (5s). Check your MySQL credentials.',
      error: 'TIMEOUT'
    });
  }, 5000);

  pool.query('SELECT 1', (err) => {
    clearTimeout(timeout);
    if (err) {
      console.error('❌ DB check failed:', err.message, '| Code:', err.code);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed.',
        error: err.message
      });
    }
    // Ensure tables exist on first successful connection
    ensureTables((tableErr) => {
      if (tableErr) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create tables.',
          error: tableErr.message
        });
      }
      next();
    });
  });
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
  pool.query(upsertQuery, [name, regNo], (err) => {
    if (err) {
      console.error('DB Error (student upsert):', err.message);
      return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }

    // Log this login in student_login_history
    const logQuery = 'INSERT INTO student_login_history (student_name, reg_no) VALUES (?, ?)';
    pool.query(logQuery, [name, regNo], (err) => {
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
  pool.query(upsertQuery, [user, password], (err) => {
    if (err) {
      console.error('DB Error (teacher upsert):', err.message);
      return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }

    // Log this login in teacher_login_history
    const logQuery = 'INSERT INTO teacher_login_history (username) VALUES (?)';
    pool.query(logQuery, [user], (err) => {
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

  pool.query(query, (err, results) => {
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

  pool.query(query, (err, results) => {
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
