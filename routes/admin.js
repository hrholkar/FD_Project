const express = require("express");
const router = express.Router();
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/profile");
const Student = require("../models/Student");
const {
  computeStudentAnalytics,
  computeLearnerRecentVsEarlier,
  computeLearnerScoreDistribution,
  computeLearningRecommendations,
} = require("../services/studentAnalytics");

/**
 * Middleware to restrict access strictly to authenticated administrators
 */
function requireAdmin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes("json") || req.path.startsWith("/api/")) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Administrator privileges required.",
    });
  }
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/login");
  }
  return res.status(403).render("error.ejs", {
    title: "Administrator Access Restricted",
    message: "You must be signed in with an authorized LearnSmart administrator account to access this page.",
    statusCode: 403,
  });
}

/**
 * @route   GET /admin
 * @desc    Redirect to Admin Dashboard
 * @access  Admin only
 */
router.get("/", requireAdmin, (req, res) => {
  res.redirect("/admin/dashboard");
});

/**
 * @route   GET /admin/students
 * @desc    Serve the React Student Management portal
 * @access  Admin only
 */
router.get("/students*", requireAdmin, (req, res) => {
  const reactDistPath = path.join(__dirname, "..", "practicals", "react-student-management", "dist");
  res.sendFile(path.join(reactDistPath, "index.html"));
});

/**
 * @route   GET /admin/analytics
 * @desc    Admin Analytics Dashboard alias
 * @access  Admin only
 */
router.get("/analytics", requireAdmin, (req, res) => {
  res.redirect("/admin/dashboard");
});

/**
 * @route   GET /admin/scores
 * @desc    Render the raw scores tabular view
 * @access  Admin only
 */
router.get("/scores", requireAdmin, async (req, res) => {
  try {
    const allUsers = await User.find({ isAdmin: { $ne: true } }, "username educationLevel testScores quizzes").lean();
    let scores = [];

    allUsers.forEach((user) => {
      const topicQuizMap = {};
      (user.quizzes || []).forEach((q) => {
        const t = q.topic || "General";
        if (!topicQuizMap[t]) topicQuizMap[t] = [];
        const total = q.totalQuestions || (q.results ? q.results.length : 0);
        const correct = typeof q.score === "number" ? q.score : (q.results ? q.results.filter((r) => r.isCorrect).length : 0);
        const pct = typeof q.percentage === "number" ? q.percentage : (total > 0 ? Math.round((correct / total) * 100) : null);
        topicQuizMap[t].push({
          score: correct,
          total,
          percentage: pct,
        });
      });

      const coveredTopics = new Set();

      // 1. Precise scores derived from detailed quiz attempts
      Object.keys(topicQuizMap).forEach((topic) => {
        coveredTopics.add(topic.toLowerCase());
        const attempts = topicQuizMap[topic];
        const validPercentages = attempts.map((a) => a.percentage).filter((p) => p !== null && !isNaN(p));
        const avgPct = validPercentages.length > 0
          ? (validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length).toFixed(1)
          : "0.0";

        scores.push({
          username: user.username,
          educationLevel: user.educationLevel,
          topic,
          scores: attempts.map((a) => (a.percentage !== null ? a.percentage : a.score)),
          displayScores: attempts.map((a) => (a.percentage !== null ? `${a.percentage}%` : `${a.score}/${a.total}`)),
          avgScore: avgPct,
          isPercentage: true,
          totalAttempts: attempts.length,
        });
      });

      // 2. Legacy testScores without detailed quiz records preserved accurately
      (user.testScores || []).forEach((test) => {
        if (!coveredTopics.has((test.topic || "").toLowerCase())) {
          const rawScores = test.scores || [];
          // Inspect if values appear to be raw counts (e.g. <= 10) or percentages
          const isLikelyPercentage = rawScores.some((s) => s > 10);
          const rawAvg = rawScores.length > 0
            ? (rawScores.reduce((a, b) => a + b, 0) / rawScores.length).toFixed(1)
            : "0.0";

          scores.push({
            username: user.username,
            educationLevel: user.educationLevel,
            topic: test.topic,
            scores: rawScores,
            displayScores: rawScores.map((s) => (isLikelyPercentage ? `${s}%` : `${s} pts`)),
            avgScore: rawAvg,
            isPercentage: isLikelyPercentage,
            totalAttempts: rawScores.length,
          });
        }
      });
    });

    const { topic: topicFilter, student: studentFilter } = req.query;
    if (topicFilter) {
      scores = scores.filter((s) => s.topic === topicFilter);
    }
    if (studentFilter) {
      scores = scores.filter((s) => s.username === studentFilter);
    }

    const uniqueTopics = [...new Set(scores.map((s) => s.topic))];
    const uniqueStudents = [...new Set(allUsers.map((u) => u.username))];

    res.render("admin/scores", {
      scores,
      uniqueTopics,
      uniqueStudents,
      topic: topicFilter || "",
      student: studentFilter || "",
    });
  } catch (err) {
    console.error("Error fetching data for admin scores:", err);
    res.status(500).send("Server Error while fetching admin scores data.");
  }
});

