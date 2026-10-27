const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/Student");

/**
 * Middleware to restrict student management APIs strictly to authenticated administrators
 */
function requireAdminApi(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: "Access denied. Administrator privileges required to manage student records.",
  });
}

/**
 * @route   GET /api/students
 * @desc    Get all students (supports search query ?search=...)
 * @access  Admin only
 */
router.get("/", requireAdminApi, async (req, res) => {
  try {
    const { search, course, academicYear } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (course) {
      query.course = course;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    const students = await Student.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve students from database",
    });
  }
});

/**
 * @route   GET /api/students/:id
 * @desc    Get a single student by MongoDB _id
 * @access  Admin only
 */
router.get("/:id", requireAdminApi, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid Student ID format: "${id}". Must be a valid 24-character hexadecimal ObjectId.`,
      });
    }

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student with ID ${id} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Error fetching student by ID:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve student record",
    });
  }
});

/**
 * @route   POST /api/students
 * @desc    Create a new student record
 * @access  Admin only
 */
router.post("/", requireAdminApi, async (req, res) => {
  try {
    const { name, rollNumber, email, course, academicYear } = req.body;

    // Basic body validation
    if (!name || !rollNumber || !email || !course || !academicYear) {
      return res.status(400).json({
        success: false,
        error: "All fields are required: name, rollNumber, email, course, academicYear.",
      });
    }

    // Check for existing roll number
    const normalizedRoll = rollNumber.trim().toUpperCase();
    const existingStudent = await Student.findOne({ rollNumber: normalizedRoll });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: `A student with roll number "${normalizedRoll}" already exists.`,
      });
    }

    const newStudent = new Student({
      name: name.trim(),
      rollNumber: normalizedRoll,
      email: email.trim().toLowerCase(),
      course: course.trim(),
      academicYear: academicYear.trim(),
    });

    const savedStudent = await newStudent.save();

    return res.status(201).json({
      success: true,
      message: "Student record created successfully.",
      data: savedStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);

    // Mongoose validation error
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(", "),
      });
    }

    // Duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "A student with this roll number or unique field already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error occurred while creating student record.",
    });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update an existing student record
 * @access  Admin only
 */
router.put("/:id", requireAdminApi, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid Student ID format: "${id}".`,
      });
    }

    const { name, rollNumber, email, course, academicYear } = req.body;

    // Check if updating roll number to one that belongs to another student
    if (rollNumber) {
      const normalizedRoll = rollNumber.trim().toUpperCase();
      const duplicate = await Student.findOne({
        rollNumber: normalizedRoll,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: `Another student with roll number "${normalizedRoll}" already exists.`,
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (rollNumber) updateData.rollNumber = rollNumber.trim().toUpperCase();
    if (email) updateData.email = email.trim().toLowerCase();
    if (course) updateData.course = course.trim();
    if (academicYear) updateData.academicYear = academicYear.trim();

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: `Student with ID ${id} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student record updated successfully.",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(", "),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "A student with this roll number already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error occurred while updating student record.",
    });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student record
 * @access  Admin only
 */
router.delete("/:id", requireAdminApi, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid Student ID format: "${id}".`,
      });
    }

    const deletedStudent = await Student.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        error: `Student with ID ${id} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Student "${deletedStudent.name}" (${deletedStudent.rollNumber}) deleted successfully.`,
      data: deletedStudent,
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error occurred while deleting student record.",
    });
  }
});

module.exports = router;
