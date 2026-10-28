/**
 * LearnSmart Student & Individual Learner Analytics Service
 * Reusable, authoritative calculation engine for student and admin learner diagnostics.
 */

/**
 * Computes comprehensive student analytics from a User document.
 * @param {Object} user - The mongoose User document or lean object.
 * @returns {Object} Structured analytics payload.
 */
function computeStudentAnalytics(user) {
  if (!user) return null;
  const rawQuizzes = Array.isArray(user.quizzes) ? user.quizzes : [];

  // Sort quizzes chronologically (oldest to newest) for performance progression
  const quizzes = [...rawQuizzes].sort(
    (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
  );

  let totalQuestionsCount = 0;
  let totalCorrectCount = 0;

  const performanceOverTime = quizzes.map((q, idx) => {
    const results = Array.isArray(q.results) ? q.results : [];
    const derivedCorrect = results.filter((r) => r.isCorrect).length;
    const score = typeof q.score === "number" ? q.score : derivedCorrect;
    const totalQuestions =
      typeof q.totalQuestions === "number" && q.totalQuestions > 0
        ? q.totalQuestions
        : results.length > 0
        ? results.length
        : 5;
    const percentage =
      typeof q.percentage === "number"
        ? q.percentage
        : totalQuestions > 0
        ? Math.round((score / totalQuestions) * 100)
        : 0;

    totalQuestionsCount += totalQuestions;
    totalCorrectCount += score;

    return {
      attemptId: q.attemptId || String(idx),
      attemptNumber: idx + 1,
      topic: (q.topic || "General").trim(),
      difficulty: q.difficulty || "general",
      date: q.date ? new Date(q.date) : new Date(),
      score,
      totalQuestions,
      percentage,
      results: results.map((r, rIdx) => ({
        questionNumber: r.questionNumber || rIdx + 1,
        question: r.question || "",
        yourAnswer: r.yourAnswer || r.userAnswer || "Unanswered",
        correctAnswer: r.correctAnswer || "",
        isCorrect: !!r.isCorrect,
        explanation: r.explanation || "",
      })),
    };
  });

  const totalQuizzes = performanceOverTime.length;
  const averageScore =
    totalQuizzes > 0
      ? Math.round(
          performanceOverTime.reduce((acc, p) => acc + p.percentage, 0) /
            totalQuizzes
        )
      : 0;
  const overallAccuracy =
    totalQuestionsCount > 0
      ? Math.round((totalCorrectCount / totalQuestionsCount) * 100)
      : 0;
  const highestScore =
    totalQuizzes > 0
      ? Math.max(...performanceOverTime.map((p) => p.percentage))
      : 0;
  const latestQuiz =
    totalQuizzes > 0 ? performanceOverTime[totalQuizzes - 1] : null;

  // Real consecutive day streak calculation
  let streak = 0;
  if (totalQuizzes > 0) {
    const uniqueDays = [
      ...new Set(
        performanceOverTime.map((p) =>
          new Date(p.date).toISOString().slice(0, 10)
        )
      ),
    ]
      .sort()
      .reverse();

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);

    if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
      let currentDay = new Date(uniqueDays[0]);
      for (const dayStr of uniqueDays) {
        const expected = currentDay.toISOString().slice(0, 10);
        if (dayStr === expected) {
          streak++;
          currentDay = new Date(currentDay.getTime() - 86400000);
        } else {
          break;
        }
      }
    }
  }

  // Subject / Topic groupings
  const subjectMap = {};
  performanceOverTime.forEach((p) => {
    const t = p.topic;
    const key = t.toLowerCase();
    if (!subjectMap[key]) {
      subjectMap[key] = {
        subject: t,
        attempts: 0,
        totalPercentage: 0,
        highestScore: 0,
        scores: [],
        latestDate: p.date,
        latestScore: p.percentage,
      };
    }
    const entry = subjectMap[key];
    entry.attempts++;
    entry.totalPercentage += p.percentage;
    entry.scores.push(p.percentage);
    if (p.percentage > entry.highestScore) entry.highestScore = p.percentage;
    entry.latestDate = p.date;
    entry.latestScore = p.percentage;
  });

  const subjects = Object.values(subjectMap).map((s) => {
    const avg = Math.round(s.totalPercentage / s.attempts);
    const isWeakTopic = s.attempts >= 2 && avg < 65;
    const hasLimitedHistory = s.attempts < 2;
    const isStrongTopic = s.attempts >= 2 && avg >= 80;
    return {
      subject: s.subject,
      attempts: s.attempts,
      averageScore: avg,
      highestScore: s.highestScore,
      latestScore: s.latestScore,
      scores: s.scores,
      isWeakTopic,
      hasLimitedHistory,
      isStrongTopic,
    };
  });

  const weakTopics = subjects.filter((s) => s.isWeakTopic);

  // Recent activity stream combining quizzes and user notes/todos
  const activities = [];
  performanceOverTime.forEach((p) => {
    activities.push({
      type: "quiz",
      title: "Completed quiz on " + p.topic,
      subtitle:
        "Score: " + p.score + "/" + p.totalQuestions + " (" + p.percentage + "%)",
      date: p.date,
      icon: "fa-check",
      iconColor: p.percentage >= 70 ? "var(--ls-green)" : "var(--ls-coral)",
      iconBg:
        p.percentage >= 70 ? "var(--ls-green-light)" : "var(--ls-coral-light)",
    });
  });

  if (Array.isArray(user.notes)) {
    user.notes.forEach((n) => {
      activities.push({
        type: "note",
        title: "Added a study note" + (n.title ? ": " + n.title : ""),
        subtitle:
          n.content && n.content.length > 50
            ? n.content.slice(0, 50) + "..."
            : n.content || "Personal study note",
        date: n.createdAt ? new Date(n.createdAt) : new Date(),
        icon: "fa-file-lines",
        iconColor: "var(--ls-purple)",
        iconBg: "var(--ls-purple-light)",
      });
    });
  }

  if (Array.isArray(user.todos)) {
    user.todos.forEach((t) => {
      activities.push({
        type: "todo",
        title:
          (t.completed ? "Completed" : "Added") +
          " task: " +
          (t.task || "Task"),
        subtitle: t.completed ? "Marked as done" : "Active to-do",
        date: t.createdAt ? new Date(t.createdAt) : new Date(),
        icon: t.completed ? "fa-circle-check" : "fa-list-check",
        iconColor: "var(--ls-orange)",
        iconBg: "var(--ls-orange-light)",
      });
    });
  }

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Activity distribution for timeline
  const activityMap = {};
  performanceOverTime.forEach((q) => {
    const d = new Date(q.date).toISOString().slice(0, 10);
    activityMap[d] = (activityMap[d] || 0) + 1;
  });

  // Calculate 7-day quiz counts (past 7 days ending today)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    last7Days.push({
      date: key,
      day: label,
      count: activityMap[key] || 0,
    });
  }

  return {
    summary: {
      completedQuizzes: totalQuizzes,
      averageScore,
      overallAccuracy,
      highestScore,
      latestScore: latestQuiz ? latestQuiz.percentage : 0,
      latestTopic: latestQuiz ? latestQuiz.topic : null,
      latestDate: latestQuiz ? latestQuiz.date : null,
      attemptedSubjectsCount: subjects.length,
      streak,
    },
    performanceOverTime,
    subjects,
    weakTopics,
    recentActivities: activities.slice(0, 10),
    activity: Object.keys(activityMap)
      .sort()
      .map((d) => ({ date: d, count: activityMap[d] })),
    last7Days,
  };
}

