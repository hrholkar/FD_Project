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
    <div className="ls-app-layout">
      {/* Black Navigation Sidebar (Strict Match to Reference Image 1) */}
      <aside className="ls-sidebar">
        <a href="/admin/dashboard" className="ls-sidebar-brand">
          <div className="ls-sidebar-brand-mark">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="ls-sidebar-brand-title">LearnSmart</span>
            <span className="ls-sidebar-role-badge">ADMIN</span>
          </div>
        </a>

        <ul className="ls-sidebar-nav">
          <li>
            <a href="/admin/dashboard" className="ls-sidebar-link">
              <i className="fa-solid fa-table-cells-large"></i>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="/admin/students" className="ls-sidebar-link active">
              <i className="fa-solid fa-users-gear"></i>
              <span>Students</span>
            </a>
          </li>
          <li>
            <a href="/admin/analytics" className="ls-sidebar-link">
              <i className="fa-solid fa-chart-pie"></i>
              <span>Analytics</span>
            </a>
          </li>
          <li>
            <a href="/admin/scores" className="ls-sidebar-link">
              <i className="fa-solid fa-table-list"></i>
              <span>Quiz Performance</span>
            </a>
          </li>
          <li>
            <a href="/admin/dashboard#resources" className="ls-sidebar-link">
              <i className="fa-solid fa-folder-open"></i>
              <span>Manage Resources</span>
            </a>
          </li>
          <li>
            <a href="/admin/dashboard#settings" className="ls-sidebar-link">
              <i className="fa-solid fa-gear"></i>
              <span>Settings</span>
            </a>
          </li>
        </ul>

        {/* Sidebar Sticker Card (Matching Image 1 Bottom-Right) */}
        <div className="ls-sidebar-sticker">
          <div className="ls-sidebar-sticker-text">EMPOWER STUDENTS<br />BUILD FUTURES</div>
          <div className="ls-sidebar-sticker-sub">ADMINISTRATION HUB</div>
          <i className="fa-solid fa-arrow-trend-up ls-sidebar-sticker-icon"></i>
        </div>
      </aside>

      {/* Main Area */}
      <div className="ls-main-area">
        {/* Browser Top Bar */}
        <header className="ls-browser-bar">
          <div className="ls-browser-left">
            <div className="ls-browser-dots">
              <div className="ls-browser-dot red" title="Close"></div>
              <div className="ls-browser-dot yellow" title="Minimize"></div>
              <div className="ls-browser-dot green" title="Expand"></div>
            </div>

            <div className="ls-search-bar">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search students, departments, records..." />
            </div>
          </div>

          <div className="ls-browser-right">
            <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
              <i className="fa-solid fa-circle-dot" style={{ color: '#22A65A', marginRight: '4px' }}></i> Redux Active
            </span>

            <div className="ls-user-profile-badge">
              <div className="ls-user-avatar">A</div>
              <div className="ls-user-info-text">
                <span className="ls-user-name">Admin</span>
                <span className="ls-user-role">Administrator</span>
              </div>
            </div>

            <a href="/logout" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              <span>Logout</span>
            </a>
          </div>
        </header>

        {/* Content Container */}
        <main className="sms-container">
          {/* Signature Yellow-Grid Hero Banner */}
          <header className="ls-hero-banner ls-yellow-grid" style={{ marginBottom: '2rem' }}>
            <div className="ls-hero-banner-content">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.78rem' }}>ADMINISTRATION HUB</span>
                <span className="badge badge-outline" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-database" style={{ marginRight: '4px' }}></i> MongoDB &bull; Redux Toolkit
                </span>
              </div>

              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: 900, color: 'var(--ls-black)', marginBottom: '4px' }}>
                Student Management Portal
              </h1>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2B2B2B', marginBottom: '1.25rem' }}>
                Enroll new students, update profiles, manage department assignments, and maintain directory records.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a href="/admin/dashboard" className="btn btn-purple btn-sm">
                  <i className="fa-solid fa-table-cells-large"></i> Admin Hub
                </a>
                <a href="/admin/scores" className="btn btn-outline btn-sm">
                  <i className="fa-solid fa-table-list"></i> Quiz Scores
                </a>
              </div>
            </div>

            <div className="ls-hero-graphic-wrap" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-14px', right: 0, background: 'var(--ls-orange)', color: '#FFFFFF', fontFamily: 'var(--font-editorial)', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', border: '2px solid var(--ls-black)', borderRadius: 'var(--radius-sm)', transform: 'rotate(3deg)', boxShadow: '2px 2px 0 var(--ls-black)', zIndex: 3 }}>
                EDUCATION CREATES OPPORTUNITY
              </div>

              <div style={{ width: '220px', height: '150px', border: '2px solid var(--ls-black)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#FFFFFF', boxShadow: '4px 4px 0 var(--ls-black)' }}>
                <img 
                  src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80" 
                  alt="Campus building" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            </div>
          </header>

          {/* KPI Summary Banner */}
          <div className="ls-metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginBottom: '2rem' }}>
            <div className="ls-metric-card">
              <div className="ls-metric-icon blue">
                <i className="fa-solid fa-users"></i>
              </div>
              <div>
                <div className="ls-metric-value">{items.length}</div>
                <div className="ls-metric-label">Total Students Enrolled</div>
              </div>
            </div>

            <div className="ls-metric-card">
              <div className="ls-metric-icon purple">
                <i className="fa-solid fa-laptop-code"></i>
              </div>
              <div>
                <div className="ls-metric-value">{csCount}</div>
                <div className="ls-metric-label">Computer Science Dept</div>
              </div>
            </div>

            <div className="ls-metric-card">
              <div className="ls-metric-icon orange">
                <i className="fa-solid fa-brain"></i>
              </div>
              <div>
                <div className="ls-metric-value">{aiCount}</div>
                <div className="ls-metric-label">AI &amp; Data Science Dept</div>
              </div>
            </div>

            <div className="ls-metric-card">
              <div className="ls-metric-icon green">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <div className="ls-metric-value">100%</div>
                <div className="ls-metric-label">Database Sync Status</div>
              </div>
            </div>
          </div>

          {/* Toast Alert */}
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

          {/* Form and List Layout */}
          <div className="sms-main-layout">
            <StudentForm />
            <StudentList />
          </div>
        </main>

        {/* Unified Footer */}
        <footer className="ls-footer" style={{ padding: '1.5rem 2rem', borderTop: '2px solid var(--ls-black)', background: '#FFFFFF', marginTop: 'auto' }}>
          <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #FF7628 0%, #2457FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem' }}>
                <i className="fa-solid fa-brain"></i>
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--ls-black)' }}>LearnSmart</span>
              <span style={{ color: 'var(--ls-muted)', fontSize: '0.85rem', fontWeight: 500 }}>&bull; Integrated Student Management</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ls-muted)', fontWeight: 600 }}>
              &copy; {new Date().getFullYear()} LearnSmart. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
