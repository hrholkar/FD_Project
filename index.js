const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const  topicResources = require("./topicResources");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/profile.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const dburl = process.env.ATLAS_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/learnsmart";
const apiKey = process.env.api_Key || process.env.GEMINI_API_KEY; // Store your API key in .env

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login"); // Or wherever your login route is
}

// MongoDB Session Store
const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: process.env.SESSION_SECRET || "dciudcdh",
  },
  touchAfter: 24 * 3600,
});

store.on("error", (error) => {
  console.log("ERROR in Mongo SESSION STORE", error);
});

// Session configuration
const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || "hfwfgfuhfuwhfdh",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 1000 * 60 * 60,
    maxAge: 7 * 24 * 1000 * 60 * 60,
    httpOnly: true,
  },
};
app.use(session(sessionOptions));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Current User Middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// MongoDB Connection
async function main() {
  try {
    await mongoose.connect(dburl);
    console.log("Connection Successful");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
main();

// Google Generative AI Setup
const { GoogleGenerativeAI } = require("@google/generative-ai");
let genAI = null;
let model = null;
if (apiKey && apiKey !== "your_gemini_api_key_here") {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  } catch (err) {
    console.error("Error configuring Gemini AI:", err);
  }
}

// Generate AI Response
async function run(promptMsg) {
  try {
    if (!model) {
      console.warn("Gemini API key is not configured.");
      return "Gemini AI is not configured. Please set a valid api_Key in your .env file to enable AI generation.";
    }
    const prompt = promptMsg;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text(); // await here to correctly handle the Promise

    return text;
  } catch (e) {
    console.error("Error in AI Response:", e);
    return "An error occurred while processing your request.";
  }
}

// Routes
app.get("/", async (req, res) => {
  try {
    res.render("../views/home.ejs");
  } catch (e) {
    console.error("Error rendering chats:", e);
    res.redirect("/error"); // Redirect to a proper error page or handler
  }
});

app.get("/quiz", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect("/login");
    }

    // If user is admin → block
    if (req.user && req.user.isAdmin) {
      return res.render("quiz", { error: "admin" });
    }

    // Normal render (no error)
    res.render("quiz", { error: null });
  } catch (e) {
    console.error("Error rendering quiz page:", e);
    res.status(500).redirect("/error");
  }
});





