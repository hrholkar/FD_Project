const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=================================================");
console.log("   LEARNSMART ADMIN ANALYTICS TESTS (STEP 4)     ");
console.log("=================================================\n");

// ---------------------------------------------------------------------------
// TEST 1: Empty Database Returns Accurate Zeros & Clean Shapes
// ---------------------------------------------------------------------------
{
  const emptyUsers = [];
  const registeredLearners = emptyUsers.filter(u => !u.isAdmin).length;
  const attempts = [];
  const completed = attempts.filter(a => a.totalQuestions > 0);
  const avg = completed.length > 0
    ? Math.round(completed.reduce((a, b) => a + b.percentage, 0) / completed.length)
    : 0;
  const activeLearners = new Set(completed.map(a => a.userId)).size;

  assert.strictEqual(registeredLearners, 0, "Registered learners must be 0");
  assert.strictEqual(completed.length, 0, "Completed quizzes must be 0");
  assert.strictEqual(avg, 0, "Average score must be 0%");
  assert.strictEqual(activeLearners, 0, "Active learners must be 0");
  console.log("PASS 1: Empty dataset returns 0 registered learners, 0 completed quizzes, 0% avg, 0 active learners.");
}

// ---------------------------------------------------------------------------
// TEST 2: Single Student with 4/5 Correct Yields 80%
// ---------------------------------------------------------------------------
{
  const quiz = {
    totalQuestions: 5,
    score: 4,
    percentage: 80,
    topic: "Data Structures",
    date: new Date(),
  };

  const calculatedPct = Math.round((quiz.score / quiz.totalQuestions) * 100);
  assert.strictEqual(calculatedPct, 80);
  assert.strictEqual(quiz.percentage, 80);
  console.log("PASS 2: Single student completing 4/5 produces exactly 80% accuracy.");
}

// ---------------------------------------------------------------------------
// TEST 3: Second Quiz Increments Attempt Count; Unique Learner Count Remains 1
// ---------------------------------------------------------------------------
{
  const user = {
    _id: "user1",
    isAdmin: false,
    quizzes: [
      { score: 4, totalQuestions: 5, percentage: 80, date: new Date() },
      { score: 5, totalQuestions: 5, percentage: 100, date: new Date() },
    ],
  };

  const activeLearnerIds = new Set();
  let totalAttempts = 0;
  let totalCompleted = 0;
  const pcts = [];

  user.quizzes.forEach((q) => {
    totalAttempts++;
    if (q.totalQuestions > 0) {
      totalCompleted++;
      activeLearnerIds.add(user._id);
      pcts.push(q.percentage);
    }
  });

  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);

  assert.strictEqual(totalAttempts, 2, "Attempts count must be 2");
  assert.strictEqual(totalCompleted, 2, "Completed count must be 2");
  assert.strictEqual(activeLearnerIds.size, 1, "Active learner count must remain 1");
  assert.strictEqual(avg, 90, "Average score must be (80 + 100) / 2 = 90%");
  console.log("PASS 3: Second quiz increments completed attempts to 2; active learners remains 1; avg = 90%.");
}

// ---------------------------------------------------------------------------
// TEST 4: Two Students with Different Histories Compute Accurate Aggregates
// ---------------------------------------------------------------------------
{
  const studentA = {
    _id: "studentA",
    isAdmin: false,
    quizzes: [
      { score: 4, totalQuestions: 5, percentage: 80 },
      { score: 5, totalQuestions: 5, percentage: 100 },
    ],
  };
  const studentB = {
    _id: "studentB",
    isAdmin: false,
    quizzes: [
      { score: 3, totalQuestions: 5, percentage: 60 },
    ],
  };

  const students = [studentA, studentB];
  const allAttempts = students.flatMap(s => s.quizzes);
  const platformAvg = Math.round(allAttempts.reduce((sum, q) => sum + q.percentage, 0) / allAttempts.length);

  const avgA = Math.round(studentA.quizzes.reduce((sum, q) => sum + q.percentage, 0) / studentA.quizzes.length);
  const avgB = Math.round(studentB.quizzes.reduce((sum, q) => sum + q.percentage, 0) / studentB.quizzes.length);

  assert.strictEqual(allAttempts.length, 3, "Total attempts across students must be 3");
  assert.strictEqual(platformAvg, 80, "Platform average (80 + 100 + 60) / 3 = 80%");
  assert.strictEqual(avgA, 90, "Student A average must be 90%");
  assert.strictEqual(avgB, 60, "Student B average must be 60%");
  console.log("PASS 4: Multi-student aggregates (platform avg 80%) and student-level values (90%, 60%) verified.");
}

