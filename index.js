const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const  topicResources = require("./topicResources");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/profile.js");
const session = require("express-session");
const crypto = require("crypto");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const dburl = process.env.ATLAS_URL || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/learnsmart";
const rawApiKey = process.env.api_Key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.API_KEY || "";
const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim().replace(/^["']|["']$/g, "") : "";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login"); // Or wherever your login route is
}

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

// Session & Environment Security Configuration
const isProduction = process.env.NODE_ENV === "production";
let resolvedSessionSecret = process.env.SESSION_SECRET;

if (isProduction) {
  // Enable trust proxy behind reverse proxies (Nginx / ALB / Render / Cloudflare)
  app.set("trust proxy", 1);
}

if (!resolvedSessionSecret || resolvedSessionSecret.trim().length < 16) {
  resolvedSessionSecret = crypto.randomBytes(32).toString("hex");
  if (isProduction) {
    console.warn(
      "[SECURITY NOTICE] No strong SESSION_SECRET (minimum 16 characters) specified in environment variables. " +
      "Generated an ephemeral cryptographic secret for this runtime session. " +
      "To ensure sessions persist across service restarts, define SESSION_SECRET in Render Environment Variables."
    );
  } else {
    console.warn(
      "[SECURITY NOTICE] No SESSION_SECRET specified in development. " +
      "Using an ephemeral cryptographically generated secret for this session. " +
      "Set SESSION_SECRET in .env for persistent sessions across restarts."
    );
  }
}

// MongoDB Session Store with cryptographically resolved secret
const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: resolvedSessionSecret,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (error) => {
  console.log("ERROR in Mongo SESSION STORE", error);
});

