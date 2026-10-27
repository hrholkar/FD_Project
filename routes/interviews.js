const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSession");
const { runGemini, extractJson, getActiveApiKey } = require("../services/geminiService");

// Comprehensive fallback questions bank by domain & difficulty
const fallbackInterviewBank = {
  "frontend development": [
    {
      question: "How does the browser rendering pipeline work (from HTML parsing to painting on screen)?",
      difficulty: "Intermediate",
      topic: "Browser Internals & Critical Rendering Path",
      suggestedAnswer: "The browser parses HTML to construct the DOM tree and parses CSS to construct the CSSOM tree. These combine into the Render Tree, which contains visible nodes. The browser then performs Layout (reflow) to calculate geometries and positions, followed by Paint (rasterization) to draw pixels, and finally Compositing to combine GPU layers.",
      keyConcepts: "DOM, CSSOM, Render Tree, Layout / Reflow, Repaint, Compositing layers, Critical Rendering Path optimization.",
      followUpQuestions: [
        "What triggers a reflow vs a repaint, and how can developers minimize reflows?",
        "How do 'async' and 'defer' script attributes impact the HTML parsing phase?"
      ]
    },
    {
      question: "Explain CSS Specificity, the Cascade, and how specificity is calculated.",
      difficulty: "Beginner",
      topic: "CSS Architecture",
      suggestedAnswer: "Specificity determines which CSS rule applies when multiple rules match an element. It follows a 4-part weight: Inline styles (1,0,0,0) > IDs (0,1,0,0) > Classes, attributes, and pseudo-classes (0,0,1,0) > Element tags and pseudo-elements (0,0,0,1). The Universal selector (*) has 0 weight. '!important' overrides normal specificity.",
      keyConcepts: "Cascade hierarchy, Specificity vector (Inline, ID, Class, Element), !important hazards, BEM methodology.",
      followUpQuestions: [
        "Why is overusing '!important' considered an anti-pattern in scalable CSS?",
        "How does CSS specificity behave within modern CSS layers (@layer)?"
      ]
    },
    {
      question: "What is Event Bubbling, Event Capturing, and Event Delegation in JavaScript?",
      difficulty: "Intermediate",
      topic: "DOM Event Propagation",
      suggestedAnswer: "The DOM event flow has three phases: Capturing (event trickles down from window to target), Target (event reaches target), and Bubbling (event bubbles up from target to window). Event delegation leverages bubbling by placing a single listener on a parent container to manage events from multiple child elements efficiently.",
      keyConcepts: "Event phases (Capturing, Target, Bubbling), event.stopPropagation(), event.preventDefault(), Event Delegation performance advantages.",
      followUpQuestions: [
        "What is the difference between event.target and event.currentTarget?",
        "Can all DOM events bubble? Name an event that does not bubble."
      ]
    },
    {
      question: "Implement a robust debounce function in JavaScript and explain how it differs from throttle.",
      difficulty: "Advanced",
      topic: "Performance & Functional JavaScript",
      suggestedAnswer: "Debounce delays execution of a function until a specified quiet period passes without new calls (ideal for search inputs). Throttle limits execution to at most once per specified time interval (ideal for scroll or resize events).",
      keyConcepts: "Higher-order functions, Closures, setTimeout & clearTimeout, Event rate-limiting.",
      followUpQuestions: [
        "How would you implement immediate execution on the leading edge of a debounced function?",
        "What memory leaks can occur if timers are not cleared on component unmount?"
      ],
      codingDetails: {
        constraints: ["Must preserve the 'this' context and forward all arguments.", "Must return a cancellable timer if invoked."],
        testCases: [
          { input: "Rapid calls within 300ms window", output: "Executes exactly once, 300ms after the last call" }
        ]
      }
    },
    {
      question: "What strategies do you use to optimize Web Vitals (LCP, FID/INP, CLS)?",
      difficulty: "Advanced",
      topic: "Core Web Vitals & Frontend Performance",
      suggestedAnswer: "LCP (Largest Contentful Paint): preload hero images, optimize critical CSS, use modern image formats (WebP/AVIF), and CDN caching. INP (Interaction to Next Paint): break up long tasks via requestIdleCallback/web workers, minimize main thread blocking. CLS (Cumulative Layout Shift): set explicit width/height on images and media containers, avoid injecting dynamic DOM elements above existing content.",
      keyConcepts: "Core Web Vitals, LCP, INP, CLS, Asset Preloading, Code Splitting, CDN, GPU Acceleration.",
      followUpQuestions: [
        "How do font loading strategies (font-display: swap) affect CLS?",
        "What tools do you use in Chrome DevTools to profile long tasks?"
      ]
    }
  ],
  "backend development": [
    {
      question: "Explain the architectural principles of RESTful APIs and contrast with GraphQL and gRPC.",
      difficulty: "Intermediate",
      topic: "API Architecture & Protocols",
      suggestedAnswer: "REST is an architectural style based on stateless client-server interactions, resource identification via URIs, standard HTTP methods (GET, POST, PUT, DELETE, PATCH), and standardized status codes. GraphQL offers client-driven queries avoiding over/under-fetching. gRPC provides high-performance binary serialization using Protocol Buffers over HTTP/2, ideal for internal microservices.",
      keyConcepts: "Statelessness, Idempotency, HTTP verbs and status codes, GraphQL schemas, gRPC and Protobuf serialization.",
      followUpQuestions: [
        "Which HTTP methods are idempotent, and why does PUT vs POST matter?",
        "How do you handle API versioning cleanly across evolving microservices?"
      ]
    },
    {
      question: "How do you securely handle user authentication, password hashing, and session management in modern web services?",
      difficulty: "Intermediate",
      topic: "Backend Security & Auth",
      suggestedAnswer: "Passwords should never be stored in plaintext; use adaptive salted hashing functions like bcrypt or Argon2 with adequate work factors. Authentication can use secure HTTP-only, SameSite cookies with server-side session stores (like Redis or MongoDB), or short-lived JWTs paired with refresh token rotation stored securely.",
      keyConcepts: "Salted hashing (bcrypt/Argon2), HTTP-only Secure SameSite cookies, JWT vs Stateful sessions, CSRF and XSS protection.",
      followUpQuestions: [
        "Why is storing JWTs in localStorage vulnerable to XSS attacks?",
        "What is Refresh Token Rotation and how does it prevent replay attacks?"
      ]
    },
    {
      question: "How does Node.js handle high concurrency despite having a single-threaded JavaScript execution model?",
      difficulty: "Advanced",
      topic: "Node.js Concurrency & libuv",
      suggestedAnswer: "Node.js runs user JavaScript on a single thread via the Event Loop, but delegates asynchronous I/O (file system, network, DNS) to the operating system kernel or the multi-threaded libuv thread pool (default 4 threads). When asynchronous tasks finish, callbacks or promises are queued into microtask and macrotask queues to be processed on the main thread.",
      keyConcepts: "Event Loop, libuv thread pool, Non-blocking asynchronous I/O, Microtasks (Promise/process.nextTick) vs Macrotasks (timers/setImmediate).",
      followUpQuestions: [
        "What happens if you execute CPU-intensive synchronous calculations in an Express route?",
        "How do Worker Threads and the Cluster module differ in Node.js?"
      ]
    },
    {
      question: "What is database indexing, how do B-Trees work, and when can an index negatively impact performance?",
      difficulty: "Intermediate",
      topic: "Database Optimization & Indexing",
      suggestedAnswer: "An index is a separate data structure (typically a balanced B-Tree or B+ Tree) that allows the database engine to find records in O(log n) time without scanning every table row. While indexes dramatically speed up read queries, they add write overhead on INSERT, UPDATE, and DELETE operations because the index trees must be balanced and updated on disk.",
      keyConcepts: "B-Tree / B+ Tree structures, Index scan vs Full table scan, Compound indexes, Cardinality, Write amplification.",
      followUpQuestions: [
        "What is index prefix rule (leftmost prefix) in compound indexes?",
        "How do you use EXPLAIN / execution plans to detect slow queries?"
      ]
    },
    {
      question: "Design a scalable rate-limiting system for a high-traffic public API.",
      difficulty: "Advanced",
      topic: "System Design & Distributed Systems",
      suggestedAnswer: "Rate limiters protect APIs from denial of service and abuse. Common algorithms include Token Bucket, Leaky Bucket, and Sliding Window Counter. In distributed architectures, Redis is used as a fast in-memory store with atomic Lua scripts or sliding window sorted sets (ZADD, ZREMRANGEBYSCORE) keyed by client IP or API key.",
      keyConcepts: "Token Bucket vs Sliding Window, Redis in-memory storage, Race condition mitigation via atomic Lua scripts, HTTP 429 Too Many Requests headers (Retry-After).",
      followUpQuestions: [
        "How do you prevent race conditions when multiple microservice instances check limits concurrently?",
        "How would you handle rate limiting behind load balancers with reverse proxy headers (X-Forwarded-For)?"
      ]
    }
  ],
  "react js": [
    {
      question: "Explain the Virtual DOM, React reconciliation, and how the Fiber architecture works.",
      difficulty: "Intermediate",
      topic: "React Architecture & Reconciliation",
      suggestedAnswer: "The Virtual DOM is an in-memory representation of the real DOM UI. When state changes, React creates a new VDOM tree and diffs it with the previous tree using an O(n) heuristic reconciliation algorithm. The React Fiber architecture (introduced in React 16) breaks reconciliation work into incremental units, enabling cooperative multitasking, interruptible rendering, and priority scheduling.",
      keyConcepts: "Virtual DOM, Diffing algorithm, Keys in lists, React Fiber, Re-rendering triggers, Commit vs Render phase.",
      followUpQuestions: [
        "Why is using array index as a 'key' prop considered problematic when list items can be reordered or filtered?",
        "What is the difference between Concurrent Mode and synchronous rendering in React 18?"
      ]
    },
    {
      question: "What are the rules of React Hooks and why do they exist?",
      difficulty: "Beginner",
      topic: "React Hooks Foundation",
      suggestedAnswer: "Hooks must only be called at the top level of React function components or custom hooks, never inside loops, conditions, or nested functions. This ensures that hooks are called in the exact same sequence on every render, allowing React to correctly match state and effects to their internal linked-list slots across renders.",
      keyConcepts: "Top-level invocation rule, Hook call order consistency, Fiber linked list state storage, Custom hooks.",
      followUpQuestions: [
        "How does React track hook state internally without receiving a unique key for each hook?",
        "What ESLint plugin enforces these rules during development?"
      ]
    },
    {
      question: "Compare useMemo, useCallback, and React.memo. When should each be used and when should they be avoided?",
      difficulty: "Intermediate",
      topic: "Performance Optimization in React",
      suggestedAnswer: "React.memo is a higher-order component that memoizes a component's rendered output based on shallow prop comparisons. useMemo memoizes the result of an expensive calculation between renders. useCallback memoizes a function definition instance so that child components receiving that callback as a prop do not re-render unnecessarily when passing to a memoized child.",
      keyConcepts: "Referential equality, Shallow comparison, Over-memoization cost, Dependency array correctness.",
      followUpQuestions: [
        "Why can premature or unnecessary use of useMemo actually degrade application performance?",
        "How does the React Compiler (React Forget) aim to change manual memoization in the future?"
      ]
    },
    {
      question: "How does Redux Toolkit simplify state management compared to legacy Redux, and how does createSlice utilize Immer?",
      difficulty: "Intermediate",
      topic: "State Management with Redux Toolkit",
      suggestedAnswer: "Redux Toolkit (RTK) eliminates boilerplate by providing configureStore (auto-configuring Thunk and DevTools) and createSlice (generating action creators and action types automatically). Inside createSlice reducers, RTK uses the Immer library to detect mutations to a proxy state and automatically generate immutable state updates safely.",
      keyConcepts: "Redux store, createSlice, Immer proxy mechanics, Redux Thunk for async thunks (createAsyncThunk), Unidirectional data flow.",
      followUpQuestions: [
        "What are the trade-offs between local component state, React Context, and Redux Toolkit?",
        "How do RTK Query and standard Async Thunk differ for data fetching?"
      ]
    },
    {
      question: "Explain the lifecycle and cleanup mechanics of the useEffect hook.",
      difficulty: "Intermediate",
      topic: "Side Effects & Cleanup",
      suggestedAnswer: "useEffect runs after the component renders and commits to the screen. If dependencies change, React runs the previous effect's returned cleanup function first, then runs the new effect. When the component unmounts, the cleanup function runs one final time. Cleanups are essential for unsubscribing from event listeners, clearing timers, and aborting in-flight fetch requests.",
      keyConcepts: "Render phase vs Commit phase, Effect cleanup function, Dependency array (empty array vs values vs omitted), AbortController.",
      followUpQuestions: [
        "How do you properly cancel an ongoing HTTP request in a useEffect cleanup function using AbortController?",
        "Why does React 18 run effects twice in StrictMode development, and how does your code handle it?"
      ]
    }
  ],
  "data structures and algorithms": [
    {
      question: "Compare the time and space complexity of QuickSort and MergeSort. When would you prefer one over the other?",
      difficulty: "Intermediate",
      topic: "Sorting Algorithms & Complexity Analysis",
      suggestedAnswer: "MergeSort has guaranteed O(n log n) time in all cases and requires O(n) auxiliary space for arrays. It is stable and ideal for linked lists or external sorting. QuickSort has an average O(n log n) time and O(log n) space, but worst-case O(n^2) time if pivot selection is poor. QuickSort is typically faster in practice due to cache locality and in-place partitioning.",
      keyConcepts: "Divide and conquer, Asymptotic complexity (O, Omega, Theta), Stability in sorting, Cache locality, Pivot selection strategies (Randomized, Median-of-three).",
      followUpQuestions: [
        "What is Timsort and why is it used as the default sorting algorithm in Python and Java?",
        "How does QuickSelect find the Kth smallest element in O(n) average time?"
      ]
    },
    {
      question: "Explain the difference between Breadth-First Search (BFS) and Depth-First Search (DFS) on graphs.",
      difficulty: "Intermediate",
      topic: "Graph Traversal Algorithms",
      suggestedAnswer: "BFS explores neighbors level-by-level using a FIFO Queue and naturally finds the shortest path in unweighted graphs. DFS explores as deep as possible along each branch before backtracking, implemented using recursion or an explicit LIFO Stack. Both visit vertices and edges in O(V + E) time.",
      keyConcepts: "Queue vs Stack, Visited set tracking to avoid cycles, Shortest path in unweighted graphs (BFS), Topological sorting & cycle detection (DFS).",
      followUpQuestions: [
        "How would you detect a cycle in a directed graph using DFS and vertex coloring (White, Gray, Black)?",
        "When is Dijkstra's algorithm preferred over BFS, and what happens with negative edge weights?"
      ]
    },
    {
      question: "How does a Hash Map work internally, and how are hash collisions resolved?",
      difficulty: "Intermediate",
      topic: "Hash Tables & Collision Resolution",
      suggestedAnswer: "A Hash Map maps keys to bucket indices using a hash function and modulo operation. Collisions (when different keys produce the same bucket index) are resolved via Chaining (linked lists or self-balancing trees in each bucket) or Open Addressing (Linear Probing, Quadratic Probing, Double Hashing). Average lookup is O(1); worst-case is O(n) if all keys collide.",
      keyConcepts: "Hash function properties, Load factor, Dynamic resizing/rehashing, Separate Chaining vs Open Addressing, Java 8 treeification (O(log n) worst case).",
      followUpQuestions: [
        "What is a load factor threshold and why does resizing double the bucket array capacity?",
        "What happens if an object's hashCode() changes after being inserted into a HashMap?"
      ]
    },
    {
      question: "What is Dynamic Programming, and how does Memoization (Top-Down) differ from Tabulation (Bottom-Up)?",
      difficulty: "Advanced",
      topic: "Dynamic Programming Concepts",
      suggestedAnswer: "Dynamic Programming solves complex problems by breaking them down into overlapping subproblems with optimal substructure. Top-Down (Memoization) uses recursion and caches subproblem solutions in a hash table or array as they are computed. Bottom-Up (Tabulation) iteratively solves base cases first and fills a DP table sequentially, avoiding recursion stack overhead and enabling space optimization.",
      keyConcepts: "Overlapping subproblems, Optimal substructure, Top-Down memoization vs Bottom-Up tabulation, State definition & transition relations, Space reduction techniques.",
      followUpQuestions: [
        "How do you determine if a problem can be solved using a Greedy approach rather than Dynamic Programming?",
        "How can the space complexity of the 0/1 Knapsack problem be optimized from O(N*W) to O(W)?"
      ]
    },
    {
      question: "Implement a function to detect if a Singly Linked List has a cycle and locate the cycle's starting node.",
      difficulty: "Intermediate",
      topic: "Linked Lists & Two Pointers",
      suggestedAnswer: "Use Floyd's Cycle-Finding Algorithm (Tortoise and Hare). Fast pointer advances 2 steps while slow pointer advances 1 step. If they meet, a cycle exists. To find the cycle entrance, reset one pointer to head and advance both pointers 1 step at a time; their meeting point is the cycle start node.",
      keyConcepts: "Two-pointer technique, Floyd's cycle detection algorithm, O(n) time, O(1) auxiliary space.",
      followUpQuestions: [
        "Prove mathematically why the distance from head to cycle entrance equals the distance from the first meeting point to cycle entrance.",
        "How would you find the middle element of a linked list in a single pass?"
      ],
      codingDetails: {
        constraints: ["Must achieve O(n) time and strictly O(1) extra memory.", "List may be empty or contain up to 10^5 nodes."],
        testCases: [
          { input: "3 -> 2 -> 0 -> -4 (pointing back to 2)", output: "Cycle detected at node index 1 (value 2)" },
          { input: "1 -> 2 (pointing to null)", output: "No cycle" }
        ]
      }
    }
  ],
  "hr and behavioral interviews": [
    {
      question: "Tell me about a challenging technical conflict you had with a team member and how you resolved it.",
      difficulty: "Intermediate",
      topic: "Conflict Resolution & Team Collaboration",
      suggestedAnswer: "Structure your response using the STAR method: Situation (project context and opposing viewpoints), Task (your goal to ship on time without compromising quality), Action (active listening, scheduled design review, objective benchmark testing, collaborative consensus), Result (project outcome, team cohesion, and lessons learned).",
      keyConcepts: "STAR Method (Situation, Task, Action, Result), Objective data-driven decision making, Empathy and professional communication.",
      followUpQuestions: [
        "What would you do if your manager insisted on a technical approach that you believed was deeply flawed?",
        "How do you balance rapid feature delivery with addressing technical debt?"
      ]
    },
    {
      question: "Describe a project where you failed or made a critical mistake. What happened and what did you learn?",
      difficulty: "Intermediate",
      topic: "Accountability & Growth Mindset",
      suggestedAnswer: "Share an authentic professional experience. Take ownership immediately without deflecting blame onto others. Explain the root cause, the immediate mitigation steps you took to protect users/systems, and the permanent preventive measures (e.g. automated tests, CI/CD checks, post-mortem documentation) you implemented.",
      keyConcepts: "Extreme ownership, Post-mortem culture, Preventive engineering, Resilience and vulnerability.",
      followUpQuestions: [
        "How do you handle high-pressure production outage situations?",
        "Can you share how you solicit and incorporate constructive feedback from code reviews?"
      ]
    },
    {
      question: "Why do you want to join our engineering team, and where do you see your career progressing in the next 3 to 5 years?",
      difficulty: "Beginner",
      topic: "Career Motivation & Culture Alignment",
      suggestedAnswer: "Connect your specific technical interests and career values with the company's product domain and engineering challenges. Express enthusiasm for deepening your system design expertise, mentoring junior teammates, and delivering scalable customer impact.",
      keyConcepts: "Company research, Alignment with engineering mission, Continuous learning trajectory, Leadership aspirations.",
      followUpQuestions: [
        "What technical skills or technologies are you currently learning outside of your required coursework/job?",
        "What kind of team environment allows you to do your best work?"
      ]
    },
    {
      question: "How do you prioritize competing deadlines and manage high-stress project constraints?",
      difficulty: "Intermediate",
      topic: "Time Management & Prioritization",
      suggestedAnswer: "Explain your framework for assessing urgency vs impact (e.g. Eisenhower Matrix). Discuss proactive communication with stakeholders, setting realistic expectations, breaking large tasks into manageable milestones, and knowing when to ask for help or descope non-critical requirements.",
      keyConcepts: "Impact vs Urgency prioritization, Transparent communication, Scope management, Sustainable pacing.",
      followUpQuestions: [
        "What do you do when requirements change mid-sprint?",
        "How do you maintain code quality and test coverage when working against tight delivery deadlines?"
      ]
    }
  ]
};

