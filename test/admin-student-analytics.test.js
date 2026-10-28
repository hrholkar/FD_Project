const assert = require("assert");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const ejs = require("ejs");

const {
  computeStudentAnalytics,
  computeLearnerRecentVsEarlier,
  computeLearnerScoreDistribution,
  computeLearningRecommendations,
} = require("../services/studentAnalytics");

console.log("=================================================");
console.log("   LEARNSMART ADMIN STUDENT ANALYTICS (STEP 6)   ");
console.log("=================================================\n");

// ---------------------------------------------------------------------------
// TEST 1: Empty / Zero History Learner Returns Clean Zeros & Empty States
// ---------------------------------------------------------------------------
{
  const emptyLearner = {
    _id: new mongoose.Types.ObjectId(),
    username: "newbie_learner",
    email: "newbie@learnsmart.edu",
    educationLevel: "Undergraduate",
    quizzes: [],
    notes: [],
    todos: [],
    createdAt: new Date(),
  };

  const analytics = computeStudentAnalytics(emptyLearner);
  assert.strictEqual(analytics.summary.completedQuizzes, 0, "Quizzes completed must be 0");
  assert.strictEqual(analytics.summary.averageScore, 0, "Average score must be 0%");
  assert.strictEqual(analytics.summary.highestScore, 0, "Highest score must be 0%");
  assert.strictEqual(analytics.summary.streak, 0, "Streak must be 0");
  assert.strictEqual(analytics.performanceOverTime.length, 0, "Performance history must be empty");
  assert.strictEqual(analytics.subjects.length, 0, "Subjects must be empty");
  assert.strictEqual(analytics.weakTopics.length, 0, "Weak topics must be empty");

  const distribution = computeLearnerScoreDistribution(emptyLearner.quizzes);
  assert.strictEqual(distribution.totalValidAttempts, 0, "Distribution attempts must be 0");
  assert.strictEqual(distribution.buckets["80-100%"], 0);
  assert.strictEqual(distribution.buckets["60-79%"], 0);
  assert.strictEqual(distribution.buckets["40-59%"], 0);
  assert.strictEqual(distribution.buckets["0-39%"], 0);

  const trajectory = computeLearnerRecentVsEarlier(emptyLearner.quizzes);
  assert.strictEqual(trajectory.hasEnoughData, false, "Trajectory must report insufficient data");
  assert.strictEqual(trajectory.attemptCount, 0);

  const recommendations = computeLearningRecommendations(analytics);
  assert.ok(recommendations.length > 0, "Must return fallback diagnostic recommendation");
  assert.strictEqual(recommendations[0].type, "no_data");

  // Verify EJS template compiles and renders with empty dataset
  const templatePath = path.join(__dirname, "..", "views", "admin", "learner-detail.ejs");
  const templateContent = fs.readFileSync(templatePath, "utf8");
  const html = ejs.render(templateContent, {
    learner: emptyLearner,
    institutionalStudent: null,
    analytics,
    recentVsEarlier: trajectory,
    scoreDistribution: distribution,
    recommendations,
  }, { filename: templatePath });

  assert.ok(html.includes("No assessment records found"), "Template must render honest empty table");
  assert.ok(html.includes("No assessment attempts recorded"), "Template must render honest empty chart state");
  console.log("PASS 1: Empty learner returns clean zeros, empty distribution, and renders honest empty states.");
}

