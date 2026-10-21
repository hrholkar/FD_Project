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
const rawApiKey = process.env.api_Key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.API_KEY || "";
const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim().replace(/^["']|["']$/g, "") : "";

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
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (err) {
    console.error("Error configuring Gemini AI:", err);
  }
}

// Generate AI Response with fallback
async function run(promptMsg) {
  try {
    if (!genAI && apiKey && apiKey !== "your_gemini_api_key_here") {
      try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      } catch (e) {
        console.error("Failed to initialize genAI:", e);
      }
    }
    if (!model) {
      console.warn("Gemini API key is not configured.");
      return null;
    }
    const result = await model.generateContent(promptMsg);
    const response = await result.response;
    return response.text();
  } catch (e) {
    console.error("Error in primary Gemini model:", e.message);
    try {
      if (genAI) {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await fallbackModel.generateContent(promptMsg);
        const response = await result.response;
        return response.text();
      }
    } catch (fallbackErr) {
      console.error("Fallback Gemini error:", fallbackErr.message);
    }
    return null;
  }
}

// Safe JSON array extractor from LLM text responses
function extractJsonArray(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  let clean = rawText.trim();
  clean = clean.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  try {
    const direct = JSON.parse(clean);
    if (Array.isArray(direct) && direct.length > 0) return direct;
  } catch (_) {}

  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(clean.substring(start, end + 1));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn("Failed substring JSON parse:", e.message);
    }
  }
  return null;
}