/**
 * @route   GET /admin/dashboard
 * @desc    Render the unified Admin Analytics Dashboard
 * @access  Admin only
 */
router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const allUsers = await User.find({ isAdmin: { $ne: true } }, "username email educationLevel testScores quizzes").lean();
    const allStudents = await Student.find({}, "name rollNumber course academicYear createdAt").lean();

    // Collect all available topics from quizzes & testScores
    const topicsSet = new Set();
    allUsers.forEach((u) => {
      (u.quizzes || []).forEach((q) => {
        if (q.topic) topicsSet.add(q.topic);
      });
      (u.testScores || []).forEach((ts) => {
        if (ts.topic) topicsSet.add(ts.topic);
      });
    });
    const topics = Array.from(topicsSet).sort();

    // Available courses
    const courses = [
      "Computer Science & Engineering",
      "Information Technology",
      "Artificial Intelligence & Data Science",
      "Electronics & Telecommunication",
      "Mechanical Engineering",
      "Civil Engineering",
      "Electrical Engineering",
      "Other",
    ];

    res.render("admin/dashboard", {
      user: req.user,
      topics,
      courses,
      totalUsers: allUsers.length,
      totalStudents: allStudents.length,
    });
  } catch (err) {
    console.error("Admin dashboard render error:", err);
    res.status(500).render("error.ejs", {
      title: "Admin Dashboard Error",
      message: "An error occurred while loading administrative analytics.",
    });
  }
});

/**
 * @route   GET /admin/api/analytics
 * @desc    Get aggregated platform analytics with filters for Admin charts
 * @access  Admin only
 */
