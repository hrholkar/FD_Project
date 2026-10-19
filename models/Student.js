const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Za-z0-9-]+$/, "Roll number can only contain letters, numbers, and hyphens"],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    course: {
      type: String,
      required: [true, "Course or department is required"],
      trim: true,
      enum: {
        values: [
          "Computer Science & Engineering",
          "Information Technology",
          "Artificial Intelligence & Data Science",
          "Electronics & Telecommunication",
          "Mechanical Engineering",
          "Civil Engineering",
          "Electrical Engineering",
          "Other",
        ],
        message: "{VALUE} is not a supported course",
      },
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      enum: {
        values: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"],
        message: "{VALUE} is not a supported academic year",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate roll number error formatting
studentSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("A student with this roll number already exists."));
  } else {
    next(error);
  }
});

module.exports = mongoose.model("Student", studentSchema);
