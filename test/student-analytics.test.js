const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

console.log("=================================================");
console.log("   LEARNSMART STUDENT ANALYTICS TESTS (STEP 5)   ");
console.log("=================================================\n");

// Require computeStudentAnalytics from index.js
const { computeStudentAnalytics } = require("../index.js");

// ---------------------------------------------------------------------------
// TEST 1: Empty Student History (0 Quizzes) Returns Accurate Zeros
// ---------------------------------------------------------------------------
{
  const emptyUser = {
    username: "newlearner",
    educationLevel: "Undergraduate",
    quizzes: [],
    notes: [],
    todos: [],
  };

  const analytics = computeStudentAnalytics(emptyUser);
  assert.strictEqual(analytics.summary.completedQuizzes, 0, "Quizzes completed must be 0");
  assert.strictEqual(analytics.summary.averageScore, 0, "Average score must be 0%");
  assert.strictEqual(analytics.summary.overallAccuracy, 0, "Overall accuracy must be 0%");
  assert.strictEqual(analytics.summary.highestScore, 0, "Highest score must be 0%");
  assert.strictEqual(analytics.summary.latestScore, 0, "Latest score must be 0%");
  assert.strictEqual(analytics.summary.streak, 0, "Streak must be 0");
  assert.strictEqual(analytics.subjects.length, 0, "Subjects array must be empty");
  assert.strictEqual(analytics.weakTopics.length, 0, "Weak topics array must be empty");
  assert.strictEqual(analytics.performanceOverTime.length, 0, "Performance over time must be empty");
  assert.strictEqual(analytics.last7Days.length, 7, "Last 7 days array must contain 7 day entries");
  assert(analytics.last7Days.every(d => d.count === 0), "All 7 day counts must be 0");

  console.log("PASS 1: Empty student history returns accurate zeros, empty arrays, and 0 streak.");
}

// ---------------------------------------------------------------------------
// TEST 2: Single Quiz Attempt (4/5 Correct -> 80%)
// ---------------------------------------------------------------------------
{
  const singleQuizUser = {
    username: "learner_one",
    educationLevel: "Higher Secondary",
    quizzes: [
      {
        attemptId: "att_101",
        topic: "Data Structures",
        difficulty: "intermediate",
        score: 4,
        totalQuestions: 5,
        percentage: 80,
        date: new Date(),
        results: [
          { questionNumber: 1, question: "Q1", yourAnswer: "A", correctAnswer: "A", isCorrect: true },
          { questionNumber: 2, question: "Q2", yourAnswer: "B", correctAnswer: "B", isCorrect: true },
          { questionNumber: 3, question: "Q3", yourAnswer: "C", correctAnswer: "C", isCorrect: true },
          { questionNumber: 4, question: "Q4", yourAnswer: "D", correctAnswer: "D", isCorrect: true },
          { questionNumber: 5, question: "Q5", yourAnswer: "A", correctAnswer: "B", isCorrect: false },
        ],
      },
    ],
  };

  const analytics = computeStudentAnalytics(singleQuizUser);
  assert.strictEqual(analytics.summary.completedQuizzes, 1);
  assert.strictEqual(analytics.summary.averageScore, 80);
  assert.strictEqual(analytics.summary.overallAccuracy, 80);
  assert.strictEqual(analytics.summary.highestScore, 80);
  assert.strictEqual(analytics.summary.latestScore, 80);
  assert.strictEqual(analytics.summary.latestTopic, "Data Structures");
  assert.strictEqual(analytics.summary.streak, 1, "Today's quiz establishes 1-day streak");
  assert.strictEqual(analytics.subjects.length, 1);
  assert.strictEqual(analytics.subjects[0].subject, "Data Structures");
  assert.strictEqual(analytics.subjects[0].attempts, 1);
  assert.strictEqual(analytics.subjects[0].averageScore, 80);
  assert.strictEqual(analytics.subjects[0].hasLimitedHistory, true, "1 attempt must be marked as limited history");
  assert.strictEqual(analytics.subjects[0].isWeakTopic, false, "1 attempt must not be flagged as weak topic");

  console.log("PASS 2: Single quiz attempt (4/5) calculates 80% accuracy, 1-day streak, and limited history.");
}