app.post("/quizmaker", async (req, res) => {
  try {
    const { topic } = req.body;
    let educationLevel = req.user?.educationLevel;
    console.log(
      `User selected topic: ${topic}, education level: ${educationLevel}`
    );

    // Determine difficulty based on education level
    let difficulty = "";

switch (educationLevel) {
  case "Primary (Classes 1-5)":
    difficulty = "beginner";   // instead of basic
    break;

  case "Middle (Classes 6-8)":
    difficulty = "easy";       // instead of intermediate
    break;

  case "Secondary (Classes 9-10)":
    difficulty = "intermediate";
    break;

  case "Higher Secondary (Classes 11-12)":
    difficulty = "advanced";   // not "expert", fits better
    break;

  case "1st Year":
  case "2nd Year":
    difficulty = "college-basic";  // covers intro-level courses
    break;

  case "3rd Year":
  case "4th Year":
    difficulty = "college-advanced"; // higher-level, more depth
    break;

  default:
    difficulty = "general";
    break;
}


    console.log(`Assigned difficulty: ${difficulty}`);

    const prompt = `
      Create a 5-question multiple choice quiz on the topic "${topic}" 
      appropriate for ${educationLevel} (${difficulty} difficulty level).
      
      Requirements:
      - Questions should match the education level
      - Format as a valid JSON array
      - Include 4 options per question
      - Mark the correct answer
      
      Example format:
      [
        {
          "question": "Question text?",
          "options": ["option1", "option2", "option3", "option4"],
          "answer": "correct option",
          "explanation": "Brief explanation of the answer"
        },
        ...
      ]
      
      Important: Only output the JSON array, no additional text or markdown.
    `;

    let quizRaw = await run(prompt);

    // Clean and parse the response
    if (typeof quizRaw === "string") {
      quizRaw = quizRaw.trim();
      // Remove any code block markers
      quizRaw = quizRaw.replace(/```(json)?/g, "");
    }

    const quiz = JSON.parse(quizRaw);

    res.render("quizgive.ejs", {
      quiz,
      topic,
      educationLevel,
      difficulty,
    });
  } catch (e) {
    console.error("Error generating quiz:", e);
    res.status(500).redirect("/error");
  }
});

app.post("/submit-quiz", (req, res) => {
  try {
    const topic = req.body.topic;
    const userAnswers = Object.values(req.body).slice(0, -2); // Exclude hidden fields
    const correctAnswers = JSON.parse(req.body.answers);
    const questions = JSON.parse(req.body.questions);

    let score = 0;
    const results = [];

    for (let i = 0; i < correctAnswers.length; i++) {
      const isCorrect = userAnswers[i] === correctAnswers[i];
      if (isCorrect) score++;
      results.push({
        questionNumber: i + 1,
        question: questions[i],
        yourAnswer: userAnswers[i],
        correctAnswer: correctAnswers[i],
        isCorrect,
      });
    }
    console.log(results);

    res.render("quiz-result.ejs", {
      topic,
      score,
      total: correctAnswers.length,
      results,
    });
  } catch (err) {
    console.error("Error scoring quiz:", err);
    res.status(500).send("Something went wrong");
  }
});

app.post("/generate-resource", async (req, res) => {
  try {
    const topic = req.body.topic;
    const quizResults = typeof req.body.quizResults === "string"
      ? JSON.parse(req.body.quizResults)
      : req.body.quizResults;

    console.log("Generating resource for topic:", topic);

    const prompt = `You are an intelligent learning assistant. A student completed a quiz on the topic: **"${topic}"**.

Below is their performance data in JSON format:

${JSON.stringify(quizResults, null, 2)}

Your tasks:

1. Analyze the student's performance:
   - Show total number of questions.
   - Count correct vs incorrect answers.
   - Identify strengths (concepts with correct answers).
   - Identify weaknesses (concepts with incorrect answers).

2. Generate a personalized study plan with these clearly formatted sections:

---

✨ **Performance Summary** ✨  
- 📊 **Total Questions**: [number]  
- ✅ **Correct Answers**: [number] — highlight strongest concepts.  
- ❌ **Incorrect Answers**: [number] — list weakest areas.  
- 💡 **Key Observations**: 1–2 lines summarizing their performance.

---

🎯 **Common Mistakes and Weak Areas** 🎯  
Use emojis to classify types of issues:  
- 🔴 **Repeated Errors**: [Concept] – short explanation.  
- 🔄 **Needs More Practice**: [Concept] – explain why it’s tricky.  
- ⚠️ **Critical Gaps**: [Concept] – explain why it's essential to master.

---

📚 **Recommended Learning Resources** 📚  

📹 *Video Resources*:  
- ▶️ [**Title**](https://full-url.com) – Covers [concept] clearly.  
- ▶️ [**Title**](https://full-url.com) – Step-by-step explanation of [skill].

📄 *Articles / Blogs*:  
- 📖 [**Title**](https://full-url.com) – Explains [concept] with examples.  
- 📖 [**Title**](https://full-url.com) – Common mistakes and how to fix them.

---

🧠 **Practice Problems** 🧠  
Focus only on the student’s weak areas:  
- 🔹 **Problem 1**: [Clear equation or question]  
  *(e.g., Solve for x: 3x - 7 = 14)*  
- 🔹 **Problem 2**: [Another practice question]  
- 🔹 **System of Equations**:  
  ⎧ 2x + y = 5  
  ⎨ x - y = 1  
  ⎩ *(Solve for x and y)*

---

🚀 **Next Steps** 🚀  
- If score is **≥80%**:  
  - 🚀 Explore advanced topics like [Topic 1](https://url)  
  - 🚀 Try [Topic 2](https://url) with in-depth resources.

- If score is **<80%**:  
  - 🔄 Focus on [weak topic] with daily 10-minute reviews.  
  - ⏳ Use a spaced repetition routine (e.g., every 3 days).

---

📌 **Formatting Rules**:  
- Use full clickable URLs like \`[Text](https://...)\`.  
- Use **bold** for emphasis, *italics* for minor notes.  
- Put equations or math expressions on **new lines**.  
- Use markdown-style structure — this output will be converted into HTML or EJS for display.
`;

    let resource = await run(prompt);

    if (!resource || resource.trim() === "") {
      resource = "⚠️ Sorry, no resource could be generated. Please try again.";
    }

    if (req.user) {
      const user = await User.findById(req.user._id);

      // Save quiz
      user.quizzes.push({ topic, results: quizResults });

      // Save resource
      user.resources.push({ topic, content: resource });

      // Save test score
      const score = quizResults.filter((q) => q.isCorrect).length;
      if (!user.testScores) user.testScores = [];

      let topicScoreEntry = user.testScores.find((ts) => ts.topic === topic);
      if (topicScoreEntry) {
        topicScoreEntry.scores.push(score);
      } else {
        user.testScores.push({ topic, scores: [score] });
      }

      await user.save();
    }

    res.render("resource-page.ejs", { topic, resource });
  } catch (e) {
    console.error("Error generating resource:", e);
    res.status(500).redirect("/error");
  }
});


app.get("/dashboard", async (req, res) => {
  try {
    const user = req.user;

    res.render("dashboard", { user });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.redirect("/login");
  }
});
app.get("/progress", async (req, res) => {
  try {
    const user = req.user;
    const testScores = user.testScores;

    res.render("progress", { testScores, user });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.redirect("/login");
  }
});

app.get("/delete", (req, res) => {
  res.send("deleting ");
});

// User Routes
app.get("/user", (req, res) => {
  if (!req.user) {
    console.log("Please log in first");
    return res.redirect("/login");
  }

  // Pick only needed fields
  const { _id, email, username,educationLevel } = req.user;

  res.json({
    id: _id,
    email,
    username,
    educationLevel
  });
});

// Signup Render Route
app.get("/signup", (req, res) => {
  res.render("../views/users/signup.ejs");
});

// Login Render Route
app.get("/login", (req, res) => {
  res.render("../views/users/login.ejs");
});

// Signup Logic
app.post("/signup", async (req, res) => {
  try {
    let { username, email, password, educationLevel } = req.body;
    console.log(username, email, password, educationLevel);

    let user = await User.findOne({ username: username });
    let alreadyuser = await User.findOne({ email: email });

    if (!user && !alreadyuser) {
      const newUser = new User({ email, username, educationLevel });
      const registeredUser = await User.register(newUser, password);
      console.log("Registered User:", registeredUser);
      res.redirect("/login");
    } else if (alreadyuser) {
      res.send("Email already exists");
    } else {
      res.send("Username already exists");
    }
  } catch (e) {
    console.error("Error during signup:", e);
    res.redirect("/signup");
  }
});

// Login Logic
app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login?error=1" }),
  async (req, res) => {
    try {
      let { username } = req.body;
      let user = await User.findOne({ username: username });

      if (!user) {
        // Redirecting to the signup page if user doesn't exist
        console.log("error", "Please sign up first.");
        return res.redirect("/signup");
      }

      console.log("Logged In User:", user);

      // Check if admin
      if (user.isAdmin) {
        return res.redirect("/admin/scores");
      }

      // Normal user
      return res.redirect("/");
    } catch (error) {
      console.error("Error during login:", error);
      res.redirect("/login");
    }
  }
);


app.get("/dashboard", (req, res) => {
  res.send("Welcome back, Sameet! 🚀");
});

app.post("/notes", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.notes.push({
    title: req.body.title,
    content: req.body.content,
  });
  await user.save();
  res.redirect("/notes");
});

app.get("/notes", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.render("notes", { user });
});

app.get("/notes/edit/:index", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id);
  const note = user.notes[req.params.index];
  res.render("editNote", { note, index: req.params.index });
});

// Handle Edit
app.post("/notes/edit/:index", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id);
  const { title, content } = req.body;
  user.notes[req.params.index] = { title, content };
  await user.save();
  res.redirect("/notes");
});

// Handle Delete
app.post("/notes/delete/:index", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.notes.splice(req.params.index, 1);
  await user.save();
  res.redirect("/notes");
});

