const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Intermediate",
    },
    interviewType: {
      type: String,
      enum: [
        "Technical interview",
        "HR interview",
        "Coding interview",
        "Project-based interview",
        "Mixed interview",
      ],
      default: "Technical interview",
    },
    questionCount: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    context: {
      type: String,
      trim: true,
      default: "",
    },
    questions: [
      {
        questionNumber: { type: Number, required: true },
        question: { type: String, required: true },
        difficulty: { type: String, default: "Intermediate" },
        topic: { type: String, default: "" },
        suggestedAnswer: { type: String, default: "" },
        keyConcepts: { type: String, default: "" },
        followUpQuestions: [{ type: String }],
        codingDetails: {
          constraints: [{ type: String }],
          testCases: [
            {
              input: String,
              output: String,
              explanation: String,
            },
          ],
        },
      },
    ],
    userResponses: [
      {
        questionIndex: { type: Number, required: true },
        answer: { type: String, default: "" },
        feedback: {
          score: { type: Number, min: 0, max: 100 },
          rating: { type: String, default: "" },
          strengths: { type: String, default: "" },
          missingConcepts: { type: String, default: "" },
          suggestions: { type: String, default: "" },
          evaluationText: { type: String, default: "" },
          evaluatedAt: { type: Date, default: Date.now },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
