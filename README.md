# LearnSmart — AI-Powered Learning Platform & Full-Stack Syllabus Suite

> **Production Deployment:** [https://ai-learning-platform-f13x.onrender.com/](https://ai-learning-platform-f13x.onrender.com/)

LearnSmart is an intelligent, full-stack educational web application powered by **Google Gemini Generative AI**, **Node.js**, **Express.js**, **MongoDB / Mongoose**, and **Passport.js**. The platform provides personalized AI quiz generation, dynamic learning resource roadmaps, student notes management, to-do task tracking, academic progress visualization, and administrative score analytics.

In addition to preserving the entire original LearnSmart user interface and feature set without any visual regression, this repository implements the complete **Full-Stack Practicals 01–08 syllabus**, showcasing isolated implementations across **HTML, CSS, Bootstrap 4, Git/GitHub, React JS with Redux Toolkit, Node.js static hosting, Express CRUD REST APIs, jQuery Mobile, and cloud deployment**.

---

## Table of Contents
1. [Syllabus Practical Mapping & URLs](#syllabus-practical-mapping--urls)
2. [Practical 02 — Git & GitHub Version Control Master Guide](#practical-02--git--github-version-control-master-guide)
3. [Practical 05 — Student Management CRUD REST APIs](#practical-05--student-management-crud-rest-apis)
4. [API Testing Guide (Postman & cURL)](#api-testing-guide-postman--curl)
5. [Practicals Overview (P01, P03, P04, P06, P08)](#practicals-overview)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Installation & Local Setup](#installation--local-setup)
8. [Build & Production Deployment Guide](#build--production-deployment-guide)
9. [Architecture & Zero-Regression Isolation](#architecture--zero-regression-isolation)

---

## Syllabus Practical Mapping & URLs

All practical demonstrations are accessible directly through dedicated, isolated routes on the running server:

| Practical Focus | Technology | Integrated Platform URL | Alias Route | Description |
|---|---|---|---|---|
| **Practical 01** | HTML5, CSS3, Bootstrap 4.6.2 | [`/analytics`](http://localhost:3000/analytics) | `/practical/bootstrap-dashboard` | Academic analytics dashboard with sidebar nav, KPI stat cards, and data tables. |
| **Practical 02** | Git & GitHub Version Control | Documented below in `README.md` | N/A | Comprehensive guide covering repository setup, branching, remote syncing, and `.gitignore`. |
| **Practical 03** | React 18, Vite, Redux Toolkit | [`/students`](http://localhost:3000/students) | `/practical/student-management` | Single Page Application (SPA) utilizing Redux Toolkit store, async thunks, and MongoDB CRUD. |
| **Practical 04** | Node.js & Express.js Static Hosting | [`/courses`](http://localhost:3000/courses) | `/practical/static-site` | Curriculum catalog served via `express.static()` with client-side interactive calculation engine. |
| **Practical 05** | Express.js, MongoDB, Mongoose | [`/api/students`](http://localhost:3000/api/students) | N/A | Complete 4-operation CRUD REST API with validation, duplicate prevention, and standard HTTP codes. |
| **Practical 06** | jQuery Mobile 1.4.5 | [`/mobile`](http://localhost:3000/mobile) | `/practical/mobile` | Touch-optimized mobile web app with side panels, filterable listviews, sliders, and flip switches. |
| **Practical 07** | Node.js Deployment & Diagnostics | [`/health`](http://localhost:3000/health) | N/A | Production-ready health check endpoint, dynamic port binding, and Atlas configuration. |
| **Practical 08** | Full-Stack AI Project (LearnSmart) | [`/`](http://localhost:3000/) | N/A | Core AI-enabled learning platform with Gemini quiz generation, auth, notes, todos, and admin analytics. |

---

## Practical 02 — Git & GitHub Version Control Master Guide

This section outlines practical, step-by-step instructions for managing modern software projects using **Git** and **GitHub**.

### 1. Initializing a Local Git Repository
To start tracking a project with Git:
```bash
# Initialize a new Git repository in the current project root
git init

# Verify the .git hidden directory exists
ls -la .git      # macOS/Linux
Get-ChildItem -Force .git   # Windows PowerShell
```

### 2. Checking Repository Status
To inspect tracked, modified, and untracked files:
```bash
git status
```
- **Untracked files:** New files not yet added to the staging area.
- **Changes to be committed:** Files staged for the next commit.
- **Changes not staged:** Modified files that haven't been staged yet.

### 3. Securing Secrets with `.gitignore`
Never commit API keys, database credentials, or node modules to Git. The project's `.gitignore` contains:
```gitignore
# Dependency directories
node_modules/
practicals/react-student-management/node_modules/

# Environment variables and secrets
.env
.env.local
.env.*.local

# Build artifacts
dist/
build/
practicals/react-student-management/dist/

# OS metadata
.DS_Store
Thumbs.db
```

### 4. Staging and Committing Files
Stage specific files or all changes, and record them with descriptive commit messages:
```bash
# Stage a specific file
git add package.json

# Stage all files in the current directory
git add .

# Commit staged changes with a semantic message
git commit -m "feat(practicals): implement syllabus practicals 1 through 8"
```

### 5. Managing Branches
Branching allows you to build features or practicals in isolation without disturbing the stable `main` branch:
```bash
# List all local branches
git branch

# Create and switch to a new feature branch
git checkout -b feature/practical-03-redux
# Or using modern git:
git switch -c feature/practical-03-redux

# Work on files, then commit:
git add .
git commit -m "feat: add React Redux student management slice"

# Switch back to main branch
git checkout main
# Or:
git switch main

# Merge feature branch into main
git merge feature/practical-03-redux
```

### 6. Connecting to a Remote GitHub Repository
To link your local Git repository to GitHub:
```bash
# Check existing remotes
git remote -v

# Link to a remote GitHub repository (replace with your repo URL)
git remote add origin https://github.com/your-username/learnsmart-syllabus.git

# Verify the remote connection
git remote -v
```

### 7. Pushing Code to GitHub
Push your commits to the remote repository:
```bash
# Push and set upstream branch for the first time
git push -u origin main

# Subsequent pushes on the tracking branch
git push
```

### 8. Pulling Updates & Inspecting Commit History
Collaborate and review history:
```bash
# Fetch and merge updates from the remote repository
git pull origin main

# View one-line visual history graph
git log --oneline --graph --decorate --all

# View detailed diff of recent changes
git diff HEAD~1 HEAD
```

---

## Practical 05 — Student Management CRUD REST APIs

The backend provides a complete RESTful API for student records backed by **MongoDB** and **Mongoose**.

### Data Schema (`models/Student.js`)
| Field | Type | Required | Unique | Description |
|---|---|---|---|---|
| `name` | String | Yes | No | Full name of the student (2-100 characters) |
| `rollNumber` | String | Yes | **Yes** | Alphanumeric roll number (indexed, uppercase) |
| `email` | String | Yes | No | Valid university/personal email address |
| `course` | String | Yes | No | Engineering / Academic department enum |
| `academicYear` | String | Yes | No | 1st Year, 2nd Year, 3rd Year, 4th Year, Postgraduate |
| `createdAt` | Date | Auto | No | Record creation timestamp |
| `updatedAt` | Date | Auto | No | Last update timestamp |

### API Endpoints
| HTTP Method | Route | Description | Success Code | Error Codes |
|---|---|---|---|---|
| `POST` | `/api/students` | **CREATE**: Add a new student record to MongoDB | `201 Created` | `400 Bad Request` |
| `GET` | `/api/students` | **READ**: Retrieve all students (supports `?search=...`) | `200 OK` | `500 Server Error` |
| `GET` | `/api/students/:id` | **READ**: Retrieve a single student by MongoDB `_id` | `200 OK` | `400`, `404 Not Found` |
| `PUT` | `/api/students/:id` | **UPDATE**: Update an existing student record | `200 OK` | `400`, `404 Not Found` |
| `DELETE` | `/api/students/:id` | **DELETE**: Remove a student record permanently | `200 OK` | `400`, `404 Not Found` |

---

## API Testing Guide (Postman & cURL)

### 1. Create Student (`POST /api/students`)
**cURL:**
```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rohan Sharma",
    "rollNumber": "CS-2026-001",
    "email": "rohan.sharma@learnsmart.edu",
    "course": "Computer Science & Engineering",
    "academicYear": "3rd Year"
  }'
```
**Expected Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Student record created successfully.",
  "data": {
    "_id": "6ad5d721c52641b382dee339",
    "name": "Rohan Sharma",
    "rollNumber": "CS-2026-001",
    "email": "rohan.sharma@learnsmart.edu",
    "course": "Computer Science & Engineering",
    "academicYear": "3rd Year",
    "createdAt": "2026-10-19T08:38:57.808Z",
    "updatedAt": "2026-10-19T08:38:57.808Z"
  }
}
```

### 2. Read All Students (`GET /api/students`)
**cURL:**
```bash
curl -X GET http://localhost:3000/api/students
```
**Filter by search term:**
```bash
curl -X GET "http://localhost:3000/api/students?search=Rohan"
```
**Expected Response (`200 OK`):**
```json
{
  "success": true,
  "count": 1,
  "data": [ ... ]
}
```

### 3. Read Single Student (`GET /api/students/:id`)
**cURL:**
```bash
curl -X GET http://localhost:3000/api/students/6ad5d721c52641b382dee339
```

### 4. Update Student (`PUT /api/students/:id`)
**cURL:**
```bash
curl -X PUT http://localhost:3000/api/students/6ad5d721c52641b382dee339 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rohan Sharma",
    "academicYear": "4th Year"
  }'
```
**Expected Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Student record updated successfully.",
  "data": { ... }
}
```

### 5. Delete Student (`DELETE /api/students/:id`)
**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/students/6ad5d721c52641b382dee339
```
**Expected Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Student \"Rohan Sharma\" (CS-2026-001) deleted successfully."
}
```

---

## Practicals Overview

### Practical 01 — Bootstrap 4 Responsive Dashboard
- **Route:** `/practical/bootstrap-dashboard`
- **Features:** Responsive collapsible sidebar navigation, top navigation bar with search and notification counters, KPI stat cards with trend metrics, department enrollment table with progress indicators, quick action buttons, and responsive breakpoints.
- **Engine:** Bootstrap 4.6.2 CSS and JS with jQuery and Popper.js, isolated from the rest of the application.

### Practical 03 — React JS & Redux Toolkit Student Management System
- **Route:** `/practical/student-management`
- **Location:** `practicals/react-student-management/`
- **Architecture:**
  - `src/app/store.js`: Configures centralized Redux Toolkit store.
  - `src/features/students/studentsSlice.js`: Contains `fetchStudents`, `addStudent`, `updateStudent`, and `deleteStudent` async thunks communicating with `/api/students`.
  - `src/features/students/StudentForm.jsx`: Reusable controlled form with validation.
  - `src/features/students/StudentList.jsx`: Searchable and filterable student directory table with edit/delete triggers.
  - `src/App.jsx`: Main interface with live KPI counters and toast alerts.
- **Build:** Built with Vite and served statically by Express in production.

### Practical 04 — Node.js & Express Static Website
- **Route:** `/practical/static-site`
- **Features:** Demonstrates `express.static()` middleware, semantic HTML5 structure, Vanilla CSS custom properties with light/dark theme switching, and client-side JavaScript calculation engine.

### Practical 06 — jQuery Mobile Web Application
- **Route:** `/practical/mobile`
- **Features:** Touch-optimized UI using jQuery Mobile 1.4.5, multi-page single-DOM routing (`#homePage`, `#directoryPage`, `#feedbackPage`, `#aboutPage`), slide-out navigation panel, filterable listview, interactive sliders, and flip switches.

### Practical 08 — AI-Enabled Full-Stack Mini Project (LearnSmart)
- **Route:** `/`
- **Features:** AI Quiz Maker using Google Gemini AI, personalized learning resource recommendations, notes editor, todo tracker, student progress reports, and admin score performance analysis.

---

## Environment Variables Reference

Copy `.env.example` to `.env` to configure your environment:

```ini
# Server Port (default 3000)
PORT=3000

# MongoDB Connection String (Local MongoDB or Atlas)
ATLAS_URL=mongodb://127.0.0.1:27017/learnsmart
# Alternative alias:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/learnsmart

# Google Gemini API Key (Obtain from https://aistudio.google.com/app/apikey)
api_Key=your_gemini_api_key_here

# Express Session Encryption Secret
SESSION_SECRET=learnsmart_super_secret_session_key_2026
```

---

## Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24 LTS recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB Server or MongoDB Atlas cluster connection string

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/FD_Project.git
   cd FD_Project
   ```

2. **Install root server dependencies:**
   ```bash
   npm install
   ```

3. **Install and build the React Student Management System:**
   ```bash
   npm run build:react
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URL and Gemini API key
   ```

5. **Start the Express application:**
   ```bash
   # Production mode:
   npm start

   # Development mode (with nodemon):
   npm run dev
   ```

6. Open your browser and navigate to:
   - LearnSmart Home: `http://localhost:3000/`
   - Health Diagnostic: `http://localhost:3000/health`
   - Bootstrap Dashboard: `http://localhost:3000/practical/bootstrap-dashboard`
   - React + Redux Student Management: `http://localhost:3000/practical/student-management`
   - Static Website: `http://localhost:3000/practical/static-site`
   - jQuery Mobile: `http://localhost:3000/practical/mobile`

---

## Build & Production Deployment Guide

### Deploying to Cloud Hosting (Render / Railway / Heroku)

1. **Push your repository to GitHub** (ensure `.env` is ignored by `.gitignore`).
2. **Create a MongoDB Atlas Cluster:**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Create a database user and whitelist `0.0.0.0/0` (allow access from anywhere).
   - Copy the connection URI: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/learnsmart?retryWrites=true&w=majority`.
3. **Configure the Web Service on Render / Railway:**
   - **Build Command:** `npm install && npm run build:react`
   - **Start Command:** `npm start`
4. **Set Environment Variables on the Cloud Dashboard:**
   - `PORT`: `3000` (or leave default assigned by platform)
   - `ATLAS_URL`: `<your-mongodb-atlas-connection-string>`
   - `api_Key`: `<your-google-gemini-api-key>`
   - `SESSION_SECRET`: `<any-random-secure-string>`
5. **Verify Deployment:**
   - Check the deployment URL: `https://<your-app>.onrender.com/health`
   - Status response must return `{"status":"healthy","database":"connected"}`.

---

## Architecture & Zero-Regression Isolation

```
FD_Project/
├── index.js                     # Express server & route registration
├── package.json                 # Project dependencies & build pipeline
├── .env.example                 # Environment configuration template
├── .gitignore                   # Excludes .env, node_modules, and build artifacts
├── models/
│   ├── profile.js               # Original User schema (quizzes, resources, notes, todos)
│   └── Student.js               # Practical 05 Student CRUD schema with validation
├── routes/
│   └── students.js              # Practical 05 REST API endpoints (GET, POST, PUT, DELETE)
├── practicals/
│   └── react-student-management/# Practical 03 React 18 + Redux Toolkit SPA
│       ├── src/
│       │   ├── app/store.js     # Redux store
│       │   ├── features/students/
│       │   │   ├── studentsSlice.js # Async thunks and student state
│       │   │   ├── StudentForm.jsx  # Controlled form component
│       │   │   └── StudentList.jsx  # Student directory table
│       │   └── App.jsx
│       └── dist/                # Production build served at /practical/student-management
├── public/
│   ├── css/ & js/               # Original LearnSmart assets (untouched)
│   └── practical/
│       ├── bootstrap-dashboard/ # Practical 01 isolated Bootstrap 4 dashboard
│       ├── static-site/         # Practical 04 isolated static website
│       └── mobile/              # Practical 06 isolated jQuery Mobile web app
└── views/                       # Original LearnSmart EJS templates (100% preserved)
```

### Isolation Guarantee:
- No Bootstrap, jQuery Mobile, or React styles are loaded into existing LearnSmart EJS templates.
- Navigation links on the existing LearnSmart navbar were left untouched.
- Existing fonts, colors, layouts, animations, and DOM hierarchies remain bit-for-bit identical to the original repository.