// TODO page - view list
app.get("/todo", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id);

  res.render("todos", { todos: user.todos });
});

// Add a todo: /todo/add?task=Read+book
app.get("/todo/add", isAuthenticated, async (req, res) => {
  const { task } = req.query;
  if (task) {
    await User.findByIdAndUpdate(req.user._id, {
      $push: { todos: { task } },
    });
  }
  res.redirect("/todo");
});

// Complete a todo: /todo/complete?index=0
app.get("/todo/complete", isAuthenticated, async (req, res) => {
  const { index } = req.query;
  const user = await User.findById(req.user._id);
  if (user.todos[index]) {
    user.todos[index].completed = true;
    await user.save();
  }
  res.redirect("/todo");
});

// Delete a todo: /todo/delete?index=0
app.get("/todo/delete", isAuthenticated, async (req, res) => {
  const { index } = req.query;
  const user = await User.findById(req.user._id);
  if (user.todos[index]) {
    user.todos.splice(index, 1);
    await user.save();
  }
  res.redirect("/todo");
});




//admin panel code 
// // Admin Dashboard: View all scores
// app.get("/admin/scores", async (req, res) => {
//   try {
//     const { topic, student } = req.query;

//     let query = {};
//     if (topic) query["testScores.topic"] = topic;
//     if (student) query["username"] = student;

