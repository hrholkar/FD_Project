import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = '/api/students';

// Async Thunk: Fetch all students from Express/MongoDB
export const fetchStudents = createAsyncThunk(
  'students/fetchStudents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to fetch student records');
      }
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error fetching students');
    }
  }
);

// Async Thunk: Create new student record (POST /api/students)
export const addStudent = createAsyncThunk(
  'students/addStudent',
  async (studentData, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to add student');
      }
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error adding student');
    }
  }
);

// Async Thunk: Update existing student record (PUT /api/students/:id)
export const updateStudent = createAsyncThunk(
  'students/updateStudent',
  async ({ id, studentData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to update student');
      }
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error updating student');
    }
  }
);

// Async Thunk: Delete student record (DELETE /api/students/:id)
export const deleteStudent = createAsyncThunk(
  'students/deleteStudent',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to delete student');
      }
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error deleting student');
    }
  }
);

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  editStudent: null, // Holds student object being edited
  notification: null, // { type: 'success' | 'error', message: string }
};

const studentsSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    setEditStudent: (state, action) => {
      state.editStudent = action.payload;
    },
    clearEditStudent: (state) => {
      state.editStudent = null;
    },
    clearNotification: (state) => {
      state.notification = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch students
      .addCase(fetchStudents.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.notification = { type: 'error', message: action.payload };
      })

      // Add student
      .addCase(addStudent.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addStudent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.unshift(action.payload);
        state.notification = {
          type: 'success',
          message: `Student "${action.payload.name}" enrolled successfully in MongoDB.`,
        };
      })
      .addCase(addStudent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.notification = { type: 'error', message: action.payload };
      })

      // Update student
      .addCase(updateStudent.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateStudent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.editStudent = null;
        state.notification = {
          type: 'success',
          message: `Student "${action.payload.name}" updated successfully.`,
        };
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.notification = { type: 'error', message: action.payload };
      })

      // Delete student
      .addCase(deleteStudent.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter((s) => s._id !== action.payload);
        state.notification = {
          type: 'success',
          message: 'Student record deleted successfully from MongoDB.',
        };
      })
      .addCase(deleteStudent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.notification = { type: 'error', message: action.payload };
      });
  },
});

export const { setEditStudent, clearEditStudent, clearNotification } = studentsSlice.actions;
export default studentsSlice.reducer;