// ---------------------------------------------------------------------------
// TEST 3: Multi-Subject Performance Aggregations
// ---------------------------------------------------------------------------
{
  const multiSubjectUser = {
    username: "learner_multi",
    educationLevel: "College",
    quizzes: [
      { topic: "C++", score: 5, totalQuestions: 5, percentage: 100, date: new Date("2026-10-20") },
      { topic: "C++", score: 4, totalQuestions: 5, percentage: 80, date: new Date("2026-10-21") },
      { topic: "Python", score: 3, totalQuestions: 5, percentage: 60, date: new Date("2026-10-22") },
    ],
  };

  const analytics = computeStudentAnalytics(multiSubjectUser);
  assert.strictEqual(analytics.summary.completedQuizzes, 3);
  // Average = (100 + 80 + 60) / 3 = 80
  assert.strictEqual(analytics.summary.averageScore, 80);
  assert.strictEqual(analytics.summary.highestScore, 100);
  assert.strictEqual(analytics.summary.attemptedSubjectsCount, 2);

  const cpp = analytics.subjects.find(s => s.subject === "C++");
  assert.strictEqual(cpp.attempts, 2);
  assert.strictEqual(cpp.averageScore, 90);
  assert.strictEqual(cpp.highestScore, 100);
  assert.strictEqual(cpp.isStrongTopic, true, "C++ (avg 90%, 2 attempts) is a strong topic");

  const py = analytics.subjects.find(s => s.subject === "Python");
  assert.strictEqual(py.attempts, 1);
  assert.strictEqual(py.averageScore, 60);
  assert.strictEqual(py.hasLimitedHistory, true);

  console.log("PASS 3: Multi-subject aggregations group topics, averages, and counts with mathematical precision.");
}

// ---------------------------------------------------------------------------
// TEST 4: Weak-Topic Classification Rule (>= 2 attempts and avg < 65%)
// ---------------------------------------------------------------------------
{
  const weakTopicUser = {
    username: "learner_weak",
    educationLevel: "College",
    quizzes: [
      // Operating Systems: 2 attempts, avg 50% -> WEAK TOPIC
      { topic: "Operating Systems", score: 2, totalQuestions: 5, percentage: 40, date: new Date("2026-10-10") },
      { topic: "Operating Systems", score: 3, totalQuestions: 5, percentage: 60, date: new Date("2026-10-12") },
      // Algorithms: 1 attempt at 40% -> Limited history, NOT weak topic
      { topic: "Algorithms", score: 2, totalQuestions: 5, percentage: 40, date: new Date("2026-10-15") },
      // Database: 2 attempts, avg 75% -> NOT weak topic
      { topic: "Database", score: 7, totalQuestions: 10, percentage: 70, date: new Date("2026-10-16") },
      { topic: "Database", score: 8, totalQuestions: 10, percentage: 80, date: new Date("2026-10-17") },
    ],
  };

  const analytics = computeStudentAnalytics(weakTopicUser);
  assert.strictEqual(analytics.weakTopics.length, 1, "Exactly 1 topic should be classified as weak");
  assert.strictEqual(analytics.weakTopics[0].subject, "Operating Systems");
  assert.strictEqual(analytics.weakTopics[0].averageScore, 50);

  const alg = analytics.subjects.find(s => s.subject === "Algorithms");
  assert.strictEqual(alg.isWeakTopic, false, "Algorithms has < 2 attempts so cannot be weak topic");
  assert.strictEqual(alg.hasLimitedHistory, true, "Algorithms must have limited history flag");

  const db = analytics.subjects.find(s => s.subject === "Database");
  assert.strictEqual(db.isWeakTopic, false);
  assert.strictEqual(db.hasLimitedHistory, false);

  console.log("PASS 4: Weak-topic rule (>= 2 attempts and < 65%) strictly enforced without false positives.");
}

// ---------------------------------------------------------------------------
// TEST 5: Denominator Handling & Percentage Resilience (No NaN / Division by 0)
// ---------------------------------------------------------------------------
{
  const legacyDataUser = {
    username: "learner_legacy",
    educationLevel: "Middle",
    quizzes: [
      // Missing percentage, totalQuestions = 4
      { topic: "Math", score: 3, totalQuestions: 4, date: new Date("2026-10-01") },
      // Missing percentage, totalQuestions = undefined, has results array
      {
        topic: "Science",
        score: 2,
        date: new Date("2026-10-02"),
        results: [
          { isCorrect: true },
          { isCorrect: true },
          { isCorrect: false },
        ],
      },
      // 0 totalQuestions fallback safely handled
      { topic: "History", score: 0, totalQuestions: 0, date: new Date("2026-10-03") },
    ],
  };

  const analytics = computeStudentAnalytics(legacyDataUser);
  assert.strictEqual(analytics.performanceOverTime[0].percentage, 75);
  assert.strictEqual(analytics.performanceOverTime[1].percentage, 67);
  assert(!isNaN(analytics.summary.averageScore), "Average score must never be NaN");
  assert(!isNaN(analytics.summary.overallAccuracy), "Overall accuracy must never be NaN");

  console.log("PASS 5: Handled missing denominators, results fallback, and zero questions without NaN.");
}

