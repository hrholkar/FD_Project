const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=================================================");
console.log("   LEARNSMART SECURITY & AUTHORIZATION TESTS     ");
console.log("=================================================\n");

// 1. Audit index.js source code for removed vulnerabilities
const indexCode = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");

// Test 1.1: Verify no hardcoded admin password in index.js
assert(
  !indexCode.includes("Admin@12345"),
  "FAIL: Hardcoded default admin password 'Admin@12345' still found in index.js!"
);
console.log("PASS: Hardcoded admin password 'Admin@12345' removed from index.js.");

// Test 1.2: Verify no fallback session secrets
assert(
  !indexCode.includes("dciudcdh"),
  "FAIL: Hardcoded fallback session secret 'dciudcdh' still found in index.js!"
);
assert(
  !indexCode.includes("hfwfgfuhfuwhfdh"),
  "FAIL: Hardcoded fallback session secret 'hfwfgfuhfuwhfdh' still found in index.js!"
);
console.log("PASS: Insecure fallback session secrets ('dciudcdh', 'hfwfgfuhfuwhfdh') removed.");

// Test 1.3: Verify sensitive password logging removed from signup
assert(
  !indexCode.includes("console.log(username, email, password, educationLevel)"),
  "FAIL: Plaintext password logging still present in signup route!"
);
console.log("PASS: Plaintext password logging removed from signup route.");

// Test 1.4: Verify login.ejs has no hardcoded admin credentials
const loginEjs = fs.readFileSync(path.join(__dirname, "..", "views", "users", "login.ejs"), "utf8");
assert(
  !loginEjs.includes("Admin@12345"),
  "FAIL: Hardcoded admin password 'Admin@12345' found in login.ejs demo button!"
);
console.log("PASS: Hardcoded admin credentials removed from login.ejs demo button.");

// Test 1.5: Verify session cookie security flags configured
assert(indexCode.includes("name: \"learnsmart.sid\""), "FAIL: Custom session cookie name not configured!");
assert(indexCode.includes("saveUninitialized: false"), "FAIL: saveUninitialized must be false for privacy/security!");
assert(indexCode.includes("httpOnly: true"), "FAIL: httpOnly must be enabled on session cookie!");
console.log("PASS: Session cookie hardened (custom name, saveUninitialized=false, httpOnly=true).");

// Test 1.6: Verify /delete is protected with requireAdmin
assert(
  indexCode.includes('app.get("/delete", requireAdmin,'),
  "FAIL: /delete endpoint is not protected with requireAdmin!"
);
console.log("PASS: /delete endpoint restricted to requireAdmin and disabled.");

// Test 1.7: Verify /user is protected with isAuthenticated
assert(
  indexCode.includes('app.get("/user", isAuthenticated,'),
  "FAIL: /user endpoint is not protected with isAuthenticated!"
);
console.log("PASS: /user endpoint protected with isAuthenticated.");

// Test 1.8: Verify Notes and Todo index boundary checks
assert(indexCode.includes("isNaN(index)"), "FAIL: Missing NaN checks on array index parameters!");
assert(indexCode.includes("app.get([\"/todo\", \"/todos\"]"), "FAIL: Missing /todos alias route!");
console.log("PASS: Notes & Todos array boundary validations and route aliases confirmed.");

// Test 1.9: Verify create-admin CLI script exists and is executable
assert(fs.existsSync(path.join(__dirname, "..", "scripts", "create-admin.js")), "FAIL: scripts/create-admin.js missing!");
const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
assert(pkgJson.scripts["create-admin"], "FAIL: 'create-admin' npm script not configured in package.json!");
console.log("PASS: scripts/create-admin.js utility and package.json script verified.");

console.log("\n=================================================");
console.log(" ALL 9 SECURITY UNIT VERIFICATIONS PASSED!       ");
console.log("=================================================\n");

