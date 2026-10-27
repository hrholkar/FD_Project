const express = require("express");
const router = express.Router();
const path = require("path");
const User = require("../models/profile");
const Student = require("../models/Student");

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
    const allUsers = await User.find({}, "username educationLevel testScores").lean();
    let scores = [];
    allUsers.forEach((user) => {
      (user.testScores || []).forEach((test) => {
        const avgScore =
          test.scores.length > 0
            ? ((test.scores.reduce((a, b) => a + b, 0) / test.scores.length) * 10).toFixed(2)
            : 0;
        scores.push({
          username: user.username,
          educationLevel: user.educationLevel,
          topic: test.topic,
          scores: test.scores,
          avgScore: avgScore,
        });
      });
    });

    const { topic: topicFilter, student: studentFilter } = req.query;
    if (topicFilter) {
      scores = scores.filter((s) => s.topic === topicFilter);
    }
    if (studentFilter) {
      scores = scores.filter((s) => s.username === studentFilter);
    }

    const uniqueTopics = [...new Set(allUsers.flatMap((u) => (u.testScores || []).map((t) => t.topic)))];
    const uniqueStudents = allUsers.map((u) => u.username);

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
    const allUsers = await User.find({}, "username email educationLevel testScores quizzes").lean();
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
    } else if (dateRange === "30d") {
      dateLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "90d") {
      dateLimit = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Fetch users with only non-sensitive fields
    const users = await User.find({}, "username educationLevel quizzes testScores createdAt").lean();

    // Query enrolled students
    let studentQuery = {};
    if (course && course !== "all") studentQuery.course = course;
    if (academicYear && academicYear !== "all") studentQuery.academicYear = academicYear;
    const enrolledStudents = await Student.find(studentQuery).lean();

    // Flatten all quiz attempts across all users
    let attempts = [];
    users.forEach((user) => {
      (user.quizzes || []).forEach((quiz, qIdx) => {
        const attemptDate = quiz.date ? new Date(quiz.date) : new Date(user.createdAt || now);

        if (dateLimit && attemptDate < dateLimit) return;
        if (topic && topic !== "all" && quiz.topic?.toLowerCase() !== topic.toLowerCase()) return;

        const totalQuestions = quiz.results?.length || 0;
        const correctCount = (quiz.results || []).filter((r) => r.isCorrect).length;
        const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        attempts.push({
          userId: user._id,
          username: user.username,
          educationLevel: user.educationLevel,
          topic: quiz.topic || "General",
          date: attemptDate,
          score: correctCount,
          total: totalQuestions,
          percentage: percentage,
          isCompleted: totalQuestions > 0,
        });
      });
    });

    // 1. Platform Performance Summary Metrics
    const totalQuizAttempts = attempts.length;
    const totalCompleted = attempts.filter((a) => a.isCompleted).length;
    const totalScoreSum = attempts.reduce((acc, a) => acc + a.percentage, 0);
    const platformAverageScore = totalQuizAttempts > 0 ? Math.round(totalScoreSum / totalQuizAttempts) : 0;

    const subjectsSet = new Set(attempts.map((a) => a.topic));
    const activeSubjectsCount = subjectsSet.size;

    // 2. Performance Distribution (mutually exclusive score buckets)
    const distribution = {
      "0-39%": 0,
      "40-59%": 0,
      "60-79%": 0,
      "80-100%": 0,
    };
    attempts.forEach((a) => {
      const p = a.percentage;
      if (p < 40) distribution["0-39%"]++;
      else if (p < 60) distribution["40-59%"]++;
      else if (p < 80) distribution["60-79%"]++;
      else distribution["80-100%"]++;
    });

    // 3. Subject-Wise Performance (Average % and attempt count)
    const subjectStats = {};
    attempts.forEach((a) => {
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

    // 4. Overall Student Performance Over Time (Aggregated Chronologically)
    const timelineMap = {};
    attempts
      .sort((a, b) => a.date - b.date)
      .forEach((a) => {
        const dateKey = a.date.toISOString().split("T")[0]; // YYYY-MM-DD
        if (!timelineMap[dateKey]) {
          timelineMap[dateKey] = { sum: 0, count: 0, completed: 0 };
        }
        timelineMap[dateKey].sum += a.percentage;
        timelineMap[dateKey].count++;
        if (a.isCompleted) timelineMap[dateKey].completed++;
      });

    const timelineLabels = Object.keys(timelineMap);
    const timelineScores = timelineLabels.map((d) => Math.round(timelineMap[d].sum / timelineMap[d].count));
    const timelineAttempts = timelineLabels.map((d) => timelineMap[d].count);
    const timelineCompleted = timelineLabels.map((d) => timelineMap[d].completed);

    // 5. Student Enrollment Statistics (from Student collection)
    const courseDistribution = {};
    const yearDistribution = {};
    enrolledStudents.forEach((st) => {
      courseDistribution[st.course] = (courseDistribution[st.course] || 0) + 1;
      yearDistribution[st.academicYear] = (yearDistribution[st.academicYear] || 0) + 1;
    });

    // If Student collection is empty, fallback to User educationLevel
    if (Object.keys(courseDistribution).length === 0) {
      users.forEach((u) => {
        const lvl = u.educationLevel || "Undergraduate";
        courseDistribution[lvl] = (courseDistribution[lvl] || 0) + 1;
      });
      yearDistribution["General"] = users.length;
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalRegisteredUsers: users.length,
        totalEnrolledStudents: enrolledStudents.length,
        totalQuizAttempts,
        totalCompletedQuizzes: totalCompleted,
        platformAverageScore,
        activeSubjectsCount,
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
    });
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
    const { studentIds, topic, q } = req.query;
    let filter = {};

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

    const users = await User.find(filter, "username email educationLevel quizzes testScores createdAt").lean();

    const comparisonList = users.map((u) => {
      let filteredQuizzes = u.quizzes || [];
      if (topic && topic !== "all") {
        filteredQuizzes = filteredQuizzes.filter((qz) => qz.topic?.toLowerCase() === topic.toLowerCase());
      }

      const scores = filteredQuizzes.map((qz) => {
        const total = qz.results?.length || 0;
        const correct = (qz.results || []).filter((r) => r.isCorrect).length;
        return total > 0 ? Math.round((correct / total) * 100) : 0;
      });

      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      const highest = scores.length > 0 ? Math.max(...scores) : 0;

      return {
        _id: u._id,
        username: u.username,
        email: u.email,
        educationLevel: u.educationLevel || "Undergraduate",
        totalQuizzes: scores.length,
        averageScore: avg,
        highestScore: highest,
        scores: scores,
      };
    });

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
    let query = {};
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
    const students = await User.find({}, "username email educationLevel").lean();
    return res.status(200).json(students);
  } catch (err) {
    console.error("All students fetch error:", err);
    return res.status(500).json([]);
  }
});

module.exports = router;