//     // Get all users with scores
//     const users = await User.find(query, "username testScores educationLevel");

//     // Flatten for easier display
//     const scores = [];
//     users.forEach(user => {
//       user.testScores.forEach(ts => {
//         if (!topic || ts.topic === topic) {
//           scores.push({
//             username: user.username,
//             educationLevel: user.educationLevel,
//             topic: ts.topic,
//             scores: ts.scores,   // array of scores
//             avgScore: (
//               ts.scores.reduce((a, b) => a + b, 0) / ts.scores.length
//             ).toFixed(2),
//           });
//         }
//       });
//     });

//     res.render("admin-scores", { scores, topic, student });
//   } catch (err) {
//     console.error("Error fetching scores:", err);
//     res.status(500).send("Error fetching scores");
//   }
// });




//gemini logic 
app.get("/admin/scores", async (req, res) => {
  try {
    // Fetch necessary fields from all users
    const allUsers = await User.find({}, 'username educationLevel testScores');

    // 1. Flatten the data into a more usable format for the frontend
    let scores = [];
    allUsers.forEach(user => {
      user.testScores.forEach(test => {
        // Calculate the average score for the topic
        const avgScore = test.scores.length > 0 ?
          (test.scores.reduce((a, b) => a + b, 0) / test.scores.length * 10).toFixed(2) : // Assuming scores are out of 10
          0;

        scores.push({
          username: user.username,
          educationLevel: user.educationLevel,
          topic: test.topic,
          scores: test.scores, // This is the array of individual scores
          avgScore: avgScore   // This is the calculated average percentage
        });
      });
    });
    
    // 2. Handle filtering based on query parameters from the form
    const { topic: topicFilter, student: studentFilter } = req.query;
    if (topicFilter) {
      scores = scores.filter(s => s.topic === topicFilter);
    }
    if (studentFilter) {
      scores = scores.filter(s => s.username === studentFilter);
    }

    // 3. Get unique topics and students for filter dropdowns
    // These are derived from all users so the dropdowns always have all options
    const uniqueTopics = [...new Set(allUsers.flatMap(u => u.testScores.map(t => t.topic)))];
    const uniqueStudents = allUsers.map(u => u.username);

    // 4. Render the admin panel view with all the necessary data
    res.render("admin/scores", {
      scores,
      uniqueTopics,
      uniqueStudents,
      topic: topicFilter || '',      // Pass current filter selection to the view
      student: studentFilter || '' // to set the selected option in the dropdown
    });

  } catch (err) {
    console.error("Error fetching data for admin panel:", err);
    res.status(500).send("Server Error while fetching admin data.");
  }
});







// Logout Logic
app.get("/logout", (req, res, next) => {
  req.logout(function (error) {
    if (error) {
      return next(error);
    }

    res.redirect("/login");
  });
});

// ==========================================
// HEALTH CHECK ENDPOINT (Practical 07)
// ==========================================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting/disconnected",
    service: "LearnSmart AI Learning Platform",
  });
});

// ==========================================
// STUDENT CRUD REST APIs (Practical 05)
// ==========================================
const studentRoutes = require("./routes/students");
app.use("/api/students", studentRoutes);

// ==========================================
// INTEGRATED LEARNSMART FEATURE ROUTES
// ==========================================

// 1. Student Management System (React 18 + Redux Toolkit)
const reactDistPath = path.join(__dirname, "practicals", "react-student-management", "dist");
app.use("/students", express.static(reactDistPath));
app.get("/students*", (req, res) => {
  res.sendFile(path.join(reactDistPath, "index.html"));
});
app.use("/practical/student-management", express.static(reactDistPath));
app.get("/practical/student-management*", (req, res) => {
  res.sendFile(path.join(reactDistPath, "index.html"));
});

// 2. Learning & Academic Analytics Dashboard (Bootstrap 4)
app.get(["/analytics", "/practical/bootstrap-dashboard"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "practical", "bootstrap-dashboard", "index.html"));
});

// 3. Curriculum & Course Catalog (Express Static Site)
app.get(["/courses", "/practical/static-site"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "practical", "static-site", "index.html"));
});

// 4. Mobile Learning Experience (jQuery Mobile)
app.get(["/mobile", "/practical/mobile"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "practical", "mobile", "index.html"));
});

// ==========================================
// Server Start
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


