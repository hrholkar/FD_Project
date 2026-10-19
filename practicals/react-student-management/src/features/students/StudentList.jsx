import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setEditStudent, deleteStudent } from './studentsSlice';

export default function StudentList() {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.students);

  // Local state for client-side search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  const handleEdit = (student) => {
    dispatch(setEditStudent(student));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete student "${student.name}" (${student.rollNumber}) from MongoDB?`
    );
    if (confirmed) {
      dispatch(deleteStudent(student._id));
    }
  };

  // Filter students based on search term and selected department
  const filteredStudents = items.filter((student) => {
    const matchesSearch =
      (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.rollNumber && student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourse = selectedCourse === 'ALL' || student.course === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  return (
    <div className="sms-card">
      <div className="sms-card-header">
        <h2>
          <i className="fa-solid fa-users"></i> Enrolled Student Directory
        </h2>
        <span className="badge-redux">
          <i className="fa-solid fa-database"></i> {items.length} Records in MongoDB
        </span>
      </div>

      <div className="sms-card-body">
        {/* Search and Filter Toolbar */}
        <div className="list-toolbar">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search by name, roll no, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Artificial Intelligence & Data Science">AI & Data Science</option>
            <option value="Electronics & Telecommunication">Electronics & Comm</option>
            <option value="Mechanical Engineering">Mechanical</option>
            <option value="Civil Engineering">Civil</option>
            <option value="Electrical Engineering">Electrical</option>
          </select>
        </div>

        {/* Loading State */}
        {status === 'loading' && items.length === 0 && (
          <div className="state-container">
            <div className="spinner"></div>
            <p>Fetching student records from Express API & MongoDB...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'failed' && items.length === 0 && (
          <div className="state-container" style={{ color: 'var(--danger)' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <p>{error || 'Failed to load students. Ensure MongoDB & Express server are running.'}</p>
          </div>
        )}

        {/* Empty State */}
        {status !== 'loading' && filteredStudents.length === 0 && items.length > 0 && (
          <div className="state-container">
            <i className="fa-solid fa-filter"></i>
            <p>No student records match your current filter criteria.</p>
          </div>
        )}

        {status !== 'loading' && items.length === 0 && (
          <div className="state-container">
            <i className="fa-solid fa-user-slash"></i>
            <p>No students enrolled yet. Add your first student using the form on the left!</p>
          </div>
        )}

        {/* Student Records Table */}
        {filteredStudents.length > 0 && (
          <div className="sms-table-wrapper">
            <table className="sms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name & Email</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Enrolled On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <span className="badge-roll">{student.rollNumber}</span>
                    </td>
                    <td>
                      <div className="student-name-cell">{student.name}</div>
                      <div className="student-email">{student.email}</div>
                    </td>
                    <td>{student.course}</td>
                    <td>
                      <span className="badge-year">{student.academicYear}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {student.createdAt
                        ? new Date(student.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon edit"
                          title="Edit student"
                          onClick={() => handleEdit(student)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Delete student"
                          onClick={() => handleDelete(student)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