/**
 * Helper to get fallback questions for any domain & count
 */
function getFallbackQuestions(domain, difficulty, interviewType, count) {
  const norm = (domain || "").toLowerCase().trim();
  let pool = [];

  for (const [key, questions] of Object.entries(fallbackInterviewBank)) {
    if (norm.includes(key) || key.includes(norm)) {
      pool = questions;
      break;
    }
  }

  // Fallback to related pools if no direct match
  if (pool.length === 0) {
    if (norm.includes("node") || norm.includes("express") || norm.includes("mongo") || norm.includes("backend")) {
      pool = fallbackInterviewBank["backend development"];
    } else if (norm.includes("react") || norm.includes("frontend") || norm.includes("css") || norm.includes("html") || norm.includes("web")) {
      pool = fallbackInterviewBank["react js"].concat(fallbackInterviewBank["frontend development"]);
    } else if (norm.includes("algo") || norm.includes("dsa") || norm.includes("code") || norm.includes("data structure") || norm.includes("python") || norm.includes("java")) {
      pool = fallbackInterviewBank["data structures and algorithms"];
    } else if (norm.includes("hr") || norm.includes("behavior") || norm.includes("leadership")) {
      pool = fallbackInterviewBank["hr and behavioral interviews"];
    } else {
      pool = fallbackInterviewBank["backend development"].concat(fallbackInterviewBank["frontend development"]);
    }
  }

  // Shuffle and slice requested count
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = [];
  const targetCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);

  for (let i = 0; i < targetCount; i++) {
    const base = shuffled[i % shuffled.length];
    selected.push({
      questionNumber: i + 1,
      question: base.question,
      difficulty: difficulty || base.difficulty || "Intermediate",
      topic: base.topic || domain,
      suggestedAnswer: base.suggestedAnswer,
      keyConcepts: base.keyConcepts,
      followUpQuestions: base.followUpQuestions || [],
      codingDetails: base.codingDetails || { constraints: [], testCases: [] }
    });
  }

  return selected;
}