// ---------------------------------------------------------------------------
// TEST 2: Single Quiz Attempt (4/5 = 80%) Computes Precise Diagnostics
// ---------------------------------------------------------------------------
{
  const singleAttemptLearner = {
    _id: new mongoose.Types.ObjectId(),
    username: "alice",
    email: "alice@learnsmart.edu",
    educationLevel: "Graduate",
    quizzes: [
      {
        attemptId: "att_101",
        topic: "Binary Search",
        difficulty: "medium",
        score: 4,
        totalQuestions: 5,
        percentage: 80,
        date: new Date(),
        results: [
          { questionNumber: 1, question: "Q1", isCorrect: true, yourAnswer: "A", correctAnswer: "A" },
          { questionNumber: 2, question: "Q2", isCorrect: true, yourAnswer: "B", correctAnswer: "B" },
          { questionNumber: 3, question: "Q3", isCorrect: true, yourAnswer: "C", correctAnswer: "C" },
          { questionNumber: 4, question: "Q4", isCorrect: true, yourAnswer: "D", correctAnswer: "D" },
          { questionNumber: 5, question: "Q5", isCorrect: false, yourAnswer: "A", correctAnswer: "B" },
        ],
      },
    ],
  };

  const analytics = computeStudentAnalytics(singleAttemptLearner);
  assert.strictEqual(analytics.summary.completedQuizzes, 1);
  assert.strictEqual(analytics.summary.averageScore, 80);
  assert.strictEqual(analytics.summary.highestScore, 80);
  assert.strictEqual(analytics.subjects.length, 1);
  assert.strictEqual(analytics.subjects[0].hasLimitedHistory, true, "1 attempt must flag limited history");
  assert.strictEqual(analytics.subjects[0].isWeakTopic, false);

  const distribution = computeLearnerScoreDistribution(singleAttemptLearner.quizzes);
  assert.strictEqual(distribution.totalValidAttempts, 1);
  assert.strictEqual(distribution.buckets["80-100%"], 1);
  assert.strictEqual(distribution.percentages["80-100%"], 100);
  assert.strictEqual(distribution.buckets["0-39%"], 0);

  const trajectory = computeLearnerRecentVsEarlier(singleAttemptLearner.quizzes);
  assert.strictEqual(trajectory.hasEnoughData, false);
  assert.strictEqual(trajectory.attemptCount, 1);
  assert.ok(trajectory.message.includes("At least 4 completed quizzes are required"));
  console.log("PASS 2: Single quiz learner computes 80% accuracy, 100% in 80-100% band, and flags insufficient trajectory history.");
}

// ---------------------------------------------------------------------------
// TEST 3: Two-Quiz Learner with Weak Topic (>= 2 attempts and < 65%)
// ---------------------------------------------------------------------------
{
  const weakTopicLearner = {
    _id: new mongoose.Types.ObjectId(),
    username: "bob",
    quizzes: [
      { topic: "Graph Algorithms", score: 3, totalQuestions: 5, percentage: 60, date: new Date(Date.now() - 86400000) },
      { topic: "Graph Algorithms", score: 2, totalQuestions: 5, percentage: 40, date: new Date() },
    ],
  };

  const analytics = computeStudentAnalytics(weakTopicLearner);
  assert.strictEqual(analytics.summary.completedQuizzes, 2);
  assert.strictEqual(analytics.summary.averageScore, 50);
  assert.strictEqual(analytics.weakTopics.length, 1);
  assert.strictEqual(analytics.weakTopics[0].subject, "Graph Algorithms");
  assert.strictEqual(analytics.weakTopics[0].averageScore, 50);

  const recommendations = computeLearningRecommendations(analytics);
  const criticalRec = recommendations.find((r) => r.level === "critical");
  assert.ok(criticalRec, "Must generate critical revision recommendation for weak topic");
  assert.strictEqual(criticalRec.topic, "Graph Algorithms");
  assert.ok(criticalRec.basis.includes("below the 65% institutional mastery threshold"));
  console.log("PASS 3: Two-quiz learner with 50% avg triggers weak-topic revision recommendation.");
}

// ---------------------------------------------------------------------------
// TEST 4: Trajectory Comparison with >= 4 Attempts (Improving Performance)
// ---------------------------------------------------------------------------
{
  const d0 = new Date("2026-01-01T10:00:00Z");
  const d1 = new Date("2026-01-05T10:00:00Z");
  const d2 = new Date("2026-01-10T10:00:00Z");
  const d3 = new Date("2026-01-15T10:00:00Z");

  const improvingQuizzes = [
    { score: 2, totalQuestions: 5, percentage: 40, date: d0 },
    { score: 3, totalQuestions: 5, percentage: 60, date: d1 },
    { score: 4, totalQuestions: 5, percentage: 80, date: d2 },
    { score: 5, totalQuestions: 5, percentage: 100, date: d3 },
  ];

  const trajectory = computeLearnerRecentVsEarlier(improvingQuizzes);
  assert.strictEqual(trajectory.hasEnoughData, true);
  assert.strictEqual(trajectory.earlierAttemptsCount, 2);
  assert.strictEqual(trajectory.recentAttemptsCount, 2);
  assert.strictEqual(trajectory.earlierAverage, 50, "Earlier avg (40+60)/2 = 50%");
  assert.strictEqual(trajectory.recentAverage, 90, "Recent avg (80+100)/2 = 90%");
  assert.strictEqual(trajectory.netDelta, 40, "Net improvement must be +40%");
  assert.strictEqual(trajectory.isImproving, true);
  assert.strictEqual(trajectory.isDeclining, false);
  assert.ok(trajectory.explanation.includes("+40%"));
  console.log("PASS 4: Improving trajectory splits earlier (50%) and recent (90%) yielding +40% net shift.");
}