/**
 * Computes a recent-vs-earlier performance comparison for a student.
 * Splits attempts chronologically into earlier half and recent half when >= 4 attempts exist.
 * @param {Array} rawQuizzes - The student's quiz attempts.
 * @returns {Object} Comparison metrics and explanation.
 */
function computeLearnerRecentVsEarlier(rawQuizzes) {
  const quizzes = Array.isArray(rawQuizzes)
    ? [...rawQuizzes].sort(
        (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
      )
    : [];

  const validAttempts = quizzes
    .map((q) => {
      const results = Array.isArray(q.results) ? q.results : [];
      const correct =
        typeof q.score === "number"
          ? q.score
          : results.filter((r) => r.isCorrect).length;
      const total =
        typeof q.totalQuestions === "number" && q.totalQuestions > 0
          ? q.totalQuestions
          : results.length > 0
          ? results.length
          : 5;
      const pct =
        typeof q.percentage === "number"
          ? q.percentage
          : total > 0
          ? Math.round((correct / total) * 100)
          : null;
      return {
        date: q.date ? new Date(q.date) : null,
        percentage: pct,
        topic: q.topic || "General",
      };
    })
    .filter((a) => a.percentage !== null && !isNaN(a.percentage));

  if (validAttempts.length < 4) {
    return {
      hasEnoughData: false,
      message:
        "Insufficient assessment history. At least 4 completed quizzes are required to perform a meaningful earlier-vs-recent trajectory comparison.",
      attemptCount: validAttempts.length,
      requiredCount: 4,
    };
  }

  const halfIndex = Math.floor(validAttempts.length / 2);
  const earlierSlice = validAttempts.slice(0, halfIndex);
  const recentSlice = validAttempts.slice(halfIndex);

  const earlierAvg = Math.round(
    earlierSlice.reduce((acc, a) => acc + a.percentage, 0) / earlierSlice.length
  );
  const recentAvg = Math.round(
    recentSlice.reduce((acc, a) => acc + a.percentage, 0) / recentSlice.length
  );
  const netDelta = recentAvg - earlierAvg;

  const earlierStart = earlierSlice[0].date
    ? earlierSlice[0].date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Initial";
  const earlierEnd = earlierSlice[earlierSlice.length - 1].date
    ? earlierSlice[earlierSlice.length - 1].date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Midpoint";

  const recentStart = recentSlice[0].date
    ? recentSlice[0].date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Midpoint";
  const recentEnd = recentSlice[recentSlice.length - 1].date
    ? recentSlice[recentSlice.length - 1].date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Latest";

  return {
    hasEnoughData: true,
    earlierAttemptsCount: earlierSlice.length,
    recentAttemptsCount: recentSlice.length,
    earlierAverage: earlierAvg,
    recentAverage: recentAvg,
    netDelta,
    isImproving: netDelta > 0,
    isDeclining: netDelta < 0,
    earlierPeriod: `${earlierStart} – ${earlierEnd}`,
    recentPeriod: `${recentStart} – ${recentEnd}`,
    explanation:
      netDelta > 0
        ? `Performance improved by +${netDelta}% between initial assessments (${earlierAvg}%) and recent assessments (${recentAvg}%).`
        : netDelta < 0
        ? `Performance dropped by ${netDelta}% from earlier assessments (${earlierAvg}%) to recent assessments (${recentAvg}%).`
        : `Performance remained stable at ${recentAvg}% between earlier and recent assessments.`,
  };
}

/**
 * Computes mutually exclusive score distribution buckets for a student's quizzes.
 * Buckets: 0–39%, 40–59%, 60–79%, 80–100%.
 * @param {Array} rawQuizzes - The student's quiz attempts.
 * @returns {Object} Count and percentage per bucket.
 */
function computeLearnerScoreDistribution(rawQuizzes) {
  const distribution = {
    "0-39%": 0,
    "40-59%": 0,
    "60-79%": 0,
    "80-100%": 0,
  };

  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];
  let totalValid = 0;

  quizzes.forEach((q) => {
    const results = Array.isArray(q.results) ? q.results : [];
    const correct =
      typeof q.score === "number"
        ? q.score
        : results.filter((r) => r.isCorrect).length;
    const total =
      typeof q.totalQuestions === "number" && q.totalQuestions > 0
        ? q.totalQuestions
        : results.length > 0
        ? results.length
        : 5;
    const pct =
      typeof q.percentage === "number"
        ? q.percentage
        : total > 0
        ? Math.round((correct / total) * 100)
        : null;

    if (pct !== null && !isNaN(pct)) {
      totalValid++;
      if (pct < 40) distribution["0-39%"]++;
      else if (pct < 60) distribution["40-59%"]++;
      else if (pct < 80) distribution["60-79%"]++;
      else distribution["80-100%"]++;
    }
  });

  return {
    buckets: distribution,
    totalValidAttempts: totalValid,
    percentages: {
      "0-39%":
        totalValid > 0
          ? Math.round((distribution["0-39%"] / totalValid) * 100)
          : 0,
      "40-59%":
        totalValid > 0
          ? Math.round((distribution["40-59%"] / totalValid) * 100)
          : 0,
      "60-79%":
        totalValid > 0
          ? Math.round((distribution["60-79%"] / totalValid) * 100)
          : 0,
      "80-100%":
        totalValid > 0
          ? Math.round((distribution["80-100%"] / totalValid) * 100)
          : 0,
    },
  };
}