// Hardened Session Cookie Configuration
const sessionOptions = {
  name: "learnsmart.sid",
  store,
  secret: resolvedSessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 1000 * 60 * 60,
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
async function ensureAdminExists() {
  try {
    const adminCount = await User.countDocuments({ isAdmin: true });
    if (adminCount === 0) {
      const initialUsername = (process.env.ADMIN_INITIAL_USERNAME || "").trim();
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "";
      const initialEmail = (process.env.ADMIN_INITIAL_EMAIL || "admin@learnsmart.edu").trim();

      if (initialUsername && initialPassword) {
        if (initialPassword.length < 8) {
          console.warn("[SECURITY WARNING] ADMIN_INITIAL_PASSWORD is shorter than 8 characters. Minimum 8 characters recommended.");
        }
        const existingUser = await User.findOne({ username: initialUsername });
        if (existingUser) {
          existingUser.isAdmin = true;
          if (initialEmail) existingUser.email = initialEmail;
          await existingUser.save();
          console.log(`[Admin Provisioning] Existing account '${initialUsername}' designated as Administrator.`);
        } else {
          const newAdmin = new User({
            username: initialUsername,
            email: initialEmail,
            educationLevel: "Postgraduate Level",
            isAdmin: true,
          });
          await User.register(newAdmin, initialPassword);
          console.log(`[Admin Provisioning] Administrator account '${initialUsername}' provisioned securely from environment.`);
        }
      } else {
        console.log(
          "[SECURITY NOTICE] No administrator account currently exists. " +
          "To provision an initial administrator safely, set ADMIN_INITIAL_USERNAME and ADMIN_INITIAL_PASSWORD in your environment, " +
          "or run 'npm run create-admin' in your terminal."
        );
      }
    }
  } catch (err) {
    console.warn("Admin initialization notice:", err.message);
  }
}

async function main() {
  try {
    await mongoose.connect(dburl);
    console.log("Connection Successful");
    await ensureAdminExists();
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
main();

// Google Generative AI Setup
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Dynamic Gemini API key resolver (checks .env and environment on each call)
function getActiveApiKey() {
  try {
    require("dotenv").config();
  } catch (_) {}
  const rawApiKey = process.env.api_Key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.API_KEY || "";
  const key = typeof rawApiKey === "string" ? rawApiKey.trim().replace(/^["']|["']$/g, "") : "";
  return (key && key !== "your_gemini_api_key_here") ? key : "";
}

// Generate AI Response with multi-model fallback
async function run(promptMsg) {
  const currentKey = getActiveApiKey();
  if (!currentKey) {
    return null;
  }

  const candidateModels = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  const client = new GoogleGenerativeAI(currentKey);

  for (const modelName of candidateModels) {
    try {
      const activeModel = client.getGenerativeModel({ model: modelName });
      const result = await activeModel.generateContent(promptMsg);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} error:`, err.message);
    }
  }
  return null;
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

  // Multi-tiered C++ Test & Quiz Bank
  if (normTopic.includes("c++") || normTopic.includes("cpp") || normTopic.includes("c plus plus")) {
    const beginnerCpp = [
      {
        question: "Which header file is required for standard input and output streams (std::cout, std::cin) in C++?",
        options: ["<iostream>", "<stdio.h>", "<conio.h>", "<fstream>"],
        answer: "<iostream>",
        explanation: "<iostream> defines standard stream objects like cout, cin, and cerr."
      },
      {
        question: "What is the primary difference between a struct and a class in C++?",
        options: ["Members of a class are private by default, while members of a struct are public by default", "Classes cannot have member functions", "Structs cannot inherit other structs", "Classes are value types while structs are reference types"],
        answer: "Members of a class are private by default, while members of a struct are public by default",
        explanation: "In C++, the only technical difference between class and struct is default access specifier: private for class, public for struct."
      },
      {
        question: "Which operator is used to allocate memory dynamically on the heap in modern C++?",
        options: ["new", "malloc", "alloc", "create"],
        answer: "new",
        explanation: "The 'new' operator allocates heap memory and calls the object constructor, while 'delete' frees it."
      },
      {
        question: "What does the scope resolution operator (::) do in C++?",
        options: ["Qualifies identifiers belonging to a specific namespace or class scope", "Performs pointer dereferencing", "Compares equality between two objects", "Defines bitwise shifting"],
        answer: "Qualifies identifiers belonging to a specific namespace or class scope",
        explanation: "The '::' operator resolves names to their enclosing namespace or class, such as std::cout or MyClass::myMethod."
      },
      {
        question: "How do you declare a reference variable 'ref' that aliases integer 'x' in C++?",
        options: ["int& ref = x;", "int* ref = &x;", "ref<int> = x;", "int ref = &x;"],
        answer: "int& ref = x;",
        explanation: "An ampersand '&' following the type denotes a reference, which acts as a permanent alias to an existing variable."
      },
      {
        question: "Which keyword is used to prevent modifications to a variable's value in C++?",
        options: ["const", "final", "static", "readonly"],
        answer: "const",
        explanation: "'const' establishes compile-time immutability, preventing reassignment or mutation."
      },
      {
        question: "Which operator is used to release dynamic single-object heap memory in C++?",
        options: ["delete", "free", "release", "dispose"],
        answer: "delete",
        explanation: "In C++, heap objects created with 'new' must be deallocated with 'delete' (or 'delete[]' for arrays)."
      }
    ];

    const intermediateCpp = [
      {
        question: "What is the primary programming paradigm introduced by C++ on top of C?",
        options: ["Object-Oriented Programming (OOP)", "Purely Functional Programming", "Logic Programming only", "Assembly Machine Mapping"],
        answer: "Object-Oriented Programming (OOP)",
        explanation: "C++ was designed by Bjarne Stroustrup as 'C with Classes', extending C with OOP principles like classes, inheritance, and encapsulation."
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
      },
      {
        question: "What defines a pure virtual function in a C++ abstract base class?",
        options: ["virtual void func() = 0;", "pure virtual void func();", "abstract void func();", "virtual void func() {} = null;"],
        answer: "virtual void func() = 0;",
        explanation: "Syntax '= 0' marks a virtual function as pure, making the containing class abstract and requiring derived classes to implement it."
      },
      {
        question: "Which access specifier allows class members to be accessed by derived classes but not outside the class hierarchy?",
        options: ["protected", "private", "public", "internal"],
        answer: "protected",
        explanation: "'protected' members are accessible within the base class and any derived classes, but inaccessible to unrelated external code."
      },
      {
        question: "What does the 'const' qualifier at the end of a member function declare (e.g., int getCount() const)?",
        options: ["The function guarantees not to modify any non-mutable member variables of the object", "The function cannot return a value", "The function can only be called once", "The function return value is constant"],
        answer: "The function guarantees not to modify any non-mutable member variables of the object",
        explanation: "Const member functions do not alter object state, allowing them to be safely called on const instances."
      },
      {
        question: "What happens when an exception is thrown in C++ and not caught inside any try-catch block?",
        options: ["std::terminate() is called, terminating the process", "The program ignores the error and continues", "The operating system restarts the application", "The exception is converted into an exit code 0"],
        answer: "std::terminate() is called, terminating the process",
        explanation: "Uncaught exceptions trigger std::terminate (defaulting to std::abort), terminating the program abnormally."
      }
    ];

    const advancedCpp = [
      {
        question: "Which smart pointer in Modern C++ (C++11+) provides exclusive, non-shareable ownership of dynamic heap objects?",
        options: ["std::unique_ptr", "std::shared_ptr", "std::weak_ptr", "std::auto_ptr"],
        answer: "std::unique_ptr",
        explanation: "std::unique_ptr enforces exclusive ownership with zero runtime overhead; it cannot be copied, only moved."
      },
      {
        question: "What core C++ idiom binds resource management (memory, file handles, mutex locks) to object lifetime?",
        options: ["RAII (Resource Acquisition Is Initialization)", "CRTP (Curiously Recurring Template Pattern)", "PIMPL (Pointer to Implementation)", "SFINAE (Substitution Failure Is Not An Error)"],
        answer: "RAII (Resource Acquisition Is Initialization)",
        explanation: "RAII guarantees resources are acquired during construction and automatically released upon destruction (going out of scope)."
      },
      {
        question: "Which STL container guarantees contiguous dynamic memory and fast random access via operator[]?",
        options: ["std::vector", "std::list", "std::deque", "std::set"],
        answer: "std::vector",
        explanation: "std::vector stores elements contiguously in heap memory, providing O(1) random index access and cache friendliness."
      },
      {
        question: "What is the purpose of std::move in C++11 and above?",
        options: ["Casts an lvalue to an rvalue reference (T&&) to enable move semantics", "Physically copies bytes across memory locations", "Deletes the source object immediately", "Transfers thread execution priority"],
        answer: "Casts an lvalue to an rvalue reference (T&&) to enable move semantics",
        explanation: "std::move performs an unconditional static_cast to an rvalue reference, allowing cheap transfer of resources rather than deep copying."
      },
      {
        question: "Which operator CANNOT be overloaded in C++?",
        options: ["Scope resolution (::)", "Subscript ([])", "Function call (())", "Arrow (->)"],
        answer: "Scope resolution (::)",
        explanation: "C++ forbids overloading the scope resolution (::), member access (.), pointer-to-member (.*), and ternary conditional (?:) operators."
      },
      {
        question: "What is the Rule of Five in Modern C++?",
        options: ["If you define destructor, copy constructor, or copy assignment, you should also define move constructor and move assignment", "Every class must inherit up to 5 base classes", "Maximum 5 template parameters per class", "Only 5 threads may access a class instance"],
        answer: "If you define destructor, copy constructor, or copy assignment, you should also define move constructor and move assignment",
        explanation: "The Rule of Five dictates implementing all 5 special member functions (Destructor, Copy Ctor, Copy Assign, Move Ctor, Move Assign) for correct resource ownership."
      },
      {
        question: "What is the worst-case time complexity of searching an element by key in std::map (Red-Black Tree)?",
        options: ["O(log n)", "O(1)", "O(n)", "O(n log n)"],
        answer: "O(log n)",
        explanation: "std::map maintains a balanced self-adjusting Red-Black Tree, ensuring logarithmic O(log n) search, insertion, and deletion."
      }
    ];

    let pool = [];
    if (difficulty === "beginner" || difficulty === "easy") {
      pool = [...beginnerCpp, ...intermediateCpp.slice(0, 3)];
    } else if (difficulty === "advanced" || difficulty === "college-advanced") {
      pool = [...advancedCpp, ...intermediateCpp.slice(2, 6)];
    } else {
      pool = [...beginnerCpp.slice(0, 2), ...intermediateCpp, ...advancedCpp.slice(0, 3)];
    }

    // Deterministically shuffle and select 5 questions
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
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

    // Normalize question items
    quiz = quiz.map((q, idx) => ({
      question: (q.question || `Question ${idx + 1}`).trim(),
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map((o) => String(o).trim()) : ["A", "B", "C", "D"],
      answer: String(q.answer || (q.options ? q.options[0] : "A")).trim(),
      explanation: (q.explanation || "").trim(),
    }));

    // 3. Generate secure attempt identifier and bind to authenticated user session
    const attemptId = crypto.randomBytes(16).toString("hex");

    if (!req.session.activeQuizzes) {
      req.session.activeQuizzes = {};
    }

    // Prune expired attempts (> 1 hour) and bound memory size (max 10)
    const now = Date.now();
    Object.keys(req.session.activeQuizzes).forEach((id) => {
      if (now - req.session.activeQuizzes[id].createdAt > 3600000) {
        delete req.session.activeQuizzes[id];
      }
    });
    const activeKeys = Object.keys(req.session.activeQuizzes);
    if (activeKeys.length > 10) {
      delete req.session.activeQuizzes[activeKeys[0]];
    }

    // Store trusted quiz on server
    req.session.activeQuizzes[attemptId] = {
      attemptId,
      userId: String(req.user._id),
      topic,
      educationLevel,
      difficulty,
      createdAt: now,
      submitted: false,
      questions: quiz.map((q, idx) => ({
        index: idx,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      })),
    };

    // Client receives sanitized questions and options only — NO answer keys
    const clientQuiz = quiz.map((q) => ({
      question: q.question,
      options: q.options,
    }));

    res.render("quizgive.ejs", {
      quiz: clientQuiz,
      topic,
      educationLevel,
      difficulty,
      attemptId,
    });
  } catch (e) {
    console.error("Error in /quizmaker:", e);
    res.render("error.ejs", {
      title: "Quiz Generation Notice",
      message: "An issue occurred while generating the quiz. Please return to the quiz page and try again.",
    });
  }
});

app.post("/submit-quiz", isAuthenticated, async (req, res) => {
  try {
    const attemptId = (req.body.attemptId || "").trim();

    if (!attemptId) {
      return res.status(400).render("error.ejs", {
        title: "Invalid Submission",
        message: "No quiz attempt identifier was provided. Please return to the quiz page and take a quiz.",
      });
    }

    const activeQuizzes = req.session.activeQuizzes || {};
    const activeQuiz = activeQuizzes[attemptId];

    if (!activeQuiz) {
      return res.status(400).render("error.ejs", {
        title: "Quiz Expired or Invalid",
        message: "This quiz session does not exist, has expired, or has already been submitted. Please start a new quiz.",
      });
    }

    // Validate ownership
    if (activeQuiz.userId && activeQuiz.userId !== String(req.user._id)) {
      return res.status(403).render("error.ejs", {
        title: "Unauthorized Quiz Attempt",
        message: "This quiz session belongs to another user account.",
      });
    }

    // Validate session age (1 hour limit)
    if (Date.now() - activeQuiz.createdAt > 3600000) {
      delete activeQuizzes[attemptId];
      return res.status(400).render("error.ejs", {
        title: "Quiz Expired",
        message: "Your quiz session has timed out. Please generate a new quiz.",
      });
    }

    // Idempotency: Prevent duplicate submissions
    if (activeQuiz.submitted) {
      return res.redirect("/progress");
    }
    activeQuiz.submitted = true;

    // Server-side authoritative grading against stored answer keys
    let score = 0;
    const results = [];
    const questions = activeQuiz.questions;
    const totalQuestions = questions.length;

    for (let i = 0; i < totalQuestions; i++) {
      const qObj = questions[i];
      const submittedAnswer = (req.body[`q${i}`] || "").trim();

      const isAllowedOption = qObj.options.includes(submittedAnswer);
      const isCorrect = isAllowedOption && submittedAnswer === qObj.answer;

      if (isCorrect) {
        score++;
      }

      results.push({
        questionNumber: i + 1,
        question: qObj.question,
        yourAnswer: isAllowedOption ? submittedAnswer : (submittedAnswer ? "Invalid choice" : "Unanswered"),
        correctAnswer: qObj.answer,
        isCorrect,
        explanation: qObj.explanation || "",
      });
    }

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const topic = activeQuiz.topic || "General";
    const difficulty = activeQuiz.difficulty || "general";

    // Persist verified score in MongoDB
    const user = await User.findById(req.user._id);
    if (user) {
      if (!user.quizzes) user.quizzes = [];
      const alreadySaved = user.quizzes.some((q) => q.attemptId === attemptId);
      if (!alreadySaved) {
        user.quizzes.push({
          attemptId,
          topic,
          difficulty,
          score,
          totalQuestions,
          percentage,
          date: new Date(),
          results,
        });

        // Maintain legacy testScores compatibility
        if (!user.testScores) user.testScores = [];
        let topicScoreEntry = user.testScores.find(
          (ts) => ts.topic.toLowerCase() === topic.toLowerCase()
        );
        if (topicScoreEntry) {
          topicScoreEntry.scores.push(percentage);
        } else {
          user.testScores.push({ topic, scores: [percentage] });
        }
        await user.save();
      }
    }

    // Clean up active quiz from session
    delete activeQuizzes[attemptId];

    res.render("quiz-result.ejs", {
      topic,
      score,
      total: totalQuestions,
      percentage,
      results,
    });
  } catch (err) {
    console.error("Error scoring quiz:", err);
    res.status(500).render("error.ejs", {
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

    const norm = topic.toLowerCase();
    let matched = topicResources.find(t => t.topic.toLowerCase() === norm);
    if (!matched) {
      if (norm.includes("c++") || norm.includes("cpp") || norm.includes("c plus plus")) {
        matched = topicResources.find(t => t.topic === "C++");
      } else if (norm.includes("c ") || norm === "c") {
        matched = topicResources.find(t => t.topic === "C Programming");
      } else if (norm.includes("python")) {
        matched = topicResources.find(t => t.topic === "Python");
      } else if (norm.includes("java")) {
        matched = topicResources.find(t => t.topic === "Java");
      } else {
        matched = topicResources[0];
      }
    }

    const videos = matched?.videos || [
      { title: `${topic} Complete Mastery Tutorial`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + " tutorial")}` }
    ];

    const articles = matched?.articles || [
      { title: `${topic} Official Documentation & Guides`, url: `https://www.google.com/search?q=${encodeURIComponent(topic + " documentation")}` }
    ];

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    if (!resource || resource.trim() === "" || resource.includes("Gemini AI is not configured")) {
      const videoLinks = videos.map(v => `- ▶️ [**${v.title}**](${v.url})`).join("\n");
      const articleLinks = articles.map(a => `- 📖 [**${a.title}**](${a.url})`).join("\n");

      resource = `
### 🎯 Focus & Improvement Areas
- **Core Principles**: Review fundamental definitions, syntax, and memory models in **${topic}**.
- **Practical Application**: Work through structured problem sets and coding exercises to build muscle memory.
- **Modern Best Practices**: Master standard patterns, conventions, modern idioms, and error handling.

### 🧠 Practice Problems & Exercises
- **Problem 1 (Concept)**: Summarize the core architectural philosophy and memory model of ${topic}.
- **Problem 2 (Implementation)**: Construct a minimal practical working example implementing ${topic} cleanly.
- **Problem 3 (Debugging)**: Identify and resolve a common pitfall or memory hazard encountered in ${topic}.

### 🚀 Recommended Next Steps
- Review the curated video masterclasses and documentation guides below.
- Spend 30 minutes practicing the code challenges.
- Retake the assessment on LearnSmart to track your score progression.
`;
    }

    if (req.user && req.user._id) {
      const user = await User.findById(req.user._id);
      if (user) {
        if (!user.resources) user.resources = [];
        user.resources.push({ topic, content: resource });
        await user.save();
      }
    }

    res.render("resource-page.ejs", {
      topic,
      resource,
      score,
      total,
      percentage,
      quizResults,
      videos,
      articles
    });
  } catch (e) {
    console.error("Error generating resource:", e);
    res.render("error.ejs", {
      title: "Resource Generation Notice",
      message: "An issue occurred while creating your personalized study guide. Your quiz score has been logged to your dashboard.",
    });
  }
});


const { computeStudentAnalytics } = require("./services/studentAnalytics");

app.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect("/login");
    if (user.isAdmin) {
      return res.redirect("/admin/dashboard");
    }
    const analytics = computeStudentAnalytics(user);
    res.render("dashboard", { user, analytics });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.redirect("/login");
  }
});