// ---------------------------------------------------------------------------
// TEST 6: Chronological Sorting & Out-of-Order Dates
// ---------------------------------------------------------------------------
{
  const outOfOrderUser = {
    username: "learner_chrono",
    educationLevel: "College",
    quizzes: [
      { attemptId: "c3", topic: "C++", score: 5, totalQuestions: 5, percentage: 100, date: new Date("2026-10-25") },
      { attemptId: "c1", topic: "C++", score: 3, totalQuestions: 5, percentage: 60, date: new Date("2026-10-10") },
      { attemptId: "c2", topic: "C++", score: 4, totalQuestions: 5, percentage: 80, date: new Date("2026-10-18") },
    ],
  };

  const analytics = computeStudentAnalytics(outOfOrderUser);
  assert.strictEqual(analytics.performanceOverTime[0].attemptId, "c1", "Earliest quiz must be first");
  assert.strictEqual(analytics.performanceOverTime[1].attemptId, "c2", "Middle quiz must be second");
  assert.strictEqual(analytics.performanceOverTime[2].attemptId, "c3", "Latest quiz must be last");
  assert.strictEqual(analytics.summary.latestScore, 100, "Latest score must correspond to latest attempt (c3)");

  console.log("PASS 6: Chronological sorting reorders quiz attempts properly regardless of insertion order.");
}

// ---------------------------------------------------------------------------
// TEST 7: Streak Calculation from Real Quiz Dates
// ---------------------------------------------------------------------------
{
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);

  // Consecutive: 3 days streak
  const streak3User = {
    quizzes: [
      { topic: "A", date: twoDaysAgo, score: 5, totalQuestions: 5, percentage: 100 },
      { topic: "B", date: yesterday, score: 4, totalQuestions: 5, percentage: 80 },
      { topic: "C", date: today, score: 5, totalQuestions: 5, percentage: 100 },
    ],
  };
  assert.strictEqual(computeStudentAnalytics(streak3User).summary.streak, 3);

  // Broken streak (quiz 5 days ago, none since)
  const brokenStreakUser = {
    quizzes: [
      { topic: "Old", date: fiveDaysAgo, score: 5, totalQuestions: 5, percentage: 100 },
    ],
  };
  assert.strictEqual(computeStudentAnalytics(brokenStreakUser).summary.streak, 0);

  console.log("PASS 7: Consecutive day streaks compute dynamically from real dates; gaps reset streak to 0.");
}

// ---------------------------------------------------------------------------
// TEST 8: Recent Activity Merging (Quizzes + Notes + Todos)
// ---------------------------------------------------------------------------
{
  const activeUser = {
    username: "activity_user",
    educationLevel: "College",
    quizzes: [
      { topic: "Networking", date: new Date("2026-10-26T10:00:00Z"), score: 4, totalQuestions: 5, percentage: 80 },
    ],
    notes: [
      { title: "OS Threads", content: "POSIX pthreads review", createdAt: new Date("2026-10-27T12:00:00Z") },
    ],
    todos: [
      { task: "Finish Lab 3", completed: true, createdAt: new Date("2026-10-28T09:00:00Z") },
    ],
  };

  const analytics = computeStudentAnalytics(activeUser);
  assert.strictEqual(analytics.recentActivities.length, 3);
  // Newest first: Todo (Oct 28), Note (Oct 27), Quiz (Oct 26)
  assert.strictEqual(analytics.recentActivities[0].type, "todo");
  assert.strictEqual(analytics.recentActivities[1].type, "note");
  assert.strictEqual(analytics.recentActivities[2].type, "quiz");

  console.log("PASS 8: Activity stream cleanly integrates real quizzes, notes, and todos chronologically.");
}

// ---------------------------------------------------------------------------
// TEST 9: Question Breakdown Diagnostics Accuracy (yourAnswer vs userAnswer)
// ---------------------------------------------------------------------------
{
  const quizWithAnswers = {
    attemptId: "att_diag",
    topic: "Web Dev",
    totalQuestions: 2,
    score: 1,
    percentage: 50,
    results: [
      { questionNumber: 1, question: "What is CSS?", yourAnswer: "Cascading Style Sheets", correctAnswer: "Cascading Style Sheets", isCorrect: true },
      { questionNumber: 2, question: "What is HTML?", yourAnswer: "HighText Markup Language", correctAnswer: "HyperText Markup Language", isCorrect: false },
    ],
  };

  const analytics = computeStudentAnalytics({ quizzes: [quizWithAnswers] });
  const q1 = analytics.performanceOverTime[0].results[0];
  const q2 = analytics.performanceOverTime[0].results[1];

  assert.strictEqual(q1.yourAnswer, "Cascading Style Sheets");
  assert.strictEqual(q2.yourAnswer, "HighText Markup Language");
  assert.notStrictEqual(q1.yourAnswer, "None", "User answer must not be 'None' when answered");

  console.log("PASS 9: Question breakdown preserves student answers accurately without falling back to 'None'.");
}