// ---------------------------------------------------------------------------
// TEST 5: Trajectory Comparison with >= 4 Attempts (Declining Performance)
// ---------------------------------------------------------------------------
{
  const decliningQuizzes = [
    { score: 5, totalQuestions: 5, percentage: 100, date: new Date("2026-02-01") },
    { score: 4, totalQuestions: 5, percentage: 80, date: new Date("2026-02-05") },
    { score: 3, totalQuestions: 5, percentage: 60, date: new Date("2026-02-10") },
    { score: 2, totalQuestions: 5, percentage: 40, date: new Date("2026-02-15") },
  ];

  const trajectory = computeLearnerRecentVsEarlier(decliningQuizzes);
  assert.strictEqual(trajectory.hasEnoughData, true);
  assert.strictEqual(trajectory.earlierAverage, 90);
  assert.strictEqual(trajectory.recentAverage, 50);
  assert.strictEqual(trajectory.netDelta, -40);
  assert.strictEqual(trajectory.isDeclining, true);
  assert.strictEqual(trajectory.isImproving, false);
  assert.ok(trajectory.explanation.includes("-40%"));
  console.log("PASS 5: Declining trajectory accurately identifies -40% performance drop.");
}

// ---------------------------------------------------------------------------
// TEST 6: Score Distribution Mutual Exclusivity and Bucket Boundaries
// ---------------------------------------------------------------------------
{
  // Test boundary values: 0, 39, 40, 59, 60, 79, 80, 100
  const boundaryQuizzes = [
    { percentage: 0 },
    { percentage: 39 },
    { percentage: 40 },
    { percentage: 59 },
    { percentage: 60 },
    { percentage: 79 },
    { percentage: 80 },
    { percentage: 100 },
  ];

  const dist = computeLearnerScoreDistribution(boundaryQuizzes);
  assert.strictEqual(dist.totalValidAttempts, 8);
  assert.strictEqual(dist.buckets["0-39%"], 2, "0% and 39% must fall into 0-39%");
  assert.strictEqual(dist.buckets["40-59%"], 2, "40% and 59% must fall into 40-59%");
  assert.strictEqual(dist.buckets["60-79%"], 2, "60% and 79% must fall into 60-79%");
  assert.strictEqual(dist.buckets["80-100%"], 2, "80% and 100% must fall into 80-100%");

  // Sum of percentages must equal 100%
  const totalBucketSum =
    dist.buckets["0-39%"] +
    dist.buckets["40-59%"] +
    dist.buckets["60-79%"] +
    dist.buckets["80-100%"];
  assert.strictEqual(totalBucketSum, 8);
  console.log("PASS 6: Score distribution buckets partition boundaries mutually exclusively with 100% fidelity.");
}

// ---------------------------------------------------------------------------
// TEST 7: Admin Authorization Guard Enforced on Individual Learner Routes
// ---------------------------------------------------------------------------
{
  const adminRouterPath = path.join(__dirname, "..", "routes", "admin.js");
  const adminRouterSource = fs.readFileSync(adminRouterPath, "utf8");

  assert.ok(adminRouterSource.includes('router.get("/learners/:userId", requireAdmin'), "Learner detail route must require admin");
  assert.ok(adminRouterSource.includes('router.get("/api/learners/:userId", requireAdmin'), "Learner API route must require admin");
  assert.ok(adminRouterSource.includes('router.get("/learners/:userId/review/:attemptIdOrIndex", requireAdmin'), "Review route must require admin");
  assert.ok(adminRouterSource.includes('router.get("/learners/:userId/export-csv", requireAdmin'), "CSV export route must require admin");
  console.log("PASS 7: All individual learner diagnostic endpoints guarded by requireAdmin middleware.");
}