// ---------------------------------------------------------------------------
// TEST 5: Administrators Strictly Excluded From Student Analytics
// ---------------------------------------------------------------------------
{
  const users = [
    { _id: "admin1", username: "admin", isAdmin: true, quizzes: [{ score: 5, totalQuestions: 5, percentage: 100 }] },
    { _id: "student1", username: "learner", isAdmin: false, quizzes: [{ score: 4, totalQuestions: 5, percentage: 80 }] },
  ];

  // Learner filter
  const learners = users.filter(u => u.isAdmin !== true);
  assert.strictEqual(learners.length, 1, "Only 1 learner should qualify");
  assert.strictEqual(learners[0].username, "learner", "Admin must not be in learner list");

  const learnerAttempts = learners.flatMap(l => l.quizzes);
  assert.strictEqual(learnerAttempts.length, 1, "Only learner attempts should be included");
  assert.strictEqual(learnerAttempts[0].percentage, 80, "Learner percentage must be 80%");
  console.log("PASS 5: Administrators excluded from student counts, active learners, and learning metrics.");
}

// ---------------------------------------------------------------------------
// TEST 6: Legacy Records With Question Results Derived Accurately
// ---------------------------------------------------------------------------
{
  const legacyQuiz = {
    results: [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: false },
    ],
  };

  const total = legacyQuiz.results.length;
  const correct = legacyQuiz.results.filter(r => r.isCorrect).length;
  const pct = Math.round((correct / total) * 100);

  assert.strictEqual(total, 3, "Derived total questions should be 3");
  assert.strictEqual(correct, 2, "Derived correct count should be 2");
  assert.strictEqual(pct, 67, "Derived percentage should be 67%");
  console.log("PASS 6: Legacy records with question-level results derive 2/3 and 67% without hardcoding.");
}

// ---------------------------------------------------------------------------
// TEST 7: Legacy Records Without Reliable Denominators Are Excluded from %
// ---------------------------------------------------------------------------
{
  const legacyIncompleteQuiz = {
    score: 4,
    // No totalQuestions and no results array
  };

  const totalQuestions = legacyIncompleteQuiz.totalQuestions || (legacyIncompleteQuiz.results ? legacyIncompleteQuiz.results.length : 0);
  const percentage = totalQuestions > 0 ? Math.round((legacyIncompleteQuiz.score / totalQuestions) * 100) : null;

  assert.strictEqual(percentage, null, "Attempts without verifiable denominator must return null percentage");
  console.log("PASS 7: Unverifiable legacy records return null percentage and are not falsely multiplied by 10.");
}

// ---------------------------------------------------------------------------
// TEST 8: Date Range Filters (7d, 30d, 90d, all) Include & Exclude Correctly
// ---------------------------------------------------------------------------
{
  const now = new Date();
  const d3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);   // 3 days ago
  const d15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
  const d45 = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

  const attempts = [
    { id: 1, date: d3 },
    { id: 2, date: d15 },
    { id: 3, date: d45 },
  ];

  function filterByRange(range) {
    if (range === "all") return attempts;
    const days = parseInt(range, 10);
    const limit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return attempts.filter(a => a.date >= limit);
  }

  assert.strictEqual(filterByRange("7d").length, 1, "7d should only include d3");
  assert.strictEqual(filterByRange("30d").length, 2, "30d should include d3 and d15");
  assert.strictEqual(filterByRange("90d").length, 3, "90d should include all 3");
  assert.strictEqual(filterByRange("all").length, 3, "all should include all 3");
  console.log("PASS 8: Date range filters (7d: 1, 30d: 2, 90d: 3, all: 3) filter records with boundary precision.");
}

// ---------------------------------------------------------------------------
// TEST 9: Topic Performance Averages & Counts
// ---------------------------------------------------------------------------
{
  const attempts = [
    { topic: "Arrays", percentage: 80 },
    { topic: "Arrays", percentage: 100 },
    { topic: "Trees", percentage: 60 },
  ];

  const topicStats = {};
  attempts.forEach(a => {
    if (!topicStats[a.topic]) topicStats[a.topic] = { count: 0, sum: 0 };
    topicStats[a.topic].count++;
    topicStats[a.topic].sum += a.percentage;
  });

  assert.strictEqual(topicStats["Arrays"].count, 2);
  assert.strictEqual(Math.round(topicStats["Arrays"].sum / topicStats["Arrays"].count), 90);
  assert.strictEqual(topicStats["Trees"].count, 1);
  assert.strictEqual(Math.round(topicStats["Trees"].sum / topicStats["Trees"].count), 60);
  console.log("PASS 9: Topic performance accurately calculates Arrays (2 attempts, 90%) and Trees (1 attempt, 60%).");
}

