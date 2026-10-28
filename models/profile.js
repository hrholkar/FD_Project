const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  educationLevel: { type: String, required: true },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  quizzes: [
    {
      attemptId: { type: String, sparse: true },
      topic: { type: String, required: true },
      difficulty: { type: String, default: "general" },
      score: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      date: { type: Date, default: Date.now },
      results: [
        {
          questionNumber: Number,
          question: String,
          yourAnswer: String,
          correctAnswer: String,
          isCorrect: Boolean,
          explanation: String,
        },
      ],
    },
  ],
  resources: [
    {
      topic: String,
      content: String,
      date: { type: Date, default: Date.now },
    },
  ],
  notes: [
    {
      title: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  todos: [
    {
      task: String,
      completed: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  testScores: [
    {
      topic: {
        type: String,
        required: true,
      },
      scores: {
        type: [Number],
        default: [],
      },
    },
  ],
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);