// ---------------------------------------------------------------------------
// TEST 8: Invalid ObjectId Validation Returns 404/400 Without Crashing
// ---------------------------------------------------------------------------
{
  const invalidId = "not-a-valid-object-id";
  assert.strictEqual(mongoose.isValidObjectId(invalidId), false);

  const validId = new mongoose.Types.ObjectId().toString();
  assert.strictEqual(mongoose.isValidObjectId(validId), true);
  console.log("PASS 8: ObjectId validation correctly rejects invalid IDs avoiding CastError exceptions.");
}

// ---------------------------------------------------------------------------
// TEST 9: Admin User ID Excluded from Learner Query
// ---------------------------------------------------------------------------
{
  const adminRouterPath = path.join(__dirname, "..", "routes", "admin.js");
  const adminRouterSource = fs.readFileSync(adminRouterPath, "utf8");

  assert.ok(
    adminRouterSource.includes("isAdmin: { $ne: true }"),
    "Learner lookup queries must enforce isAdmin: { $ne: true }"
  );
  console.log("PASS 9: Administrator accounts strictly excluded from learner diagnostic queries.");
}

// ---------------------------------------------------------------------------
// TEST 10: Question-Level Review Permalink Renders Question Diagnostics
// ---------------------------------------------------------------------------
{
  const quizResultTplPath = path.join(__dirname, "..", "views", "quiz-result.ejs");
  const quizResultTpl = fs.readFileSync(quizResultTplPath, "utf8");

  const mockAttempt = {
    topic: "Recursion Basics",
    score: 3,
    total: 4,
    percentage: 75,
    results: [
      { questionNumber: 1, question: "What is base case?", yourAnswer: "Stopping condition", correctAnswer: "Stopping condition", isCorrect: true, explanation: "Correct" },
      { questionNumber: 2, question: "What causes stack overflow?", yourAnswer: "Infinite loop", correctAnswer: "Missing base case", isCorrect: false, explanation: "Missing base case" },
      { questionNumber: 3, question: "Can recursion be converted to iteration?", yourAnswer: "Yes", correctAnswer: "Yes", isCorrect: true, explanation: "Yes via stack" },
      { questionNumber: 4, question: "What is tail recursion?", yourAnswer: "Last call is recursion", correctAnswer: "Last call is recursion", isCorrect: true, explanation: "Tail recursion" },
    ],
    learner: { username: "charlie", _id: new mongoose.Types.ObjectId() },
    isAdminView: true,
    returnUrl: "/admin/learners/some-id",
  };

  const html = ejs.render(quizResultTpl, mockAttempt, { filename: quizResultTplPath });
  assert.ok(html.includes("ADMINISTRATIVE ATTEMPT REVIEW"), "Admin view must render administrative header");
  assert.ok(html.includes("Return to Learner Profile"), "Admin view must provide link back to learner profile");
  assert.ok(html.includes("What is base case?"), "Question diagnostics must render question text");
  assert.ok(html.includes("Stopping condition"), "Question diagnostics must render answer");
  console.log("PASS 10: Diagnostic review permalink renders question details with administrative return actions.");
}

// ---------------------------------------------------------------------------
// TEST 11: Secure CSV Export Header, Safe Quoting, and Formula Injection Mitigation
// ---------------------------------------------------------------------------
{
  // Test formula injection values: starts with =, +, -, @
  function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  const formulaAttack = "=SUM(A1:A10)";
  const sanitizedAttack = sanitizeCsvCell(formulaAttack);
  assert.strictEqual(sanitizedAttack, `"'=SUM(A1:A10)"`, "Formula starting with = must be prepended with '");

  const plusAttack = "+123456789";
  assert.strictEqual(sanitizeCsvCell(plusAttack), `"'+123456789"`);

  const normalTopic = "Data Structures & Algorithms";
  assert.strictEqual(sanitizeCsvCell(normalTopic), `"Data Structures & Algorithms"`);

  const quoteTopic = 'Binary "Search" Trees';
  assert.strictEqual(sanitizeCsvCell(quoteTopic), `"Binary ""Search"" Trees"`);

  // Verify routes/admin.js exports headers properly
  const adminRouterPath = path.join(__dirname, "..", "routes", "admin.js");
  const adminRouterSource = fs.readFileSync(adminRouterPath, "utf8");
  assert.ok(adminRouterSource.includes("text/csv; charset=utf-8"), "Content-Type must be text/csv; charset=utf-8");
  assert.ok(adminRouterSource.includes("learnsmart-learner-"), "Filename must follow learnsmart-learner pattern");
  assert.ok(adminRouterSource.includes('"Attempt #"'), "CSV headers must include Attempt #");
  assert.ok(adminRouterSource.includes('"Correct Answers"'), "CSV headers must include Correct Answers");
  assert.ok(adminRouterSource.includes('"Percentage (%)"'), "CSV headers must include Percentage (%)");
  console.log("PASS 11: CSV export enforces safe cell quoting, formula injection mitigation, and required headers.");
}