app.get("/progress", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect("/login");
    if (user.isAdmin) {
      return res.redirect("/admin/scores");
    }
    const analytics = computeStudentAnalytics(user);
    const testScores = user.testScores || [];
    res.render("progress", { testScores, user, analytics });
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.redirect("/login");
  }
});

// Dedicated Assessment Attempt Review Permalink
app.get("/quiz/review/:attemptIdOrIndex", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect("/login");

    const param = (req.params.attemptIdOrIndex || "").trim();
    const quizzes = user.quizzes || [];

    // 1. Search by attemptId
    let quiz = quizzes.find((q) => q.attemptId && q.attemptId === param);

    // 2. If not found and param is a valid integer index
    if (!quiz && /^\d+$/.test(param)) {
      const idx = parseInt(param, 10);
      if (idx >= 0 && idx < quizzes.length) {
        quiz = quizzes[idx];
      }
    }

    if (!quiz) {
      return res.status(404).render("error.ejs", {
        title: "Assessment Not Found",
        message: "The requested quiz attempt could not be found in your learning history.",
      });
    }

    const results = quiz.results || [];
    const score =
      typeof quiz.score === "number"
        ? quiz.score
        : results.filter((r) => r.isCorrect).length;
    const total =
      typeof quiz.totalQuestions === "number" && quiz.totalQuestions > 0
        ? quiz.totalQuestions
        : results.length > 0
        ? results.length
        : 5;
    const percentage =
      typeof quiz.percentage === "number"
        ? quiz.percentage
        : total > 0
        ? Math.round((score / total) * 100)
        : 0;

    res.render("quiz-result.ejs", {
      topic: quiz.topic || "General",
      score,
      total,
      percentage,
      results,
      isReview: true,
    });
  } catch (err) {
    console.error("Error retrieving quiz review:", err);
    res.status(500).render("error.ejs", {
      title: "Quiz Review Notice",
      message: "An issue occurred while loading your quiz attempt review.",
    });
  }
});

