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
      {/* Top Navbar */}
      <header className="sms-navbar">
        <div className="sms-brand">
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sms-logo-icon">
              LS
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--dark)' }}>LearnSmart</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student Management System</span>
            </div>
          </a>
        </div>

        <div className="sms-nav-actions">
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href="/dashboard" className="btn-link-home"><i className="fa-solid fa-chart-bar"></i> Dashboard</a>
            <a href="/notes" className="btn-link-home"><i className="fa-solid fa-sticky-note"></i> Notes</a>
            <a href="/todo" className="btn-link-home"><i className="fa-solid fa-tasks"></i> To-Do</a>
            <a href="/quiz" className="btn-link-home"><i className="fa-solid fa-brain"></i> Quiz</a>
            <a href="/" className="btn-link-home" style={{ background: '#f1f5f9', fontWeight: 'bold' }}><i className="fa-solid fa-house"></i> Home</a>
          </nav>
          <span className="badge-redux">
            <i className="fa-solid fa-bolt"></i> Redux Active
          </span>
        </div>
      </header>

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
      <footer className="sms-footer">
        &copy; {new Date().getFullYear()} LearnSmart &bull; Student Management System &bull; Powered by React, Redux & MongoDB
      </footer>
    </div>
  );
}