// Educational curriculum quiz fallback for guaranteed 100% quiz generation
function generateFallbackQuiz(topic, educationLevel, difficulty) {
  const normTopic = (topic || "General").trim().toLowerCase();

  if (normTopic.includes("c++") || normTopic.includes("cpp")) {
    return [
      {
        question: "What is the primary programming paradigm introduced by C++ on top of C?",
        options: ["Object-Oriented Programming (OOP)", "Purely Functional Programming", "Logic Programming only", "Assembly Machine Mapping"],
        answer: "Object-Oriented Programming (OOP)",
        explanation: "C++ was designed by Bjarne Stroustrup as 'C with Classes', extending C with OOP principles like classes, inheritance, and encapsulation."
      },
      {
        question: "Which header file is required for standard input and output streams (std::cout, std::cin) in C++?",
        options: ["<iostream>", "<stdio.h>", "<conio.h>", "<fstream>"],
        answer: "<iostream>",
        explanation: "<iostream> defines standard stream objects like cout, cin, and cerr."
      },
      {
        question: "Which operator is used to allocate memory dynamically on the heap in modern C++?",
        options: ["new", "malloc", "alloc", "create"],
        answer: "new",
        explanation: "The 'new' operator allocates heap memory and calls the object constructor, while 'delete' frees it."
      },
      {
        question: "What is the primary role of a class destructor (~ClassName()) in C++?",
        options: ["To release allocated resources and perform cleanup before object destruction", "To initialize class member variables", "To duplicate an existing object instance", "To allocate memory for static members"],
        answer: "To release allocated resources and perform cleanup before object destruction",
        explanation: "Destructors are invoked automatically when an object goes out of scope to release heap memory, file handles, or network sockets."
      },
      {
        question: "Which keyword is used in C++ to enable runtime (dynamic) polymorphism?",
        options: ["virtual", "inline", "static", "friend"],
        answer: "virtual",
        explanation: "Declaring a base class member function as 'virtual' enables dynamic binding and method overriding in derived classes."
      }
    ];
  }

  if (normTopic.includes("python")) {
    return [
      {
        question: "Which of the following data structures is immutable in Python?",
        options: ["Tuple", "List", "Dictionary", "Set"],
        answer: "Tuple",
        explanation: "Tuples cannot be modified after creation, making them immutable."
      },
      {
        question: "Which keyword is used to define a function in Python?",
        options: ["def", "function", "func", "define"],
        answer: "def",
        explanation: "'def' introduces a function definition in Python syntax."
      },
      {
        question: "What is the output of `type([1, 2, 3])` in Python?",
        options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'set'>"],
        answer: "<class 'list'>",
        explanation: "Square brackets denote list instances in Python."
      },
      {
        question: "Which built-in function returns the number of elements in a container in Python?",
        options: ["len()", "size()", "count()", "length()"],
        answer: "len()",
        explanation: "len() computes the length of strings, lists, tuples, and dictionaries."
      },
      {
        question: "How are runtime exceptions handled in Python?",
        options: ["try / except blocks", "try / catch blocks", "do / rescue blocks", "attempt / error blocks"],
        answer: "try / except blocks",
        explanation: "Python uses 'try' followed by one or more 'except' blocks for exception handling."
      }
    ];
  }

  if (normTopic.includes("java")) {
    return [
      {
        question: "What is the signature of the entry point method in a standard Java application?",
        options: ["public static void main(String[] args)", "public void main(String[] args)", "static void start(String[] args)", "void main()"],
        answer: "public static void main(String[] args)",
        explanation: "JVM requires 'public static void main(String[] args)' as the execution entry point."
      },
      {
        question: "Which keyword is used to inherit a class in Java?",
        options: ["extends", "implements", "inherits", "super"],
        answer: "extends",
        explanation: "'extends' is used for class inheritance, while 'implements' is used for interface realization."
      },
      {
        question: "Which memory region in the JVM holds object instances and member variables?",
        options: ["Heap Memory", "Stack Memory", "PC Register", "Native Method Stack"],
        answer: "Heap Memory",
        explanation: "All object instances are allocated on the Java Heap and managed by the Garbage Collector."
      },
      {
        question: "What is the difference between `==` and `.equals()` when comparing Java objects?",
        options: ["`==` compares memory references, while `.equals()` compares logical values", "They perform identical comparisons", "`.equals()` is only for numbers", "`==` is only for strings"],
        answer: "`==` compares memory references, while `.equals()` compares logical values",
        explanation: "`==` checks reference equality (memory location), whereas `.equals()` evaluates content value equivalence."
      },
      {
        question: "Which interface must be implemented to define a task runnable by a Java Thread?",
        options: ["Runnable", "Executable", "Callable", "Threadable"],
        answer: "Runnable",
        explanation: "java.lang.Runnable defines the single `run()` method required for thread execution."
      }
    ];
  }

  if (normTopic.includes("math") || normTopic.includes("algebra") || normTopic.includes("calculus")) {
    return [
      {
        question: "What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?",
        options: ["6x + 5", "3x + 5", "6x - 7", "6x^2 + 5"],
        answer: "6x + 5",
        explanation: "Using the power rule d/dx[x^n] = n*x^(n-1), d/dx[3x^2] = 6x and d/dx[5x] = 5."
      },
      {
        question: "If 4x - 8 = 16, what is the value of x?",
        options: ["6", "4", "8", "2"],
        answer: "6",
        explanation: "4x = 24 => x = 6."
      },
      {
        question: "What is the indefinite integral of 1/x dx (for x > 0)?",
        options: ["ln(x) + C", "1/x^2 + C", "e^x + C", "-1/x + C"],
        answer: "ln(x) + C",
        explanation: "The antiderivative of 1/x is the natural logarithm ln|x| + C."
      },
      {
        question: "What is the derivative of sin(x)?",
        options: ["cos(x)", "-cos(x)", "tan(x)", "-sin(x)"],
        answer: "cos(x)",
        explanation: "d/dx[sin(x)] = cos(x)."
      },
      {
        question: "What is a matrix with a determinant equal to 0 called?",
        options: ["Singular matrix", "Identity matrix", "Orthogonal matrix", "Symmetric matrix"],
        answer: "Singular matrix",
        explanation: "A square matrix with determinant 0 is singular and cannot be inverted."
      }
    ];
  }

  // Universal topic questions tailored to the requested topic
  const capTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  return [
    {
      question: `What is the foundational concept or purpose of ${capTopic}?`,
      options: [
        `Core principles and methods governing ${capTopic}`,
        `A deprecated legacy standard`,
        `An isolated mathematical anomaly`,
        `A proprietary single-vendor protocol`
      ],
      answer: `Core principles and methods governing ${capTopic}`,
      explanation: `${capTopic} provides foundational methodologies and practical principles in its field.`
    },
    {
      question: `Which approach represents the industry best practice when working with ${capTopic}?`,
      options: [
        `Modular design, standard conventions, and rigorous testing`,
        `Avoiding documentation and error logging`,
        `Hardcoding configurations into binary files`,
        `Ignoring edge cases and validation rules`
      ],
      answer: `Modular design, standard conventions, and rigorous testing`,
      explanation: `Consistent best practices in ${capTopic} require modularity, systematic testing, and clean architecture.`
    },
    {
      question: `In modern technical workflows, how is ${capTopic} most commonly evaluated?`,
      options: [
        `Through measurable performance metrics and structured problem-solving`,
        `By random guessing without benchmarks`,
        `Through arbitrary static rules`,
        `By eliminating all abstraction layers`
      ],
      answer: `Through measurable performance metrics and structured problem-solving`,
      explanation: `Structured evaluation ensures optimal implementation of ${capTopic}.`
    },
    {
      question: `What is a common pitfall or challenge encountered when learning ${capTopic}?`,
      options: [
        `Overlooking fundamental prerequisites and error-handling mechanisms`,
        `Writing too much automated test coverage`,
        `Following established design patterns`,
        `Using standard documentation`
      ],
      answer: `Overlooking fundamental prerequisites and error-handling mechanisms`,
      explanation: `Mastering prerequisites and error management prevents frequent design pitfalls in ${capTopic}.`
    },
    {
      question: `How does mastering ${capTopic} benefit advanced engineering and problem-solving?`,
      options: [
        `It strengthens analytical reasoning, architectural comprehension, and practical execution`,
        `It has no relevance to real-world applications`,
        `It replaces the need for any other foundational knowledge`,
        `It only applies to historical theoretical scenarios`
      ],
      answer: `It strengthens analytical reasoning, architectural comprehension, and practical execution`,
      explanation: `Deep understanding of ${capTopic} builds core competence and enhances technical execution.`
    }
  ];
}