router.get("/api/analytics", requireAdmin, async (req, res) => {
  try {
    const { dateRange, topic, course, academicYear } = req.query;

    // Determine date cutoff
    let dateLimit = null;
    const now = new Date();
    if (dateRange === "7d") {
      dateLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30d" || !dateRange) {
      dateLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "90d") {
      dateLimit = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "all") {
      dateLimit = null;
    }

    // Query registered learners strictly (exclude administrators)
    const learnerFilter = { isAdmin: { $ne: true } };
    const users = await User.find(
      learnerFilter,
      "username email educationLevel quizzes createdAt"
    ).lean();

    // Query institutional Student directory (if any)
    let studentQuery = {};
    if (course && course !== "all") studentQuery.course = course;
    if (academicYear && academicYear !== "all") studentQuery.academicYear = academicYear;
    const enrolledStudents = await Student.find(studentQuery).lean();

    // Collect qualifying completed quiz attempts from real student records
    let attempts = [];
    const activeLearnerIds = new Set();

    users.forEach((user) => {
      let userHasQualifyingAttempt = false;

      (user.quizzes || []).forEach((quiz) => {
        // Parse date reliably without fallback to "now" for historical records
        const attemptDate = quiz.date ? new Date(quiz.date) : null;
        const isValidDate = attemptDate && !isNaN(attemptDate.getTime());

        // Respect date limit filter: undated attempts are excluded from date-bounded ranges
        if (dateLimit) {
          if (!isValidDate || attemptDate < dateLimit) return;
        }

        // Respect topic filter
        if (topic && topic !== "all" && (quiz.topic || "").toLowerCase() !== topic.toLowerCase()) {
          return;
        }

        // Derive actual question count and score without assumptions
        const totalQuestions =
          typeof quiz.totalQuestions === "number" && quiz.totalQuestions > 0
            ? quiz.totalQuestions
            : (quiz.results?.length || 0);

        const correctCount =
          typeof quiz.score === "number"
            ? quiz.score
            : ((quiz.results || []).filter((r) => r.isCorrect).length);

        const hasReliableDenominator = totalQuestions > 0;
        const percentage =
          typeof quiz.percentage === "number" && !isNaN(quiz.percentage)
            ? quiz.percentage
            : (hasReliableDenominator ? Math.round((correctCount / totalQuestions) * 100) : null);

        attempts.push({
          userId: user._id,
          username: user.username,
          educationLevel: user.educationLevel || "Undergraduate",
          topic: quiz.topic || "General",
          date: isValidDate ? attemptDate : null,
          score: correctCount,
          total: totalQuestions,
          percentage,
          isCompleted: hasReliableDenominator,
        });

        if (hasReliableDenominator) {
          userHasQualifyingAttempt = true;
        }
      });

      if (userHasQualifyingAttempt) {
        activeLearnerIds.add(String(user._id));
      }
    });

    // 1. Core Summary Metrics & KPIs
    const totalRegisteredUsers = users.length;
    const totalQuizAttempts = attempts.length;
    const completedAttempts = attempts.filter((a) => a.isCompleted);
    const totalCompletedQuizzes = completedAttempts.length;

    // Percentage calculations include only attempts with a verified denominator
    const attemptsWithValidPercentages = attempts.filter(
      (a) => a.percentage !== null && !isNaN(a.percentage)
    );
    const totalPercentageSum = attemptsWithValidPercentages.reduce(
      (acc, a) => acc + a.percentage,
      0
    );
    const platformAverageScore =
      attemptsWithValidPercentages.length > 0
        ? Math.round(totalPercentageSum / attemptsWithValidPercentages.length)
        : 0;

    const activeSubjectsCount = new Set(attempts.map((a) => a.topic)).size;
    const activeLearners = activeLearnerIds.size;

    // 2. Performance Distribution (mutually exclusive score buckets)
    const distribution = {
      "0-39%": 0,
      "40-59%": 0,
      "60-79%": 0,
      "80-100%": 0,
    };
    attemptsWithValidPercentages.forEach((a) => {
      const p = a.percentage;
      if (p < 40) distribution["0-39%"]++;
      else if (p < 60) distribution["40-59%"]++;
      else if (p < 80) distribution["60-79%"]++;
      else distribution["80-100%"]++;
    });

    // 3. Subject-Wise Performance
    const subjectStats = {};
    attemptsWithValidPercentages.forEach((a) => {
      if (!subjectStats[a.topic]) {
        subjectStats[a.topic] = { totalAttempts: 0, scoreSum: 0 };
      }
      subjectStats[a.topic].totalAttempts++;
      subjectStats[a.topic].scoreSum += a.percentage;
    });

    const subjectLabels = Object.keys(subjectStats).sort();
    const subjectAverages = subjectLabels.map((s) =>
      Math.round(subjectStats[s].scoreSum / subjectStats[s].totalAttempts)
    );
    const subjectCounts = subjectLabels.map((s) => subjectStats[s].totalAttempts);

    // 4. Chronological Performance Over Time
    const timelineMap = {};
    if (dateRange === "7d") {
      for (let d = 6; d >= 0; d--) {
        const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        timelineMap[day.toISOString().split("T")[0]] = { sum: 0, count: 0, completed: 0 };
      }
    }

    attempts
      .filter((a) => a.date !== null)
      .sort((a, b) => a.date - b.date)
      .forEach((a) => {
        const dateKey = a.date.toISOString().split("T")[0];
        if (!timelineMap[dateKey]) {
          timelineMap[dateKey] = { sum: 0, count: 0, completed: 0 };
        }
        if (a.percentage !== null) {
          timelineMap[dateKey].sum += a.percentage;
          timelineMap[dateKey].count++;
        }
        if (a.isCompleted) timelineMap[dateKey].completed++;
      });

    const timelineLabels = Object.keys(timelineMap).sort();
    const timelineScores = timelineLabels.map((d) =>
      timelineMap[d].count > 0 ? Math.round(timelineMap[d].sum / timelineMap[d].count) : 0
    );
    const timelineAttempts = timelineLabels.map((d) => timelineMap[d].count);
    const timelineCompleted = timelineLabels.map((d) => timelineMap[d].completed);

    // 5. Course & Directory Distribution
    const courseDistribution = {};
    const yearDistribution = {};
    enrolledStudents.forEach((st) => {
      courseDistribution[st.course] = (courseDistribution[st.course] || 0) + 1;
      yearDistribution[st.academicYear] = (yearDistribution[st.academicYear] || 0) + 1;
    });

    // Fallback distribution from User educationLevel if Student collection is empty
    if (Object.keys(courseDistribution).length === 0) {
      users.forEach((u) => {
        const lvl = u.educationLevel || "Undergraduate";
        courseDistribution[lvl] = (courseDistribution[lvl] || 0) + 1;
      });
      yearDistribution["Active Learners"] = activeLearners;
    }

    const responseData = {
      success: true,
      summary: {
        totalRegisteredUsers,
        registeredLearners: totalRegisteredUsers,
        activeLearners,
        totalEnrolledStudents: enrolledStudents.length,
        totalQuizAttempts,
        totalCompletedQuizzes,
        platformAverageScore,
        activeSubjectsCount,
      },
      kpis: {
        registeredUsers: totalRegisteredUsers,
        activeLearners,
        enrolledStudents: enrolledStudents.length,
        completedQuizzes: totalCompletedQuizzes,
        overallAvgScore: platformAverageScore,
      },
      performanceOverTime: {
        labels: timelineLabels,
        averageScores: timelineScores,
        attemptsCount: timelineAttempts,
        completedCount: timelineCompleted,
      },
      subjectPerformance: {
        labels: subjectLabels,
        averages: subjectAverages,
        counts: subjectCounts,
      },
      performanceDistribution: distribution,
      enrollmentStats: {
        courses: {
          labels: Object.keys(courseDistribution),
          counts: Object.values(courseDistribution),
        },
        years: {
          labels: Object.keys(yearDistribution),
          counts: Object.values(yearDistribution),
        },
      },
    };

    // Wrap response in data property to satisfy both root and data.data client contracts
    responseData.data = { ...responseData };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Admin analytics API error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate admin analytics metrics.",
    });
  }
});

