import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchStudents, clearNotification } from './features/students/studentsSlice';
import StudentForm from './features/students/StudentForm';
import StudentList from './features/students/StudentList';

export default function App() {
  const dispatch = useDispatch();
  const { items, status, notification } = useSelector((state) => state.students);

  // Fetch real students on initial mount
  useEffect(() => {
    dispatch(fetchStudents());
  }, [dispatch]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        dispatch(clearNotification());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, dispatch]);

  // Compute live department breakdown
  const csCount = items.filter((s) => s.course && s.course.includes('Computer')).length;
  const aiCount = items.filter((s) => s.course && s.course.includes('Artificial')).length;

  return (
    <div className="sms-app">
      {/* Unified LearnSmart Shared Navigation Bar */}
      <nav className="ls-navbar">
        <div className="ls-nav-container">
          <a href="/" className="ls-brand">
            <div className="ls-brand-icon">
              <i className="fa-solid fa-brain"></i>
            </div>
            <span>LearnSmart</span>
          </a>

          <ul className="ls-nav-menu" id="lsNavMenu">
            <li>
              <a href="/dashboard" className="ls-nav-link">
                <i className="fa-solid fa-gauge-high"></i> Dashboard
              </a>
            </li>
            <li>
              <a href="/progress" className="ls-nav-link">
                <i className="fa-solid fa-chart-line"></i> Progress
              </a>
            </li>
            <li>
              <a href="/students" className="ls-nav-link active">
                <i className="fa-solid fa-user-graduate"></i> Students
              </a>
            </li>
            <li>
              <a href="/notes" className="ls-nav-link">
                <i className="fa-solid fa-book-open"></i> Notes
              </a>
            </li>
            <li>
              <a href="/todo" className="ls-nav-link">
                <i className="fa-solid fa-list-check"></i> To-Do
              </a>
            </li>
            <li>
              <a href="/quiz" className="ls-nav-link">
                <i className="fa-solid fa-bolt"></i> Quiz
              </a>
            </li>
          </ul>

          <div className="ls-nav-actions">
            <span className="badge-redux" title="Real-time Redux state synced with MongoDB">
              <i className="fa-solid fa-circle-dot" style={{ color: '#10b981' }}></i> Redux Active
            </span>
            <a href="/quiz" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus"></i> New Quiz
            </a>
            <a href="/logout" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
            </a>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="sms-container">
        {/* KPI Summary Banner */}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-icon primary">
              <i className="fa-solid fa-user-graduate"></i>
            </div>
            <div className="stat-info">
              <div className="num">{items.length}</div>
              <div className="label">Total Students Enrolled</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon success">
              <i className="fa-solid fa-laptop-code"></i>
            </div>
            <div className="stat-info">
              <div className="num">{csCount}</div>
              <div className="label">Computer Science Dept</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon warning">
              <i className="fa-solid fa-brain"></i>
            </div>
            <div className="stat-info">
              <div className="num">{aiCount}</div>
              <div className="label">AI & Data Science Dept</div>
            </div>
          </div>
        </div>

        {/* Global Toast Alert */}
        {notification && (
          <div className={`sms-toast ${notification.type}`}>
            <div>
              <i
                className={
                  notification.type === 'success'
                    ? 'fa-solid fa-circle-check'
                    : 'fa-solid fa-circle-exclamation'
                }
                style={{ marginRight: '8px' }}
              ></i>
              {notification.message}
            </div>
            <button
              className="close-toast"
              onClick={() => dispatch(clearNotification())}
              aria-label="Close notification"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Form and List Grid */}
        <div className="sms-main-layout">
          {/* Left Column: Form */}
          <StudentForm />

          {/* Right Column: List & Table */}
          <StudentList />
        </div>
      </main>

      {/* Footer */}
      <footer className="ls-footer">
        <div className="ls-container">
          <p>&copy; {new Date().getFullYear()} LearnSmart &bull; AI-Powered Adaptive Learning & Student Management Platform</p>
        </div>
      </footer>
    </div>
  );
}