// Routes
app.get("/", async (req, res) => {
  try {
    res.render("home.ejs");
  } catch (e) {
    console.error("Error rendering home:", e);
    res.redirect("/error?msg=" + encodeURIComponent("Error loading home page."));
  }
});

// Dedicated Error Page Route
app.get("/error", (req, res) => {
  res.render("error.ejs", {
    title: "Learning Engine Notice",
    message: req.query.msg || "An unexpected error occurred while processing your request. Please try again or return to the dashboard.",
  });
});

app.get("/quiz", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect("/login");
    }

    if (req.user && req.user.isAdmin) {
      return res.render("quiz", { error: "admin" });
    }

    res.render("quiz", { error: null });
  } catch (e) {
    console.error("Error rendering quiz page:", e);
    res.redirect("/error?msg=" + encodeURIComponent("Error loading quiz portal."));
  }
});

app.post("/quizmaker", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect("/login");
    }

    const topic = (req.body.topic || "General Knowledge").trim();
    let educationLevel = req.user?.educationLevel || "Higher Secondary (Classes 11-12)";

    let difficulty = "general";
    switch (educationLevel) {
      case "Primary (Classes 1-5)":
        difficulty = "beginner";
        break;
      case "Middle (Classes 6-8)":
        difficulty = "easy";
        break;
      case "Secondary (Classes 9-10)":
        difficulty = "intermediate";
        break;
      case "Higher Secondary (Classes 11-12)":
        difficulty = "advanced";
        break;
      case "1st Year":
      case "2nd Year":
        difficulty = "college-basic";
        break;
      case "3rd Year":
      case "4th Year":
        difficulty = "college-advanced";
        break;
      default:
        difficulty = "intermediate";
        break;
    }

    let quiz = null;

    // 1. Attempt AI Generation with Gemini
    try {
      const prompt = `Create a 5-question multiple choice quiz on the topic "${topic}" appropriate for ${educationLevel} (${difficulty} difficulty level).
Requirements:
- Format strictly as a valid JSON array only
- Include 4 options per question
- Specify the exact correct answer (must match one option)
- Provide brief explanation
Example:
[
  {
    "question": "Question text?",
    "options": ["opt1", "opt2", "opt3", "opt4"],
    "answer": "opt1",
    "explanation": "Explanation"
  }
]
Output ONLY raw JSON array. No markdown, no conversational text.`;

      const aiRaw = await run(prompt);
      if (aiRaw) {
        quiz = extractJsonArray(aiRaw);
      }
    } catch (aiErr) {
      console.warn("AI generation exception:", aiErr.message);
    }

    // 2. Guaranteed curriculum fallback if AI is unconfigured or failed
    if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
      console.log(`Using curriculum fallback quiz for "${topic}"`);
      quiz = generateFallbackQuiz(topic, educationLevel, difficulty);
    }

    res.render("quizgive.ejs", {
      quiz,
      topic,
      educationLevel,
      difficulty,
    });
  } catch (e) {
    console.error("Error in /quizmaker:", e);
    res.render("error.ejs", {
      title: "Quiz Generation Notice",
      message: "An issue occurred while generating the quiz. Please return to the quiz page and try again.",
    });
  }
});