/**
 * @route   GET /admin/api/students
 * @desc    Get comparative student list safely without exposing secrets
 * @access  Admin only
 */
router.get("/api/students", requireAdmin, async (req, res) => {
  try {
    const { studentIds, topic, q, sortBy, order } = req.query;
    // Strictly exclude administrators from student directory and performance table
    let filter = { isAdmin: { $ne: true } };

    if (studentIds) {
      const ids = studentIds.split(",").filter((id) => mongoose.isValidObjectId(id));
      if (ids.length > 0) filter._id = { $in: ids };
    }

    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(
      filter,
      "username email educationLevel quizzes testScores createdAt"
    ).lean();

    const comparisonList = users.map((u) => {
      let filteredQuizzes = u.quizzes || [];
      if (topic && topic !== "all") {
        filteredQuizzes = filteredQuizzes.filter(
          (qz) => qz.topic?.toLowerCase() === topic.toLowerCase()
        );
      }

      const validScores = [];
      filteredQuizzes.forEach((qz) => {
        if (typeof qz.percentage === "number" && !isNaN(qz.percentage)) {
          validScores.push(qz.percentage);
        } else {
          const total = qz.totalQuestions || qz.results?.length || 0;
          const correct =
            typeof qz.score === "number"
              ? qz.score
              : (qz.results || []).filter((r) => r.isCorrect).length;
          if (total > 0) {
            validScores.push(Math.round((correct / total) * 100));
          }
        }
      });

      const avg =
        validScores.length > 0
          ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
          : null;
      const highest = validScores.length > 0 ? Math.max(...validScores) : null;

      // Determine most recent completed quiz date
      const quizDates = (u.quizzes || [])
        .map((q) => (q.date ? new Date(q.date) : null))
        .filter((d) => d && !isNaN(d.getTime()));
      const lastActive =
        quizDates.length > 0
          ? new Date(Math.max(...quizDates.map((d) => d.getTime())))
              .toISOString()
              .split("T")[0]
          : "No attempts";

      return {
        _id: u._id,
        username: u.username,
        email: u.email || `${u.username}@learnsmart.edu`,
        educationLevel: u.educationLevel || "Undergraduate",
        course: u.educationLevel || "General Studies",
        totalQuizzes: filteredQuizzes.length,
        completedQuizzes: validScores.length,
        averageScore: avg !== null ? parseFloat(avg) : 0,
        averageScoreText: avg !== null ? `${avg}%` : "N/A",
        highestScore: highest !== null ? highest : 0,
        scores: validScores,
        lastActiveDate: lastActive,
        status: filteredQuizzes.length > 0 ? "Active" : "Inactive",
      };
    });

    if (sortBy) {
      const isAsc = order === "asc";
      comparisonList.sort((a, b) => {
        let valA, valB;
        if (sortBy === "avgScore" || sortBy === "averageScore") {
          valA = a.averageScore || 0;
          valB = b.averageScore || 0;
        } else if (sortBy === "totalQuizzes") {
          valA = a.totalQuizzes || 0;
          valB = b.totalQuizzes || 0;
        } else if (sortBy === "lastActive" || sortBy === "lastActiveDate") {
          valA = a.lastActiveDate === "No attempts" ? "" : a.lastActiveDate;
          valB = b.lastActiveDate === "No attempts" ? "" : b.lastActiveDate;
        } else if (sortBy === "username") {
          valA = (a.username || "").toLowerCase();
          valB = (b.username || "").toLowerCase();
        } else {
          return 0;
        }
        if (valA < valB) return isAsc ? -1 : 1;
        if (valA > valB) return isAsc ? 1 : -1;
        return 0;
      });
    }

    return res.status(200).json(comparisonList);
  } catch (err) {
    console.error("Admin students fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch comparative student list." });
  }
});

