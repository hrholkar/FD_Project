import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addStudent, updateStudent, clearEditStudent } from './studentsSlice';

const COURSES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Other',
];

const ACADEMIC_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate',
];

export default function StudentForm() {
  const dispatch = useDispatch();
  const editStudent = useSelector((state) => state.students.editStudent);
  const status = useSelector((state) => state.students.status);

  // Controlled component state
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    course: 'Computer Science & Engineering',
    academicYear: '1st Year',
  });

  const [formErrors, setFormErrors] = useState({});

  // Sync edit data from Redux state when editStudent changes
  useEffect(() => {
    if (editStudent) {
      setFormData({
        name: editStudent.name || '',
        rollNumber: editStudent.rollNumber || '',
        email: editStudent.email || '',
        course: editStudent.course || 'Computer Science & Engineering',
        academicYear: editStudent.academicYear || '1st Year',
      });
      setFormErrors({});
    } else {
      setFormData({
        name: '',
        rollNumber: '',
        email: '',
        course: 'Computer Science & Engineering',
        academicYear: '1st Year',
      });
      setFormErrors({});
    }
  }, [editStudent]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.rollNumber.trim()) errors.rollNumber = 'Roll number is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Valid email is required (e.g. name@univ.edu)';
    }
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editStudent) {
      // Dispatch Redux async thunk to update
      await dispatch(
        updateStudent({
          id: editStudent._id,
          studentData: formData,
        })
      );
    } else {
      // Dispatch Redux async thunk to add
      const resultAction = await dispatch(addStudent(formData));
      if (addStudent.fulfilled.match(resultAction)) {
        // Reset form on success
        setFormData({
          name: '',
          rollNumber: '',
          email: '',
          course: 'Computer Science & Engineering',
          academicYear: '1st Year',
        });
      }
    }
  };

  const handleCancel = () => {
    dispatch(clearEditStudent());
    setFormData({
      name: '',
      rollNumber: '',
      email: '',
      course: 'Computer Science & Engineering',
      academicYear: '1st Year',
    });
    setFormErrors({});
  };

  const isSubmitting = status === 'loading';

  return (
    <div className="sms-card">
      <div className="sms-card-header">
        <h2>
          <i className={editStudent ? 'fa-solid fa-user-pen' : 'fa-solid fa-user-plus'}></i>
          {editStudent ? 'Edit Student Record' : 'Enroll New Student'}
        </h2>
        {editStudent && (
          <span className="badge-roll" style={{ background: '#fef3c7', color: '#b45309' }}>
            Editing: {editStudent.rollNumber}
          </span>
        )}
      </div>

      <div className="sms-card-body">
        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              placeholder="e.g. Rohan Sharma"
              value={formData.name}
              onChange={handleChange}
            />
            {formErrors.name && (
              <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                {formErrors.name}
              </small>
            )}
          </div>

          {/* Roll Number */}
          <div className="form-group">
            <label htmlFor="rollNumber">Roll / Registration Number *</label>
            <input
              type="text"
              id="rollNumber"
              name="rollNumber"
              className="form-control"
              placeholder="e.g. CS-2026-042"
              value={formData.rollNumber}
              onChange={handleChange}
            />
            {formErrors.rollNumber && (
              <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                {formErrors.rollNumber}
              </small>
            )}
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              placeholder="e.g. rohan.sharma@learnsmart.edu"
              value={formData.email}
              onChange={handleChange}
            />
            {formErrors.email && (
              <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                {formErrors.email}
              </small>
            )}
          </div>

          {/* Course / Department */}
          <div className="form-group">
            <label htmlFor="course">Course / Department *</label>
            <select
              id="course"
              name="course"
              className="form-control"
              value={formData.course}
              onChange={handleChange}
            >
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div className="form-group">
            <label htmlFor="academicYear">Academic Year *</label>
            <select
              id="academicYear"
              name="academicYear"
              className="form-control"
              value={formData.academicYear}
              onChange={handleChange}
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                </>
              ) : editStudent ? (
                <>
                  <i className="fa-solid fa-check"></i> Update in MongoDB
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus"></i> Save to Database
                </>
              )}
            </button>

            {editStudent && (
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