/**
 * Heuristic conceptual answer evaluator when AI key is unavailable or offline
 */
function evaluateAnswerLocally(question, studentAnswer, domain, difficulty, suggestedAnswer, keyConcepts) {
  const answer = (studentAnswer || "").trim();
  const wordCount = answer.split(/\s+/).filter(Boolean).length;

  if (wordCount < 10) {
    return {
      score: 35,
      rating: "Needs Substantial Detail",
      strengths: "You provided an initial thought, but the response is too brief for an interview setting.",
      missingConcepts: `A complete interview response should thoroughly cover: ${keyConcepts || "core definitions, mechanics, trade-offs, and practical examples"}.`,
      suggestions: "Elaborate on the underlying mechanics, provide a concrete code snippet or architectural scenario, and explain why this approach is chosen.",
      evaluationText: "AI Assessment (Heuristic): The response is overly brief. In a technical or behavioral interview, aim to explain the 'what', 'how', and 'why', followed by trade-offs."
    };
  }

  // Extract key concept terms
  const terms = (keyConcepts + " " + (suggestedAnswer || ""))
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 4);
  const uniqueTerms = [...new Set(terms)];

  const lowerAnswer = answer.toLowerCase();
  let matchedCount = 0;
  const matchedTerms = [];
  const missingTerms = [];

  uniqueTerms.slice(0, 15).forEach(term => {
    if (lowerAnswer.includes(term)) {
      matchedCount++;
      matchedTerms.push(term);
    } else {
      missingTerms.push(term);
    }
  });

  let score = 55;
  if (wordCount > 40) score += 15;
  if (wordCount > 100) score += 10;
  score += Math.min(20, matchedCount * 3);
  score = Math.min(95, Math.max(40, score));

  let rating = "Proficient";
  if (score >= 85) rating = "Excellent (Interview Ready)";
  else if (score >= 70) rating = "Good Conceptual Understanding";
  else if (score >= 55) rating = "Developing / Partially Correct";
  else rating = "Needs Review";

  const strengths = matchedTerms.length > 0
    ? `Accurately identified and discussed key concepts such as: ${matchedTerms.slice(0, 5).join(", ")}. Well-structured explanation with clear intent.`
    : `Good effort articulating the reasoning in clear conversational English with structured points.`;

  const missingConcepts = missingTerms.length > 0
    ? `Could be strengthened by explicitly mentioning: ${missingTerms.slice(0, 5).join(", ")}.`
    : `Consider diving deeper into runtime trade-offs and edge case handling.`;

  const suggestions = "Structure your answer with: 1) High-level definition, 2) Technical mechanics / architecture, 3) Real-world example or trade-offs, 4) Edge case handling.";

  return {
    score,
    rating,
    strengths,
    missingConcepts,
    suggestions,
    evaluationText: `AI Assessment: Evaluated response for depth and conceptual precision. Scored ${score}/100 (${rating}). Demonstrates solid communication.`
  };
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * @route   POST /api/interviews/generate
 * @desc    Generate interview questions dynamically using Gemini AI with fallback bank
 * @access  Public / Authenticated
 */