// AI Interview Preparation Page Route
app.get("/interview", isAuthenticated, (req, res) => {
  res.render("interview.ejs", { user: req.user });
});

// Student Analytics API
app.get("/api/student/analytics", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const analytics = computeStudentAnalytics(user);
    res.json({
      success: true,
      ...analytics,
    });
  } catch (err) {
    console.error("Student analytics error:", err);
    res.status(500).json({ success: false, error: "Failed to load student analytics" });
  }
});

app.get("/delete", requireAdmin, (req, res) => {
  res.status(403).json({
    success: false,
    error: "Direct deletion endpoint is disabled.",
  });
});

// User Routes
app.get("/user", isAuthenticated, (req, res) => {
  const { _id, email, username, educationLevel, isAdmin } = req.user;
  res.json({
    id: _id,
    email,
    username,
    educationLevel,
    isAdmin: !!isAdmin,
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
    console.log(`Signup attempt for username: "${username ? username.trim() : "anonymous"}"`);

    let user = await User.findOne({ username: username });
    let alreadyuser = await User.findOne({ email: email });

    if (!user && !alreadyuser) {
      // Server-side RBAC: Explicitly enforce standard student role on public signup
      const newUser = new User({
        email: email ? email.trim() : "",
        username: username ? username.trim() : "",
        educationLevel: educationLevel ? educationLevel.trim() : "Undergraduate Level",
        isAdmin: false,
      });
      const registeredUser = await User.register(newUser, password);
      console.log("Registered Student:", registeredUser.username);
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

      console.log("Logged In User:", user.username, "| Role:", user.isAdmin ? "Administrator" : "Student");

      // Check role and redirect to dedicated role dashboard
      if (user.isAdmin) {
        return res.redirect("/admin/dashboard");
      }

      // Normal student
      return res.redirect("/dashboard");
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
  try {
    const user = await User.findById(req.user._id);
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || !user.notes || index >= user.notes.length) {
      return res.redirect("/notes");
    }
    const note = user.notes[index];
    res.render("editNote", { note, index });
  } catch (err) {
    console.error("Notes edit render error:", err);
    res.redirect("/notes");
  }
});

// Handle Edit
app.post("/notes/edit/:index", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || !user.notes || index >= user.notes.length) {
      return res.redirect("/notes");
    }
    const { title, content } = req.body;
    user.notes[index] = { title: (title || "").trim(), content: (content || "").trim() };
    await user.save();
    res.redirect("/notes");
  } catch (err) {
    console.error("Notes edit save error:", err);
    res.redirect("/notes");
  }
});