/**
 * @route   GET /admin/api/search-students
 * @desc    Search students for admin select2 dropdown
 * @access  Admin only
 */
router.get("/api/search-students", requireAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    let query = { isAdmin: { $ne: true } };
    if (q) {
      query.$or = [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    const students = await User.find(query, "username email educationLevel").limit(20).lean();
    return res.status(200).json(students);
  } catch (err) {
    console.error("Search students error:", err);
    return res.status(500).json([]);
  }
});

/**
 * @route   GET /admin/api/all-students
 * @desc    Get all students for dropdown selection
 * @access  Admin only
 */
router.get("/api/all-students", requireAdmin, async (req, res) => {
  try {
    const students = await User.find({ isAdmin: { $ne: true } }, "username email educationLevel").lean();
    return res.status(200).json(students);
  } catch (err) {
    console.error("All students fetch error:", err);
    return res.status(500).json([]);
  }
});


/**
 * Helper to escape CSV cell and mitigate CSV formula injection
 */
function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Mitigate formula injection (=, +, -, @, tab, cr)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * @route   GET /admin/learners/:userId
 * @desc    Dedicated administrator view for individual student analytics
 * @access  Admin only
 */
router.get("/learners/:userId", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).render("error.ejs", {
        title: "Learner Not Found",
        message: "Invalid learner identifier specified.",
        statusCode: 404,
      });
    }

    const learner = await User.findOne({ _id: userId, isAdmin: { $ne: true } })
      .select("-hash -salt")
      .lean();

    if (!learner) {
      return res.status(404).render("error.ejs", {
        title: "Learner Not Found",
        message: "No student account matching the specified ID was found.",
        statusCode: 404,
      });
    }

    // Optional cross-reference with institutional Student directory
    let institutionalStudent = null;
    if (learner.email) {
      institutionalStudent = await Student.findOne({ email: learner.email }).lean();
    }

    const analytics = computeStudentAnalytics(learner);
    const recentVsEarlier = computeLearnerRecentVsEarlier(learner.quizzes);
    const scoreDistribution = computeLearnerScoreDistribution(learner.quizzes);
    const recommendations = computeLearningRecommendations(analytics);

    return res.render("admin/learner-detail.ejs", {
      user: req.user,
      learner,
      institutionalStudent,
      analytics,
      recentVsEarlier,
      scoreDistribution,
      recommendations,
    });
  } catch (err) {
    console.error("Admin learner detail fetch error:", err);
    return res.status(500).render("error.ejs", {
      title: "Error Loading Student Analytics",
      message: "An error occurred while loading individual student diagnostics.",
      statusCode: 500,
    });
  }
});