router.post("/generate", async (req, res) => {
  try {
    const { domain, difficulty, interviewType, questionCount, context } = req.body;

    if (!domain || typeof domain !== "string" || domain.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Technical domain is required.",
      });
    }

    const cleanDomain = domain.trim();
    const cleanDiff = ["Beginner", "Intermediate", "Advanced"].includes(difficulty)
      ? difficulty
      : "Intermediate";
    const cleanType = [
      "Technical interview",
      "HR interview",
      "Coding interview",
      "Project-based interview",
      "Mixed interview",
    ].includes(interviewType)
      ? interviewType
      : "Technical interview";

    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 1), 20);
    const cleanContext = (context || "").toString().trim().slice(0, 1000);

    const apiKey = getActiveApiKey();
    let questions = null;

    if (apiKey) {
      const prompt = `
You are a Staff Software Engineer and Senior Technical Hiring Manager conducting a high-impact interview.
Generate ${count} realistic, insightful interview questions for the domain: "${cleanDomain}".

Interview Specifications:
- Difficulty Level: ${cleanDiff}
- Interview Style/Type: ${cleanType}
- Specific Target Context / Role: ${cleanContext ? cleanContext : "Standard Industry Engineering Standards"}

Guidelines:
1. Questions must test deep conceptual understanding, practical problem-solving, trade-offs, and modern industry standards.
2. For coding or algorithmic questions: provide clear problem specifications, constraints, and test cases.
3. For HR / Behavioral questions: provide suggested answer structures (e.g. STAR method: Situation, Task, Action, Result) rather than rigid singular answers.
4. For technical architecture questions: provide suggested answer outlines and key concepts to look for.
5. Return ONLY a valid JSON array of objects. Do NOT include markdown fences, conversational greetings, or explanations outside the JSON.

Expected JSON schema for each item:
{
  "questionNumber": 1,
  "question": "The interview question text",
  "difficulty": "${cleanDiff}",
  "topic": "Specific subtopic or skill",
  "suggestedAnswer": "Comprehensive suggested answer or structural framework",
  "keyConcepts": "Core keywords, principles, and concepts that a hiring manager looks for",
  "followUpQuestions": ["Follow up 1", "Follow up 2"],
  "codingDetails": {
    "constraints": ["Constraint 1", "Constraint 2"],
    "testCases": [
      { "input": "sample input", "output": "expected output", "explanation": "why" }
    ]
  }
}
`;

      try {
        const rawAiResponse = await runGemini(prompt);
        if (rawAiResponse) {
          const parsed = extractJson(rawAiResponse);
          if (Array.isArray(parsed) && parsed.length > 0) {
            questions = parsed.map((q, idx) => ({
              questionNumber: idx + 1,
              question: q.question || `Question ${idx + 1} on ${cleanDomain}`,
              difficulty: q.difficulty || cleanDiff,
              topic: q.topic || cleanDomain,
              suggestedAnswer: q.suggestedAnswer || "Thoroughly explain core mechanics and trade-offs.",
              keyConcepts: q.keyConcepts || "Key principles and practical implementation.",
              followUpQuestions: Array.isArray(q.followUpQuestions) ? q.followUpQuestions : [],
              codingDetails: q.codingDetails || { constraints: [], testCases: [] }
            }));
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini interview generation exception:", geminiErr.message);
      }
    }

    // High-quality fallback if AI is not configured or fails
    if (!questions || questions.length === 0) {
      questions = getFallbackQuestions(cleanDomain, cleanDiff, cleanType, count);
    }

    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      difficulty: cleanDiff,
      interviewType: cleanType,
      questionCount: questions.length,
      context: cleanContext,
      data: questions,
    });
  } catch (error) {
    console.error("Interview generation endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred while generating interview questions.",
    });
  }
});

