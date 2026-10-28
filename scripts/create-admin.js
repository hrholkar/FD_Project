#!/usr/bin/env node

/**
 * LearnSmart - Secure Initial Administrator Provisioning Utility
 *
 * Usage:
 *   Interactive prompt:
 *     npm run create-admin
 *     node scripts/create-admin.js
 *
 *   Non-interactive / CI / Flags:
 *     node scripts/create-admin.js --username myadmin --email admin@college.edu --password MySecurePass123!
 *
 *   Help:
 *     node scripts/create-admin.js --help
 */

require("dotenv").config();
const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/profile.js");

const dburl = process.env.ATLAS_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/learnsmart";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "");
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else if (args[i] === "-h") {
      parsed.help = true;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`
LearnSmart - Secure Initial Administrator Provisioning Utility

Usage:
  Interactive:
    npm run create-admin
    node scripts/create-admin.js

  Command-line arguments:
    node scripts/create-admin.js --username <user> --password <pass> [--email <email>]

Options:
  --username   Administrator username (default in interactive mode: admin)
  --email      Administrator email (default: <username>@learnsmart.edu)
  --password   Administrator password (minimum 8 characters)
  --help, -h   Show this help message
`);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let username = args.username;
  let email = args.email;
  let password = args.password;

  if (!username || !password) {
    if (!process.stdin.isTTY && (!username || !password)) {
      console.error("Non-interactive environment detected. Both --username and --password are required.");
      printHelp();
      process.exit(1);
    }

    console.log("\n=======================================================");
    console.log("   LearnSmart — Secure Administrator Provisioning");
    console.log("=======================================================\n");

    if (!username) {
      username = await prompt("Enter administrator username [admin]: ");
      if (!username) username = "admin";
    }

    if (!email) {
      email = await prompt(`Enter administrator email [${username}@learnsmart.edu]: `);
      if (!email) email = `${username}@learnsmart.edu`;
    }

    if (!password) {
      password = await prompt("Enter secure password (min 8 characters): ");
    }
  }

  if (!username || username.trim().length === 0) {
    console.error("Error: Administrator username is required.");
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("Error: Administrator password must be at least 8 characters long.");
    process.exit(1);
  }

  username = username.trim();
  email = (email || `${username}@learnsmart.edu`).trim();

  try {
    console.log("\nConnecting to database...");
    await mongoose.connect(dburl);
    console.log("Database connection established.");

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      console.log(`User '${username}' already exists. Updating administrator privileges...`);
      existingUser.isAdmin = true;
      if (email) existingUser.email = email;

      if (typeof existingUser.setPassword === "function") {
        await new Promise((resolve, reject) => {
          existingUser.setPassword(password, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }
      await existingUser.save();
      console.log(`Administrator privileges and credentials updated successfully for '${username}'.`);
    } else {
      const newAdmin = new User({
        username,
        email,
        educationLevel: "Postgraduate Level",
        isAdmin: true,
      });

      await User.register(newAdmin, password);
      console.log(`Administrator account '${username}' created successfully.`);
    }

    console.log("\nSetup complete. You may now log in securely at /login.\n");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Failed to provision administrator:", err.message);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

run();