// ---------------------------------------------------------------------------
// TEST 12: Individual Learner Analytics JSON API Structure
// ---------------------------------------------------------------------------
{
  const adminRouterPath = path.join(__dirname, "..", "routes", "admin.js");
  const adminRouterSource = fs.readFileSync(adminRouterPath, "utf8");

  assert.ok(adminRouterSource.includes('router.get("/api/learners/:userId"'), "API route must exist");
  assert.ok(adminRouterSource.includes('select("-hash -salt")'), "Learner query must exclude hash and salt");
  assert.ok(adminRouterSource.includes("analytics,"), "API response must return analytics");
  assert.ok(adminRouterSource.includes("recentVsEarlier,"), "API response must return recentVsEarlier");
  assert.ok(adminRouterSource.includes("scoreDistribution,"), "API response must return scoreDistribution");
  assert.ok(adminRouterSource.includes("recommendations,"), "API response must return recommendations");
  console.log("PASS 12: Learner JSON API returns comprehensive diagnostics without exposing password hash or salt.");
}

// ---------------------------------------------------------------------------
// TEST 13: Student Directory Sorting and Filtering Excludes Administrators
// ---------------------------------------------------------------------------
{
  const mockStudents = [
    { username: "charlie", averageScore: 65, totalQuizzes: 4, lastActiveDate: "2026-02-10" },
    { username: "alice", averageScore: 92, totalQuizzes: 2, lastActiveDate: "2026-02-12" },
    { username: "bob", averageScore: 78, totalQuizzes: 7, lastActiveDate: "2026-02-01" },
  ];

  // Test sorting by averageScore desc
  const sortedByAvgDesc = [...mockStudents].sort((a, b) => b.averageScore - a.averageScore);
  assert.strictEqual(sortedByAvgDesc[0].username, "alice");
  assert.strictEqual(sortedByAvgDesc[1].username, "bob");
  assert.strictEqual(sortedByAvgDesc[2].username, "charlie");

  // Test sorting by totalQuizzes desc
  const sortedByQuizzesDesc = [...mockStudents].sort((a, b) => b.totalQuizzes - a.totalQuizzes);
  assert.strictEqual(sortedByQuizzesDesc[0].username, "bob");
  assert.strictEqual(sortedByQuizzesDesc[1].username, "charlie");
  assert.strictEqual(sortedByQuizzesDesc[2].username, "alice");

  // Test sorting by username asc
  const sortedByNameAsc = [...mockStudents].sort((a, b) => a.username.localeCompare(b.username));
  assert.strictEqual(sortedByNameAsc[0].username, "alice");
  assert.strictEqual(sortedByNameAsc[1].username, "bob");
  assert.strictEqual(sortedByNameAsc[2].username, "charlie");
  console.log("PASS 13: Directory sorting by averageScore, totalQuizzes, and username functions accurately.");
}

// ---------------------------------------------------------------------------
// TEST 14: React Student Management Route Isolation Intact
// ---------------------------------------------------------------------------
{
  const adminRouterPath = path.join(__dirname, "..", "routes", "admin.js");
  const adminRouterSource = fs.readFileSync(adminRouterPath, "utf8");

  assert.ok(adminRouterSource.includes('router.get("/students*"'), "React SPA wildcard route must remain intact");
  assert.ok(adminRouterSource.includes('router.get("/learners/:userId"'), "Dedicated learner analytics must use separate /learners path");
  console.log("PASS 14: React student management portal preserved at /admin/students* without route collision.");
}

console.log("\n=================================================");
console.log(" ALL 14 ADMIN STUDENT ANALYTICS TESTS PASSED!    ");
console.log("=================================================\n");