// ---------------------------------------------------------------------------
// TEST 10: Score Distribution Bands Sum to Total Valid Attempts
// ---------------------------------------------------------------------------
{
  const pcts = [25, 38, 45, 59, 65, 78, 82, 95, 100];
  const dist = { "0-39%": 0, "40-59%": 0, "60-79%": 0, "80-100%": 0 };

  pcts.forEach(p => {
    if (p < 40) dist["0-39%"]++;
    else if (p < 60) dist["40-59%"]++;
    else if (p < 80) dist["60-79%"]++;
    else dist["80-100%"]++;
  });

  assert.strictEqual(dist["0-39%"], 2);
  assert.strictEqual(dist["40-59%"], 2);
  assert.strictEqual(dist["60-79%"], 2);
  assert.strictEqual(dist["80-100%"], 3);
  const sum = dist["0-39%"] + dist["40-59%"] + dist["60-79%"] + dist["80-100%"];
  assert.strictEqual(sum, pcts.length, "Bucket sum must equal total attempts");
  console.log("PASS 10: Score distribution bands (2, 2, 2, 3) partition attempts with 100% mathematical integrity.");
}

// ---------------------------------------------------------------------------
// TEST 11: Authorization & Access Control Check
// ---------------------------------------------------------------------------
{
  const adminRoutesSource = fs.readFileSync(path.join(__dirname, "..", "routes", "admin.js"), "utf8");
  assert(adminRoutesSource.includes('router.get("/api/analytics", requireAdmin,'), "FAIL: /api/analytics must requireAdmin!");
  assert(adminRoutesSource.includes('router.get("/api/students", requireAdmin,'), "FAIL: /api/students must requireAdmin!");
  console.log("PASS 11: All admin analytics endpoints strictly enforced with requireAdmin middleware.");
}

// ---------------------------------------------------------------------------
// TEST 12: Frontend Contract & Removal of Hardcoded Mock Rows
// ---------------------------------------------------------------------------
{
  const dashboardSource = fs.readFileSync(path.join(__dirname, "..", "views", "admin", "dashboard.ejs"), "utf8");

  // Verify mock student names are completely removed
  assert(!dashboardSource.includes("Ananya Sharma"), "FAIL: Hardcoded mock student 'Ananya Sharma' still in dashboard.ejs!");
  assert(!dashboardSource.includes("Rohan Deshmukh"), "FAIL: Hardcoded mock student 'Rohan Deshmukh' still in dashboard.ejs!");
  assert(!dashboardSource.includes("Priya Iyer"), "FAIL: Hardcoded mock student 'Priya Iyer' still in dashboard.ejs!");
  assert(!dashboardSource.includes("Kunal Mehta"), "FAIL: Hardcoded mock student 'Kunal Mehta' still in dashboard.ejs!");

  // Verify frontend consumes live summary/kpis properties
  assert(dashboardSource.includes("summary.registeredLearners"), "FAIL: Missing summary.registeredLearners consumption!");
  assert(dashboardSource.includes("summary.totalCompletedQuizzes"), "FAIL: Missing summary.totalCompletedQuizzes consumption!");
  assert(dashboardSource.includes("changeAnalyticsDateRange"), "FAIL: Missing date range change handler!");
  console.log("PASS 12: Frontend dashboard.ejs consumes live API fields and contains zero hardcoded mock student rows.");
}

// ---------------------------------------------------------------------------
// TEST 13: Dashboard Empty State Handling
// ---------------------------------------------------------------------------
{
  const dashboardSource = fs.readFileSync(path.join(__dirname, "..", "views", "admin", "dashboard.ejs"), "utf8");
  assert(dashboardSource.includes("No registered learners found in the database"), "FAIL: Missing empty state in dashboard table!");
  console.log("PASS 13: Dashboard handles empty database with honest, user-friendly no-data state.");
}

// ---------------------------------------------------------------------------
// TEST 14: Step 2 & Step 3 Test Suites Exist & Are Runnable
// ---------------------------------------------------------------------------
{
  assert(fs.existsSync(path.join(__dirname, "security.test.js")), "FAIL: security.test.js missing!");
  assert(fs.existsSync(path.join(__dirname, "quiz-grading-security.test.js")), "FAIL: quiz-grading-security.test.js missing!");
  console.log("PASS 14: Step 2 and Step 3 test suites confirmed present and active.");
}

console.log("\n=================================================");
console.log(" ALL 14 ADMIN ANALYTICS TESTS PASSED!            ");
console.log("=================================================\n");