/**
 * Generates rule-based learning recommendations based on validated performance.
 * @param {Object} analytics - The computed student analytics.
 * @returns {Array} List of recommendation objects.
 */
function computeLearningRecommendations(analytics) {
  if (!analytics) return [];
  const recommendations = [];

  // 1. Weak topics (>= 2 attempts, avg < 65%)
  (analytics.weakTopics || []).forEach((wt) => {
    recommendations.push({
      type: "needs_focus",
      level: "critical",
      topic: wt.subject,
      title: `Intensive Revision: ${wt.subject}`,
      averageScore: wt.averageScore,
      attempts: wt.attempts,
      basis: `The student completed ${wt.attempts} attempts in "${wt.subject}" with an average score of ${wt.averageScore}%, which falls below the 65% institutional mastery threshold.`,
      action: "Assign targeted diagnostic quizzes and generate an AI study roadmap.",
      actionUrl: `/quiz`,
    });
  });

  // 2. Topics with limited history (< 2 attempts)
  (analytics.subjects || [])
    .filter((s) => s.hasLimitedHistory)
    .forEach((lt) => {
      recommendations.push({
        type: "limited_history",
        level: "info",
        topic: lt.subject,
        title: `Verification Assessment: ${lt.subject}`,
        averageScore: lt.averageScore,
        attempts: lt.attempts,
        basis: `Only ${lt.attempts} attempt recorded for "${lt.subject}" (${lt.averageScore}%). At least 2 attempts are required to establish an accurate mastery pattern.`,
        action: "Encourage a second assessment to confirm learning consistency.",
        actionUrl: `/quiz`,
      });
    });

  // 3. Strong topics (>= 2 attempts, avg >= 80%)
  (analytics.subjects || [])
    .filter((s) => s.isStrongTopic)
    .forEach((st) => {
      recommendations.push({
        type: "mastery",
        level: "success",
        topic: st.subject,
        title: `Core Strength: ${st.subject}`,
        averageScore: st.averageScore,
        attempts: st.attempts,
        basis: `Strong sustained proficiency across ${st.attempts} attempts with a verified average of ${st.averageScore}%.`,
        action: "Recommend advanced interview preparation or higher-tier topics.",
        actionUrl: `/interview`,
      });
    });

  // 4. Default if 0 quizzes
  if (recommendations.length === 0) {
    if (analytics.summary && analytics.summary.completedQuizzes === 0) {
      recommendations.push({
        type: "no_data",
        level: "neutral",
        topic: "General",
        title: "Initial Diagnostic Needed",
        basis: "The student has not yet completed any practice assessments on the platform.",
        action: "Direct learner to start their first baseline practice quiz.",
        actionUrl: `/quiz`,
      });
    } else {
      recommendations.push({
        type: "on_track",
        level: "success",
        topic: "General",
        title: "Solid Foundations Overall",
        basis: "All attempted subjects are performing above the 65% revision threshold.",
        action: "Maintain consistent learning habit and expand subject coverage.",
        actionUrl: `/quiz`,
      });
    }
  }

  return recommendations;
}

module.exports = {
  computeStudentAnalytics,
  computeLearnerRecentVsEarlier,
  computeLearnerScoreDistribution,
  computeLearningRecommendations,
};