// Handle Delete
app.post("/notes/delete/:index", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || !user.notes || index >= user.notes.length) {
      return res.redirect("/notes");
    }
    user.notes.splice(index, 1);
    await user.save();
    res.redirect("/notes");
  } catch (err) {
    console.error("Notes delete error:", err);
    res.redirect("/notes");
  }
});

// TODO page - view list
// TODO page - view list (supports both /todo and /todos)
app.get(["/todo", "/todos"], isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render("todos", { todos: (user && user.todos) || [] });
  } catch (err) {
    console.error("Todo render error:", err);
    res.redirect("/dashboard");
  }
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
  try {
    const index = parseInt(req.query.index, 10);
    const user = await User.findById(req.user._id);
    if (!isNaN(index) && index >= 0 && user && user.todos && index < user.todos.length) {
      user.todos[index].completed = true;
      await user.save();
    }
    res.redirect("/todo");
  } catch (err) {
    console.error("Todo complete error:", err);
    res.redirect("/todo");
  }
});

// Delete a todo: /todo/delete?index=0
app.get("/todo/delete", isAuthenticated, async (req, res) => {
  try {
    const index = parseInt(req.query.index, 10);
    const user = await User.findById(req.user._id);
    if (!isNaN(index) && index >= 0 && user && user.todos && index < user.todos.length) {
      user.todos.splice(index, 1);
      await user.save();
    }
    res.redirect("/todo");
  } catch (err) {
    console.error("Todo delete error:", err);
    res.redirect("/todo");
  }
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




// ==========================================
// ADMIN DASHBOARD & ANALYTICS APIs
// ==========================================
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

// ==========================================
// AI INTERVIEW PREPARATION REST APIs
// ==========================================
const interviewRoutes = require("./routes/interviews");
app.use("/api/interviews", interviewRoutes);







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
// INTEGRATED STUDENT MANAGEMENT (React 18 + Redux Toolkit) - ADMIN AREA
// ==========================================
const reactDistPath = path.join(__dirname, "practicals", "react-student-management", "dist");

// Serve assets for /admin/students and general assets
app.use("/admin/students", requireAdmin, express.static(reactDistPath));
app.use("/admin/students/assets", express.static(path.join(reactDistPath, "assets")));
app.use("/admin/assets", express.static(path.join(reactDistPath, "assets")));
app.use("/assets", express.static(path.join(reactDistPath, "assets")));

// Canonical location for Student Management portal
app.get("/admin/students*", requireAdmin, (req, res) => {
  res.sendFile(path.join(reactDistPath, "index.html"));
});

// Role-aware legacy /students route redirection
app.get("/students*", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) {
    return res.redirect("/admin/students");
  }
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/login");
  }
  return res.redirect("/dashboard");
});

// Legacy practical URL redirects to main LearnSmart features
app.get(["/analytics", "/practical/bootstrap-dashboard"], (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) {
    return res.redirect("/admin/analytics");
  }
  return res.redirect("/dashboard");
});

app.get(["/courses", "/practical/static-site"], (req, res) => {
  res.redirect("/");
});

app.get(["/mobile", "/practical/mobile"], (req, res) => {
  res.redirect("/dashboard");
});

app.get("/practical/student-management*", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) {
    return res.redirect("/admin/students");
  }
  return res.redirect("/dashboard");
});

// ==========================================
// Server Start
// ==========================================
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = {
  app,
  computeStudentAnalytics,
};