/**
 * @route   GET /admin/api/learners/:userId
 * @desc    Individual student analytics JSON endpoint for administrator tools
 * @access  Admin only
 */
router.get("/api/learners/:userId", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({
        success: false,
        error: "Invalid learner identifier specified.",
      });
    }

    const learner = await User.findOne({ _id: userId, isAdmin: { $ne: true } })
      .select("-hash -salt")
      .lean();

    if (!learner) {
      return res.status(404).json({
        success: false,
        error: "Learner not found.",
      });
    }

    let institutionalStudent = null;
    if (learner.email) {
      institutionalStudent = await Student.findOne({ email: learner.email }).lean();
    }

    const analytics = computeStudentAnalytics(learner);
    const recentVsEarlier = computeLearnerRecentVsEarlier(learner.quizzes);
    const scoreDistribution = computeLearnerScoreDistribution(learner.quizzes);
    const recommendations = computeLearningRecommendations(analytics);

    return res.status(200).json({
      success: true,
      learner: {
        _id: learner._id,
        username: learner.username,
        email: learner.email,
        educationLevel: learner.educationLevel,
        createdAt: learner.createdAt,
      },
      institutionalStudent,
      analytics,
      recentVsEarlier,
      scoreDistribution,
      recommendations,
    });
  } catch (err) {
    console.error("Admin learner API fetch error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch student analytics payload.",
    });
  }
});

/**
 * @route   GET /admin/learners/:userId/review/:attemptIdOrIndex
 * @desc    Diagnostic question-level review permalink for administrators
 * @access  Admin only
 */