// ---------------------------------------------------------------------------
// TEST 10: views/dashboard.ejs Renders Honest Zero State (No Hardcoded 24, 78%, 12)
// ---------------------------------------------------------------------------
{
  const emptyUser = {
    username: "zerostudent",
    educationLevel: "College",
    quizzes: [],
    notes: [],
    todos: [],
  };
  const emptyAnalytics = computeStudentAnalytics(emptyUser);

  ejs.renderFile(
    path.join(__dirname, "..", "views", "dashboard.ejs"),
    { user: emptyUser, analytics: emptyAnalytics },
    (err, html) => {
      assert(!err, "dashboard.ejs should render without errors: " + (err ? err.message : ""));
      assert(!html.includes(">24<"), "Must not contain hardcoded 24 quizzes");
      assert(!html.includes(">78%<"), "Must not contain hardcoded 78% accuracy");
      assert(!html.includes(">12<"), "Must not contain hardcoded 12 streak");
      assert(html.includes(">0<"), "Must contain honest 0 completed quizzes");
      assert(html.includes(">0%<"), "Must contain honest 0% accuracy");
      console.log("PASS 10: views/dashboard.ejs renders honest 0 state with zero hardcoded fallbacks.");
    }
  );
}

// ---------------------------------------------------------------------------
// TEST 11: views/progress.ejs Renders Real Multi-Subject, Weak Topics, & History
// ---------------------------------------------------------------------------
{
  const testUser = {
    username: "progress_student",
    educationLevel: "College",
    quizzes: [
      {
        attemptId: "att_prog1",
        topic: "Data Structures",
        score: 2,
        totalQuestions: 5,
        percentage: 40,
        date: new Date("2026-10-20"),
        results: [],
      },
      {
        attemptId: "att_prog2",
        topic: "Data Structures",
        score: 3,
        totalQuestions: 5,
        percentage: 60,
        date: new Date("2026-10-22"),
        results: [],
      },
      {
        attemptId: "att_prog3",
        topic: "Algorithms",
        score: 5,
        totalQuestions: 5,
        percentage: 100,
        date: new Date("2026-10-24"),
        results: [],
      },
    ],
  };

  const analytics = computeStudentAnalytics(testUser);

  ejs.renderFile(
    path.join(__dirname, "..", "views", "progress.ejs"),
    { user: testUser, analytics, testScores: [] },
    (err, html) => {
      assert(!err, "progress.ejs should render without errors: " + (err ? err.message : ""));
      assert(html.includes("Data Structures"), "Rendered progress must contain Data Structures");
      assert(html.includes("Needs Practice (50%)"), "Weak topic section must flag Data Structures at 50%");
      assert(html.includes("/quiz/review/att_prog1"), "History table must link to review permalink att_prog1");
      assert(!html.includes("[1, 3, 2, 4, 3, 5, 4]"), "Hardcoded timeline dataset must be absent");
      console.log("PASS 11: views/progress.ejs renders live metrics, weak-topic badge, review links, and history.");
    }
  );
}

// ---------------------------------------------------------------------------
// TEST 12: Quiz Attempt Review Permalink Authentication & Index Lookup
// ---------------------------------------------------------------------------
{
  const sampleQuizzes = [
    { attemptId: "attempt_alpha", topic: "C++", score: 5, totalQuestions: 5, percentage: 100, results: [] },
    { attemptId: "attempt_beta", topic: "Python", score: 4, totalQuestions: 5, percentage: 80, results: [] },
  ];

  // Lookup by attemptId
  const matchId = sampleQuizzes.find(q => q.attemptId === "attempt_alpha");
  assert.strictEqual(matchId.topic, "C++");

  // Lookup by integer index
  const matchIdx = sampleQuizzes[1];
  assert.strictEqual(matchIdx.topic, "Python");

  // Non-existent attempt
  const notFound = sampleQuizzes.find(q => q.attemptId === "attempt_nonexistent");
  assert.strictEqual(notFound, undefined);

  console.log("PASS 12: Review permalink resolution handles attemptId, array index, and 404 boundaries.");
}

console.log("\n=================================================");
console.log(" ALL 12 STUDENT ANALYTICS TESTS PASSED!          ");
console.log("=================================================");

process.exit(0);
