# LearnSmart — AI-Powered Learning Platform

> **Live Deployment:** [https://ai-learning-platform-f13x.onrender.com/](https://ai-learning-platform-f13x.onrender.com/)

**LearnSmart** is an enterprise-grade, integrated, AI-enabled full-stack educational platform built with **Google Gemini Generative AI**, **Node.js**, **Express.js**, **MongoDB / Mongoose**, **React 18 with Redux Toolkit**, **HTML5/CSS3 with Bootstrap 4**, and **Passport.js**. 

LearnSmart is architected as **ONE unified application, ONE server, ONE shared database, and ONE responsive interface**, seamlessly integrating:
- **AI-Powered Learning Engine:** Instant tailored quiz generation and personalized study guides via Google Gemini AI.
- **Student Management System:** Real-time CRUD state management powered by React 18, Redux Toolkit, and MongoDB.
- **Responsive Analytics Dashboard:** Statistics cards, KPI metrics, and Chart.js performance curves utilizing HTML5, CSS3, and Bootstrap 4.
- **Node.js Static & Dynamic Serving:** High-performance static pipeline (`express.static`) alongside EJS server-side rendering.
- **RESTful CRUD Backend:** Complete Mongoose-backed endpoints with validation and standard HTTP response status codes.
- **Touch-Friendly Mobile Experience:** Mobile swipe gestures, responsive drawer, focus study view, and touch-optimized topic filters.
- **Robust Authentication & Sessions:** Passport.js Local Strategy with persistent MongoDB session store (`connect-mongo`).
- **Production Health Monitoring:** Live diagnostic endpoint (`/health`) tracking database readiness, uptime, and memory.
- **Git & GitHub Version Control:** Complete professional version control workflows and best practices.

---

## Table of Contents
1. [Platform Architecture & Unified Routing](#platform-architecture--unified-routing)
2. [Git & GitHub Version Control Master Guide](#git--github-version-control-master-guide)
3. [Student Management CRUD REST APIs](#student-management-crud-rest-apis)
4. [API Testing Guide (cURL & Postman)](#api-testing-guide-curl--postman)
5. [Core Technology Integrations](#core-technology-integrations)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Installation & Local Setup](#installation--local-setup)
8. [Build & Single-Deployment Guide](#build--single-deployment-guide)

---

## Platform Architecture & Unified Routing

All features operate under a single domain and coordinated navigation hierarchy:

| Feature Area | Technology Stack | Integrated URL | Description |
|---|---|---|---|
| **Home Landing Page** | EJS, Vanilla CSS, Inter Typography | [`/`](http://localhost:3000/) | Hero presentation, feature showcase, dynamic auth links, and AI assessment CTA. |
| **Learning Dashboard** | HTML5, CSS3, Bootstrap 4 Grid, Chart.js | [`/dashboard`](http://localhost:3000/dashboard) | KPI statistics cards, performance charts, topic completion summaries, and AI insights. |
| **Student Management** | React 18, Redux Toolkit, MongoDB | [`/students`](http://localhost:3000/students) | Interactive directory with Add, Edit, Delete, Search, and Department filters. |
| **AI Quiz Generator** | Google Gemini Generative AI, EJS | [`/quiz`](http://localhost:3000/quiz) | Automated multi-choice quiz engine with custom difficulty calibration. |
| **Academic Progress** | EJS, Canvas Chart.js, HTML2PDF | [`/progress`](http://localhost:3000/progress) | Historical assessment timeline, downloadable PDF reports, and topic mastery. |
| **Student Notes** | Express, MongoDB, EJS | [`/notes`](http://localhost:3000/notes) | Personal study notepad with real-time create, update, and delete support. |
| **To-Do Task Tracker** | Express, MongoDB, EJS | [`/todo`](http://localhost:3000/todo) | Daily study agenda with task completion toggles and quick additions. |
| **Student REST APIs** | Express.js, Mongoose, MongoDB | [`/api/students`](http://localhost:3000/api/students) | Standard REST CRUD endpoints with validation and error handling. |
| **Health Diagnostics** | Node.js, Express.js, Mongoose | [`/health`](http://localhost:3000/health) | Real-time service uptime, MongoDB connection state, and ISO timestamps. |
| **Admin Score Analytics** | Express, Mongoose Aggregations, EJS | [`/admin/scores`](http://localhost:3000/admin/scores) | Multi-student score comparison matrix and cohort analytics for educators. |

---

## Git & GitHub Version Control Master Guide

This section outlines best practices and command-line procedures for version-controlling full-stack software applications with **Git** and **GitHub**.

### 1. Initializing a Local Git Repository
To initialize version tracking in a project root:
```bash
# Initialize a Git repository
git init

# Verify the .git directory exists
ls -la .git                 # Linux / macOS
Get-ChildItem -Force .git   # Windows PowerShell
```

### 2. Checking Repository Status
To inspect tracked, modified, and untracked files:
```bash
git status
```
- **Untracked files:** New files created on disk not yet tracked by Git.
- **Changes to be committed (Staged):** Files added to the index via `git add`.
- **Changes not staged:** Modifications to existing tracked files not yet staged.

### 3. Securing Secrets with `.gitignore`
Sensitive credentials, build outputs, and third-party dependencies must never be committed. LearnSmart's `.gitignore` contains:
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

### 4. Staging and Committing Changes
Stage specific files or all changes with informative, semantic commit messages:
```bash
# Stage all modified and new files
git add .

# Commit staged changes with a semantic message
git commit -m "feat(core): combine all platform capabilities into unified LearnSmart platform"
```

### 5. Managing Branches
Branches allow developing features in complete isolation without disturbing the production `main` branch:
```bash
# List all local branches (* marks current branch)
git branch

# Create and switch to a new feature branch
git checkout -b feature/student-management-redux
# Or using modern git:
git switch -c feature/student-management-redux

# Work on code, stage and commit
git add .
git commit -m "feat(students): integrate Redux Toolkit store and CRUD operations"

# Return to main branch
git checkout main
# Or:
git switch main

# Merge the feature branch into main
git merge feature/student-management-redux

# Delete feature branch after merge
git branch -d feature/student-management-redux
```

### 6. Working with Remote Repositories (GitHub)
Connect your local repository to a remote GitHub repository:
```bash
# Verify existing remotes
git remote -v

# Link to GitHub remote (HTTPS or SSH)
git remote add origin https://github.com/<your-username>/LearnSmart.git

# Set the default upstream branch to main
git branch -M main

# Push code to GitHub
git push -u origin main
```

### 7. Pulling, Syncing and Resolving Conflicts
Collaborate by syncing changes from team members:
```bash
# Fetch latest remote references
git fetch origin

# Pull remote changes into current branch
git pull origin main

# If merge conflicts occur:
# 1. Open conflicted files and resolve <<<<<<< HEAD markers
# 2. Stage resolved files:
git add <resolved-file>
# 3. Finalize the merge commit:
git commit -m "merge: resolve branch conflicts"
```

### 8. Inspecting History & Undoing Mistakes
```bash
# View concise, one-line commit log
git log --oneline -n 10

# View detailed file changes
git log -p -2

# Discard unstaged working directory changes for a file
git checkout -- <filename>
# Or:
git restore <filename>

# Unstage a file from the staging area without losing changes
git reset HEAD <filename>
# Or:
git restore --staged <filename>
```

---

## Student Management CRUD REST APIs

All student management actions execute through RESTful endpoints backed by MongoDB and Mongoose:

| HTTP Method | Endpoint | Description | Request Body | Success Status |
|---|---|---|---|---|
| `GET` | `/api/students` | Get all students (supports `?search=`, `?course=`, `?academicYear=`) | None | `200 OK` |
| `GET` | `/api/students/:id` | Get single student by 24-character MongoDB `_id` | None | `200 OK` |
| `POST` | `/api/students` | Create new student record with schema validation | Student JSON object | `201 Created` |
| `PUT` | `/api/students/:id` | Update existing student record fields | Fields to update | `200 OK` |
| `DELETE` | `/api/students/:id` | Delete student record by MongoDB `_id` | None | `200 OK` |

### Data Model Schema (`models/Student.js`)
```javascript
{
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  course: { 
    type: String, 
    required: true, 
    enum: [
      "Computer Science & Engineering",
      "Information Technology",
      "Artificial Intelligence & Data Science",
      "Electronics & Telecommunication",
      "Mechanical Engineering",
      "Civil Engineering",
      "Electrical Engineering",
      "Other"
    ]
  },
  academicYear: { 
    type: String, 
    required: true, 
    enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"] 
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Testing Guide (cURL & Postman)

### 1. Create a Student Record (`POST /api/students`)
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
    "createdAt": "2026-10-21T08:00:00.000Z",
    "updatedAt": "2026-10-21T08:00:00.000Z"
  }
}
```

### 2. Fetch All Students (`GET /api/students`)
**cURL:**
```bash
curl -X GET http://localhost:3000/api/students
```
**Filtered Query:**
```bash
curl -X GET "http://localhost:3000/api/students?course=Computer%20Science%20%26%20Engineering&search=Rohan"
```

### 3. Fetch Single Student (`GET /api/students/:id`)
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

### 5. Delete Student (`DELETE /api/students/:id`)
**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/students/6ad5d721c52641b382dee339
```

---

## Core Technology Integrations

### 1. HTML5, CSS3 & Bootstrap 4 Responsive Dashboard
- Integrated directly into `views/dashboard.ejs`.
- Uses Bootstrap 4.6.2 responsive grid classes (`row`, `col-12 col-sm-6 col-lg-3`, `h-100`) to present responsive statistics cards (Overall Score, Topics Covered, Quizzes Completed, Best Score).
- Preserves the custom LearnSmart theme (Inter font, gradients, cards, and smooth CSS transitions) without global stylesheet conflicts.

### 2. React 18 & Redux Toolkit Student Management
- Located in `practicals/react-student-management/` and built into `dist/`.
- Served by the Express application at `/students`.
- Configured with a Redux Toolkit centralized store (`app/store.js`) and `studentsSlice.js`.
- Features asynchronous thunks (`fetchStudents`, `addStudent`, `updateStudent`, `deleteStudent`) interacting with `/api/students`.
- Controlled form validation, live department KPI counters, searchable directory, and toast notifications.

### 3. Node.js & Express Static Pipeline
- Static files served via `app.use(express.static(path.join(__dirname, "public")))` and `app.use("/assets", express.static(...))`.
- Serves CSS stylesheets, client scripts, icons, images, and the React production bundle from one Express process.

### 4. Touch-Friendly Mobile Experience
- Responsive breakpoints (`@media (max-width: 768px)` and `@media (max-width: 576px)`) across all views.
- Mobile quick-filter study bar for instant real-time quiz topic search.
- Focus View flip switch to simplify views for reading on small screens.
- Touch swipe gesture detection for opening and closing the mobile navigation drawer.

### 5. Google Gemini AI Quiz & Resource Generation
- Integrated with `@google/generative-ai` (`gemini-2.5-flash`).
- Dynamic 5-question multi-choice quiz generation formatted directly in strict JSON.
- Automated performance analysis with tailored study roadmaps and practice questions based on individual user scores.

### 6. Deployment & Health Monitoring
- Single-deployment architecture configured for cloud platforms like Render, Railway, AWS, or Heroku.
- Health diagnostics at `/health` providing real-time database connection state, process uptime, and memory status.

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

# Express Session Secret
SESSION_SECRET=learnsmart_super_secret_session_key_2026
```

---

## Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB Server or MongoDB Atlas connection URI

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/FD_Project.git
   cd FD_Project
   ```

2. **Install root dependencies:**
   ```bash
   npm install
   ```

3. **Install React Student Management dependencies & build bundle:**
   ```bash
   npm --prefix practicals/react-student-management install
   npm run build
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Populate .env with your MongoDB URI and Gemini API key
   ```

5. **Start the application:**
   ```bash
   # Production mode:
   npm start

   # Development mode:
   npm run dev
   ```

6. **Access the unified platform:**
   - LearnSmart Home: `http://localhost:3000/`
   - Learning Dashboard: `http://localhost:3000/dashboard`
   - Student Management: `http://localhost:3000/students`
   - Student Notes: `http://localhost:3000/notes`
   - Study To-Do List: `http://localhost:3000/todo`
   - AI Quiz Generator: `http://localhost:3000/quiz`
   - Progress & Reports: `http://localhost:3000/progress`
   - Health Diagnostic: `http://localhost:3000/health`
   - Student CRUD API: `http://localhost:3000/api/students`

---

## Build & Single-Deployment Guide

The application builds and deploys as **one unified web application**:
1. **Build Step:** `npm run build` compiles the React 18 / Redux student management frontend into `practicals/react-student-management/dist`.
2. **Start Step:** `npm start` executes `node index.js`, which serves the dynamic EJS pages, the React production build, the REST APIs, and connects to MongoDB.
3. **Environment:** Set `PORT`, `ATLAS_URL`, `api_Key`, and `SESSION_SECRET` in your cloud deployment settings.