app.post("/submit-quiz", (req, res) => {
  try {
    const topic = (req.body.topic || "General").trim();
    let correctAnswers = [];
    let questions = [];

    try {
      correctAnswers = typeof req.body.answers === "string" ? JSON.parse(req.body.answers) : (req.body.answers || []);
    } catch (_) { correctAnswers = []; }

    try {
      questions = typeof req.body.questions === "string" ? JSON.parse(req.body.questions) : (req.body.questions || []);
    } catch (_) { questions = []; }

    let score = 0;
    const results = [];

    for (let i = 0; i < correctAnswers.length; i++) {
      const userAnswer = req.body[`q${i}`] || "";
      const isCorrect = userAnswer === correctAnswers[i];
      if (isCorrect) score++;
      results.push({
        questionNumber: i + 1,
        question: questions[i] || `Question ${i + 1}`,
        yourAnswer: userAnswer,
        correctAnswer: correctAnswers[i],
        isCorrect,
      });
    }

    res.render("quiz-result.ejs", {
      topic,
      score,
      total: correctAnswers.length,
      results,
    });
  } catch (err) {
    console.error("Error scoring quiz:", err);
    res.render("error.ejs", {
      title: "Quiz Evaluation Notice",
      message: "An issue occurred while evaluating your answers. Please try again.",
    });
  }
});