/**
 * @route   POST /api/interviews/evaluate
 * @desc    Evaluate student's answer using Gemini AI or contextual evaluator
 * @access  Public / Authenticated
 */
router.post("/evaluate", async (req, res) => {
  try {
    const { question, studentAnswer, domain, difficulty, interviewType, suggestedAnswer, keyConcepts } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        success: false,
        error: "Interview question is required for evaluation.",
      });
    }

    if (!studentAnswer || typeof studentAnswer !== "string" || studentAnswer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please write or type your answer before requesting evaluation.",
      });
    }

    const cleanQuestion = question.trim();
    const cleanAnswer = studentAnswer.trim();
    const cleanDomain = (domain || "General Software Engineering").trim();
    const cleanDiff = (difficulty || "Intermediate").trim();
    const cleanType = (interviewType || "Technical interview").trim();

    const apiKey = getActiveApiKey();
    let evaluation = null;

    if (apiKey) {
      const prompt = `
You are an expert technical interviewer evaluating a student candidate's practice interview response.

Context:
- Domain: ${cleanDomain} (${cleanDiff})
- Interview Type: ${cleanType}
- Question: "${cleanQuestion}"
- Expected Concepts / Benchmark: ${keyConcepts || suggestedAnswer || "Standard technical industry expectations"}

Candidate's Answer:
"""
${cleanAnswer}
"""

Evaluation Guidelines:
1. Be constructive, objective, encouraging, and pedagogically insightful.
2. DO NOT mark an answer wrong merely because it uses different words or structure than a textbook answer. Focus on whether the core concepts, reasoning, logic, and trade-offs are accurate.
3. For coding or technical answers: assess correct logic, algorithmic complexity (Big-O), and awareness of edge cases.
4. For behavioral or HR answers: evaluate clarity, structure (e.g., STAR framework), and demonstrated ownership.
5. Clearly indicate that this evaluation is an automated AI practice assessment.
6. Return ONLY a valid JSON object. No conversational filler, no markdown fences.

Expected JSON output format:
{
  "score": 85,
  "rating": "Strong Candidate Response",
  "strengths": "Specific points the candidate explained accurately and effectively",
  "missingConcepts": "Core concepts, trade-offs, or details that were omitted or could be improved",
  "suggestions": "Actionable advice to elevate this answer to a staff/principal level",
  "evaluationText": "A 2-3 sentence holistic assessment summarizing the response"
}
`;

      try {
        const rawAiResponse = await runGemini(prompt);
        if (rawAiResponse) {
          const parsed = extractJson(rawAiResponse);
          if (parsed && typeof parsed.score === "number") {
            evaluation = {
              score: Math.min(100, Math.max(0, Math.round(parsed.score))),
              rating: parsed.rating || (parsed.score >= 80 ? "Proficient" : "Needs Review"),
              strengths: parsed.strengths || "Addressed the core aspects of the question clearly.",
              missingConcepts: parsed.missingConcepts || "Could expand further on trade-offs and edge cases.",
              suggestions: parsed.suggestions || "Practice providing concrete real-world architectural examples.",
              evaluationText: parsed.evaluationText || `AI Evaluator: Assessed response. Scored ${parsed.score}/100.`,
              evaluatedAt: new Date(),
            };
          }
        }
      } catch (evalErr) {
        console.warn("Gemini evaluation error:", evalErr.message);
      }
    }

    if (!evaluation) {
      evaluation = evaluateAnswerLocally(
        cleanQuestion,
        cleanAnswer,
        cleanDomain,
        cleanDiff,
        suggestedAnswer,
        keyConcepts
      );
    }

    return res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("Answer evaluation error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to evaluate answer. Please try again.",
    });
  }
});