router.get("/learners/:userId/review/:attemptIdOrIndex", requireAdmin, async (req, res) => {
  try {
    const { userId, attemptIdOrIndex } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).render("error.ejs", {
        title: "Learner Not Found",
        message: "Invalid learner identifier specified.",
        statusCode: 404,
      });
    }

    const learner = await User.findOne({ _id: userId, isAdmin: { $ne: true } })
      .select("-hash -salt")
      .lean();

    if (!learner) {
      return res.status(404).render("error.ejs", {
        title: "Learner Not Found",
        message: "No student account matching the specified ID was found.",
        statusCode: 404,
      });
    }

    const rawQuizzes = Array.isArray(learner.quizzes) ? learner.quizzes : [];
    const quizzes = [...rawQuizzes].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    let attempt = null;
    let attemptNumber = 1;

    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      if (
        (q.attemptId && String(q.attemptId) === String(attemptIdOrIndex)) ||
        (q._id && String(q._id) === String(attemptIdOrIndex)) ||
        String(i + 1) === String(attemptIdOrIndex)
      ) {
        attempt = q;
        attemptNumber = i + 1;
        break;
      }
    }

    if (!attempt) {
      return res.status(404).render("error.ejs", {
        title: "Attempt Not Found",
        message: "The requested quiz attempt could not be found for this learner.",
        statusCode: 404,
      });
    }

    const results = Array.isArray(attempt.results) ? attempt.results : [];
    const derivedCorrect = results.filter((r) => r.isCorrect).length;
    const score = typeof attempt.score === "number" ? attempt.score : derivedCorrect;
    const total =
      typeof attempt.totalQuestions === "number" && attempt.totalQuestions > 0
        ? attempt.totalQuestions
        : results.length > 0
        ? results.length
        : 5;
    const percentage =
      typeof attempt.percentage === "number"
        ? attempt.percentage
        : total > 0
        ? Math.round((score / total) * 100)
        : 0;

    return res.render("quiz-result.ejs", {
      topic: attempt.topic || "General Assessment",
      score,
      total,
      percentage,
      attemptNumber,
      results: results.map((r, rIdx) => ({
        questionNumber: r.questionNumber || rIdx + 1,
        question: r.question || "",
        yourAnswer: r.yourAnswer || r.userAnswer || "Unanswered",
        correctAnswer: r.correctAnswer || "",
        isCorrect: !!r.isCorrect,
        explanation: r.explanation || "",
      })),
      user: req.user,
      learner,
      isAdminView: true,
      returnUrl: `/admin/learners/${learner._id}`,
    });
  } catch (err) {
    console.error("Admin attempt review fetch error:", err);
    return res.status(500).render("error.ejs", {
      title: "Error Loading Attempt Review",
      message: "An error occurred while loading the quiz attempt details.",
      statusCode: 500,
    });
  }
});

/**
 * @route   GET /admin/learners/:userId/export-csv
 * @desc    Export student assessment history to CSV with injection mitigation
 * @access  Admin only
 */
router.get("/learners/:userId/export-csv", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).send("Invalid learner identifier specified.");
    }

    const learner = await User.findOne({ _id: userId, isAdmin: { $ne: true } })
      .select("-hash -salt")
      .lean();

    if (!learner) {
      return res.status(404).send("Learner not found.");
    }

    const rawQuizzes = Array.isArray(learner.quizzes) ? learner.quizzes : [];
    const quizzes = [...rawQuizzes].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    const safeUsername = (learner.username || "student").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `learnsmart-learner-${safeUsername}-quizzes.csv`;

    const headers = [
      "Attempt #",
      "Topic",
      "Difficulty",
      "Date",
      "Correct Answers",
      "Total Questions",
      "Percentage (%)",
    ];

    const rows = quizzes.map((q, idx) => {
      const results = Array.isArray(q.results) ? q.results : [];
      const derivedCorrect = results.filter((r) => r.isCorrect).length;
      const score = typeof q.score === "number" ? q.score : derivedCorrect;
      const total =
        typeof q.totalQuestions === "number" && q.totalQuestions > 0
          ? q.totalQuestions
          : results.length > 0
          ? results.length
          : 5;
      const percentage =
        typeof q.percentage === "number"
          ? q.percentage
          : total > 0
          ? Math.round((score / total) * 100)
          : 0;

      const dateStr = q.date ? new Date(q.date).toISOString().replace("T", " ").slice(0, 19) : "N/A";

      return [
        idx + 1,
        sanitizeCsvCell(q.topic || "General"),
        sanitizeCsvCell(q.difficulty || "general"),
        sanitizeCsvCell(dateStr),
        score,
        total,
        `${percentage}%`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error("Admin learner CSV export error:", err);
    return res.status(500).send("Error exporting learner assessment history.");
  }
});

module.exports = router;