app.post("/generate-resource", async (req, res) => {
  try {
    const topic = (req.body.topic || "General").trim();
    let quizResults = [];
    try {
      quizResults = typeof req.body.quizResults === "string"
        ? JSON.parse(req.body.quizResults)
        : (req.body.quizResults || []);
    } catch (_) {
      quizResults = [];
    }

    const score = quizResults.filter((q) => q.isCorrect).length;
    const total = quizResults.length || 5;

    let resource = null;

    try {
      const prompt = `You are an intelligent learning assistant. A student completed a quiz on the topic: **"${topic}"**.
Performance: ${JSON.stringify(quizResults, null, 2)}
Generate a structured study roadmap with performance summary, weak areas, recommended resources, practice problems, and next steps in markdown.`;

      resource = await run(prompt);
    } catch (aiErr) {
      console.warn("AI resource generation exception:", aiErr.message);
    }

    if (!resource || resource.trim() === "" || resource.includes("Gemini AI is not configured")) {
      const matched = topicResources.find(t => t.topic.toLowerCase() === topic.toLowerCase()) || topicResources[0];
      const videoLinks = (matched?.videos || [
        { title: `${topic} Complete Mastery Tutorial`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + " tutorial")}` }
      ]).map(v => `- ▶️ [**${v.title}**](${v.url})`).join("\n");

      const articleLinks = (matched?.articles || [
        { title: `${topic} Official Documentation & Guides`, url: `https://www.google.com/search?q=${encodeURIComponent(topic + " documentation")}` }
      ]).map(a => `- 📖 [**${a.title}**](${a.url})`).join("\n");

      resource = `
✨ **Performance Summary** ✨  
- 📊 **Total Questions**: ${total}  
- ✅ **Correct Answers**: ${score}  
- ❌ **Incorrect Answers**: ${total - score}  
- 💡 **Key Observations**: Scored ${Math.round((score / total) * 100)}% on ${topic}. Focused practice will solidify core concepts.

---

🎯 **Focus & Improvement Areas** 🎯  
- 🔴 **Core Principles**: Review fundamental definitions and syntax in **${topic}**.  
- 🔄 **Practical Application**: Work through structured problem sets and examples.  
- ⚠️ **Best Practices**: Master standard patterns, conventions, and error handling.

---

📚 **Recommended Learning Resources** 📚  

📹 *Video Resources*:  
${videoLinks}

📄 *Articles & Tutorials*:  
${articleLinks}

---

🧠 **Practice Problems** 🧠  
- 🔹 **Problem 1**: Summarize the core architectural philosophy of ${topic}.  
- 🔹 **Problem 2**: Construct a minimal practical working example implementing ${topic}.  
- 🔹 **Problem 3**: Identify and resolve a common pitfall encountered in ${topic}.

---

🚀 **Next Steps** 🚀  
- 🔄 Review the recommended video tutorials and articles above.  
- 🚀 Retake the assessment on LearnSmart to measure your score progression.
`;
    }

    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.quizzes.push({ topic, results: quizResults });
        user.resources.push({ topic, content: resource });

        if (!user.testScores) user.testScores = [];
        let topicScoreEntry = user.testScores.find((ts) => ts.topic === topic);
        if (topicScoreEntry) {
          topicScoreEntry.scores.push(score);
        } else {
          user.testScores.push({ topic, scores: [score] });
        }
        await user.save();
      }
    }

    res.render("resource-page.ejs", { topic, resource });
  } catch (e) {
    console.error("Error generating resource:", e);
    res.render("error.ejs", {
      title: "Resource Generation Notice",
      message: "An issue occurred while creating your personalized study guide. Your quiz score has been logged to your dashboard.",
    });
  }
});


app.get("/dashboard", isAuthenticated, async (req, res) => {
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
// HEALTH CHECK ENDPOINT (Deployment Monitoring)
// ==========================================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting/disconnected",
    service: "LearnSmart — AI-Powered Learning Platform",
  });
});

// ==========================================
// STUDENT CRUD REST APIs
// ==========================================
const studentRoutes = require("./routes/students");
app.use("/api/students", studentRoutes);

// ==========================================
// INTEGRATED STUDENT MANAGEMENT (React 18 + Redux Toolkit)
// ==========================================
const reactDistPath = path.join(__dirname, "practicals", "react-student-management", "dist");
app.use("/students", express.static(reactDistPath));
app.use("/assets", express.static(path.join(reactDistPath, "assets")));
app.get("/students*", (req, res) => {
  res.sendFile(path.join(reactDistPath, "index.html"));
});

// Legacy practical URL redirects to main LearnSmart features
app.get(["/analytics", "/practical/bootstrap-dashboard"], (req, res) => {
  res.redirect("/dashboard");
});

app.get(["/courses", "/practical/static-site"], (req, res) => {
  res.redirect("/");
});

app.get(["/mobile", "/practical/mobile"], (req, res) => {
  res.redirect("/dashboard");
});

app.get("/practical/student-management*", (req, res) => {
  res.redirect("/students");
});

// ==========================================
// Server Start
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