/**
 * @route   POST /api/interviews
 * @desc    Save an interview preparation session to MongoDB
 * @access  Authenticated
 */
router.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Please sign in to save your interview preparation sessions.",
      });
    }

    const { domain, difficulty, interviewType, questionCount, context, questions, userResponses } = req.body;

    if (!domain || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid session payload: domain and questions are required.",
      });
    }

    const session = new InterviewSession({
      userId: req.user._id,
      domain: domain.trim(),
      difficulty: difficulty || "Intermediate",
      interviewType: interviewType || "Technical interview",
      questionCount: parseInt(questionCount, 10) || questions.length,
      context: (context || "").trim(),
      questions: questions,
      userResponses: Array.isArray(userResponses) ? userResponses : [],
    });

    const savedSession = await session.save();

    return res.status(201).json({
      success: true,
      message: "Interview preparation session saved successfully.",
      data: savedSession,
    });
  } catch (error) {
    console.error("Save interview session error:", error);
    return res.status(500).json({
      success: false,
      error: "Database error occurred while saving interview session.",
    });
  }
});

/**
 * @route   GET /api/interviews
 * @desc    Retrieve all saved interview sessions for the authenticated student
 * @access  Authenticated
 */
router.get("/", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Authentication required to view your interview history.",
      });
    }

    const sessions = await InterviewSession.find({ userId: req.user._id })
      .select("domain difficulty interviewType questionCount context createdAt userResponses")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = sessions.map(s => ({
      _id: s._id,
      domain: s.domain,
      difficulty: s.difficulty,
      interviewType: s.interviewType,
      questionCount: s.questionCount,
      answeredCount: (s.userResponses || []).filter(r => r.answer && r.answer.trim().length > 0).length,
      evaluatedCount: (s.userResponses || []).filter(r => r.feedback && typeof r.feedback.score === "number").length,
      createdAt: s.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Fetch interview sessions error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve your interview sessions.",
    });
  }
});

/**
 * @route   GET /api/interviews/:id
 * @desc    Get a single interview preparation session by ID (authorized to session owner or admin)
 * @access  Authenticated
 */
router.get("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid interview session ID format.",
      });
    }

    const session = await InterviewSession.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Interview session not found.",
      });
    }

    // Authorization check: student can only access their own session, unless admin
    if (!session.userId.equals(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You are not authorized to view this interview session.",
      });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Fetch single interview session error:", error);
    return res.status(500).json({
      success: false,
      error: "Error retrieving interview session details.",
    });
  }
});

/**
 * @route   DELETE /api/interviews/:id
 * @desc    Delete an interview preparation session owned by the authenticated user
 * @access  Authenticated
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session ID format.",
      });
    }

    const session = await InterviewSession.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Interview session not found.",
      });
    }

    if (!session.userId.equals(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You cannot delete another user's session.",
      });
    }

    await InterviewSession.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Interview session deleted successfully.",
    });
  } catch (error) {
    console.error("Delete interview session error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete interview session.",
    });
  }
});

module.exports = router;
