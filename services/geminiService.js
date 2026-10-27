const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

/**
 * Dynamic Gemini API key resolver (checks .env and environment on each call)
 */
function getActiveApiKey() {
  try {
    require("dotenv").config();
  } catch (_) {}
  const rawApiKey =
    process.env.api_Key ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.API_KEY ||
    "";
  const key =
    typeof rawApiKey === "string"
      ? rawApiKey.trim().replace(/^["']|["']$/g, "")
      : "";
  return key && key !== "your_gemini_api_key_here" ? key : "";
}

/**
 * Generate AI Response with multi-model fallback across Gemini model generations
 */
async function runGemini(promptMsg) {
  const currentKey = getActiveApiKey();
  if (!currentKey) {
    return null;
  }

  const candidateModels = [
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
  ];
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

/**
 * Safely parse JSON from LLM text responses, handling codeblocks and markdown
 */
function extractJson(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  let clean = rawText.trim();
  clean = clean.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch (_) {}

  // Attempt array extraction
  const arrStart = clean.indexOf("[");
  const arrEnd = clean.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(clean.substring(arrStart, arrEnd + 1));
    } catch (_) {}
  }

  // Attempt object extraction
  const objStart = clean.indexOf("{");
  const objEnd = clean.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(clean.substring(objStart, objEnd + 1));
    } catch (_) {}
  }

  return null;
}

module.exports = {
  getActiveApiKey,
  runGemini,
  extractJson,
};
