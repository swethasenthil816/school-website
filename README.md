# 🎓 EduPortal – School Management System

A full-stack School Management Website built with **HTML, CSS, JavaScript, Node.js, Express.js, and MySQL**.

---

## 📁 Project Structure

```
school-website/
│
├── public/
│   ├── index.html       ← Main login page (student + teacher portals)
│   ├── style.css        ← All styles (dark theme, glassmorphism)
│   ├── script.js        ← Frontend JavaScript (login handlers, fetch API)
│   └── dashboard.html   ← Admin dashboard (login history)
│
├── server.js            ← Express backend server + MySQL API
├── package.json         ← Node.js dependencies
└── README.md            ← This file
```

---

## ⚙️ Setup Instructions (Step-by-Step)

### Step 1: Install Node.js
Download and install from: https://nodejs.org/

### Step 2: Install MySQL
Download MySQL Community Server: https://dev.mysql.com/downloads/mysql/

Start MySQL and note your **root password**.

### Step 3: Configure Database Password

Open **server.js** and find this line (around line 30):

```js
password: 'your_password', // <-- Change this to your MySQL password
```

Replace `your_password` with your actual MySQL root password.

### Step 4: Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### Step 5: Start the Server

```bash
node server.js
```

You should see:
```
✅ Connected to MySQL Server
✅ Database "school_db" ready
✅ Table "students" ready
✅ Table "teachers" ready
✅ Table "student_login_history" ready
✅ Table "teacher_login_history" ready
✅ Default teachers inserted
✅ Default students inserted
🚀 Server running at: http://localhost:3000
```

### Step 6: Open the Website

Go to: **http://localhost:3000**

---

## 🔑 Default Login Credentials

### Teachers
| Username  | Password  |
|-----------|-----------|
| admin     | admin123  |
| teacher1  | pass123   |

### Students
| Student Name   | Register No |
|----------------|-------------|
| Alice Johnson  | REG001      |
| Bob Smith      | REG002      |
| Carol Davis    | REG003      |

---

## 🌐 Pages

| Page                        | URL                              |
|-----------------------------|----------------------------------|
| Main Login Page             | http://localhost:3000            |
| Admin Dashboard             | http://localhost:3000/dashboard.html |

---

## 📡 API Endpoints

| Method | Endpoint           | Description                        |
|--------|--------------------|------------------------------------|
| POST   | /student-login     | Validate student & log login       |
| POST   | /teacher-login     | Validate teacher & log login       |
| GET    | /teacher-history   | Get unique teacher logins          |
| GET    | /student-history   | Get unique student logins          |

---

## 🗄️ Database: `school_db`

### Table: `students`
| Column       | Type         | Description        |
|--------------|--------------|--------------------|
| id           | INT (PK)     | Auto-increment ID  |
| student_name | VARCHAR(100) | Full name          |
| reg_no       | VARCHAR(50)  | Unique reg number  |
| created_at   | TIMESTAMP    | Creation time      |

### Table: `teachers`
| Column    | Type         | Description        |
|-----------|--------------|--------------------|
| id        | INT (PK)     | Auto-increment ID  |
| username  | VARCHAR(100) | Unique username    |
| password  | VARCHAR(255) | Plain text (demo)  |
| created_at| TIMESTAMP    | Creation time      |

### Table: `student_login_history`
| Column       | Type         | Description        |
|--------------|--------------|--------------------|
| id           | INT (PK)     | Auto-increment ID  |
| student_name | VARCHAR(100) | Student name       |
| reg_no       | VARCHAR(50)  | Register number    |
| login_time   | TIMESTAMP    | Login timestamp    |

### Table: `teacher_login_history`
| Column     | Type         | Description        |
|------------|--------------|--------------------|
| id         | INT (PK)     | Auto-increment ID  |
| username   | VARCHAR(100) | Teacher username   |
| login_time | TIMESTAMP    | Login timestamp    |

---

## ✨ Features

- ✅ Dual login system (Student + Teacher)
- ✅ MySQL database auto-setup on first run
- ✅ Login history tracking (every login recorded)
- ✅ Admin dashboard with unique entries (GROUP BY)
- ✅ Latest login time displayed
- ✅ Password never shown in dashboard/history
- ✅ Auto-refreshing dashboard (every 30 seconds)
- ✅ Dark glassmorphism UI design
- ✅ Fully responsive (mobile + desktop)
- ✅ XSS protection on dashboard

---

## 🛠️ Technologies Used

| Layer     | Technology          |
|-----------|---------------------|
| Frontend  | HTML5, CSS3, Vanilla JS |
| Backend   | Node.js, Express.js |
| Database  | MySQL               |
| Packages  | mysql2, cors, body-parser |
| Fonts     | Google Fonts (Inter, Outfit) |
