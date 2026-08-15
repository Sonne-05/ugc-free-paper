const fs = require("fs");
const path = require("path");
const url = require("url");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const readline = require("readline");

// Helper for interactive terminal input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
}

// Utility function to parse answer key PDF text into a mapping object { [qIndex]: correctOption }
function parseAnswerKey(text) {
  const mapping = {};
  const lines = text.split("\n");

  for (const line of lines) {
    let cleanLine = line.trim();
    if (!cleanLine) continue;

    // Apply pre-processing string replacements for common OCR typos
    cleanLine = cleanLine
      .replace(/\s*\|\s*/g, "1 ") // '8 | B' -> '81 B' (replace space-pipe-space with '1 ')
      .replace(/\]/g, "1") // '4]' -> '41', '9]' -> '91'
      .replace(/\bT(\d+)\b/g, "7$1") // 'T7' -> '77'
      .replace(/\bl(\d+)\b/g, "1$1") // 'l5' -> '15'
      .replace(/\bI(\d+)\b/g, "1$1") // 'I5' -> '15'
      .replace(/\bl\b/g, "1") // isolated 'l' -> '1'
      .replace(/\bI\b/g, "1") // isolated 'I' -> '1'
      .replace(/\big\b/g, "11"); // 'ig' -> '11'

    // Split by whitespace, comma, tab, semicolon, vertical bar
    const tokens = cleanLine.split(/[\s,;|]+/);

    // Check if there are any words with length >= 3 to avoid headers/footers
    let hasLongWord = false;
    for (const t of tokens) {
      const lower = t.toLowerCase();
      // Allow 'dropped', 'drop', 'null' as valid answer key tokens
      if (["dropped", "drop", "null"].includes(lower)) {
        continue;
      }
      if (/[a-zA-Z]{3,}/.test(t)) {
        hasLongWord = true;
        break;
      }
    }
    if (hasLongWord) continue;

    // Clean tokens: remove Q/q from start, dots/colons from end
    const cleanTokens = tokens
      .map((t) => {
        return t.replace(/^[Qq]/, "").replace(/[.:]$/, "").trim();
      })
      .filter(Boolean);

    const optionMap = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      dropped: 0,
      drop: 0,
      null: 0,
      0: 0,
    };

    for (let i = 0; i < cleanTokens.length - 1; i += 2) {
      const qStr = cleanTokens[i];
      const aStr = cleanTokens[i + 1];

      const q = parseInt(qStr, 10);
      const aLower = aStr.toLowerCase();
      const a = optionMap[aLower];

      if (!isNaN(q) && q >= 1 && q <= 9999999 && a !== undefined) {
        mapping[q] = a;
        mapping[String(q)] = a;
      }
    }
  }

  return mapping;
}

// 1. Load your env file manually to avoid framework process.env overrides
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(".env")));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

// 2. Define Mongoose Schemas (matching your backend)
const QuestionSchema = new mongoose.Schema(
  {
    setId: mongoose.Schema.Types.ObjectId,
    qIndex: Number,
    ntaQuestionId: String,
    unit: String,
    type: {
      type: String,
      enum: [
        "mcq",
        "assertion-reason",
        "match-column",
        "comprehension",
        "multiple-statement",
        "di",
      ],
    },
    text: String,
    options: [String],
    statements: [String],
    correct: Number,
    explanation: String,
    assertion: String,
    reason: String,
    list1: [String],
    list2: [String],
    list1Header: String,
    list2Header: String,
    passage: String,
  },
  { collection: "questions" },
);

const PyqSetSchema = new mongoose.Schema(
  {
    title: String,
    paperType: {
      type: String,
      enum: ["Paper I", "Paper II"],
      default: "Paper I",
    },
    questionsLoaded: Number,
  },
  { collection: "pyqsets" },
);

const Question = mongoose.model("Question", QuestionSchema);
const PyqSet = mongoose.model("PyqSet", PyqSetSchema);

// 3. Setup per-key rate limiter
const apiKeys = (process.env.GEMINI_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

// Each key belongs to a DIFFERENT Google project, so each has its own independent 20 RPM quota.
const PER_KEY_RPM = 20;

// Per-key sliding window: keyHistory[i] = array of timestamps for key i
const keyHistory = apiKeys.map(() => []);

// Per-key cooldown: when Google's 429 includes a retryDelay, we set a cooldown for THAT key only.
// Other keys remain freely usable during this time.
const keyCooldownUntil = apiKeys.map(() => 0);

function estimateRequestTokens() {
  // Estimated tokens based on average image + prompt + output
  return 4500;
}

let currentKeyIndex = 0;

// Returns index of the best available key right now using Round-Robin.
// Skips keys that are in a retryDelay cooldown or at RPM capacity.
// If ALL keys are unavailable, waits for the earliest one to free up, then retries.
async function getAvailableKeyIndex() {
  const now = Date.now();
  const windowMs = 60000;

  // Purge expired sliding window timestamps for every key
  for (let i = 0; i < keyHistory.length; i++) {
    keyHistory[i] = keyHistory[i].filter((ts) => now - ts < windowMs);
  }

  // True Round-Robin across all 21 keys:
  // Each page moves to the next key (Key 1 -> Key 2 -> ... -> Key 21 -> Key 1)
  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const idx = (currentKeyIndex + attempt) % apiKeys.length;
    if (keyCooldownUntil[idx] <= now && keyHistory[idx].length < PER_KEY_RPM) {
      currentKeyIndex = (idx + 1) % apiKeys.length;
      return idx;
    }
  }

  // All keys are either in cooldown or at RPM cap.
  // Find the earliest moment ANY key becomes available.
  let earliestAvailable = Infinity;
  for (let i = 0; i < keyHistory.length; i++) {
    if (keyCooldownUntil[i] > now) {
      earliestAvailable = Math.min(earliestAvailable, keyCooldownUntil[i]);
    }
    if (keyHistory[i].length >= PER_KEY_RPM && keyHistory[i].length > 0) {
      const rpmFreeAt = keyHistory[i][0] + windowMs;
      earliestAvailable = Math.min(earliestAvailable, rpmFreeAt);
    }
  }

  const waitMs = Math.max(earliestAvailable - Date.now() + 500, 1000);
  console.log(
    `[Rate Limiter] All ${apiKeys.length} keys cooling down. Waiting ${(waitMs / 1000).toFixed(1)}s for next key...`,
  );
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  return getAvailableKeyIndex();
}

// Record a successful request against the chosen key index
function recordRequest(keyIndex) {
  keyHistory[keyIndex].push(Date.now());
}

async function rateLimitCheck() {
  // Compatibility shim — actual key selection now happens in getAvailableKeyIndex()
  // This is kept so existing callAIChatForOcrPage structure still works
}

function cleanJsonString(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();
  }
  try {
    cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
    });
  } catch (e) {}
  return cleaned;
}

// Helper: Sanitize Arabic text for Sindhi Devanagari mode
function sanitizeSindhiOutput(questions, importLanguage) {
  if (importLanguage && importLanguage.includes("Sindhi")) {
    const arabicRegex =
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const cleanField = (val) => {
      if (typeof val === "string") {
        return val
          .replace(arabicRegex, "")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
      if (Array.isArray(val)) {
        return val.map((item) =>
          typeof item === "string"
            ? item
                .replace(arabicRegex, "")
                .replace(/[ \t]+\n/g, "\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim()
            : item,
        );
      }
      return val;
    };

    return questions.map((q) => ({
      ...q,
      text: cleanField(q.text),
      options: cleanField(q.options),
      statements: cleanField(q.statements),
      list1: cleanField(q.list1),
      list2: cleanField(q.list2),
      assertion: cleanField(q.assertion),
      reason: cleanField(q.reason),
      passage: cleanField(q.passage),
      explanation: cleanField(q.explanation),
    }));
  }
  return questions;
}

// Helper: Fallback to Groq Llama 3.2 Vision (Instant, Zero Quota Starvation)
async function callGroqVisionForOcrPage(base64Image, pageNum, textPrompt, importLanguage) {
  const groqKey = (process.env.GROQ_API_KEY || "").split(",")[0]?.trim();
  if (!groqKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: textPrompt },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${base64Image}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(cleanJsonString(content));
    let questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
    return sanitizeSindhiOutput(questions, importLanguage);
  } catch (err) {
    return null;
  }
}



// 4. API Call to Gemini
async function callAIChatForOcrPage(
  base64Image,
  pageNum,
  isPaperII,
  importLanguage,
  expectedCount = 0,
  retryCount = 0,
  ocrRetryCount = 0,
) {
  const keyIndex = await getAvailableKeyIndex();
  const apiKey = apiKeys[keyIndex];
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const urlEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const textPrompt = `You are an expert UGC NET ${isPaperII ? "Paper II" : "Paper I"} exam parser.
Look at the provided PDF page image and extract ALL multiple choice questions visible on it from top to bottom.

CRITICAL THOROUGHNESS RULE:
- Scan the ENTIRE image from top to bottom, especially the very bottom margin. Do NOT skip any question!
- ${expectedCount > 0 ? `Visual pre-scan detected approximately ${expectedCount} questions on this page. Make sure you extract ALL ${expectedCount} questions!` : "Extract EVERY SINGLE QUESTION visible on the page (usually 4 to 6 questions)."}
- If a question starts near the top or near the bottom margin, extract it!

${
  importLanguage === "English"
    ? `⚠️  CRITICAL LANGUAGE ENFORCEMENT — ENGLISH ONLY MODE ACTIVE:
This PDF contains BOTH English (Roman/Latin script) and Hindi/Sindhi text.
You MUST extract ONLY the ENGLISH text. Any Devanagari or Perso-Arabic/Urdu characters in your output = TASK FAILURE.
Every single field (text, options, statements, list items, assertion, reason) must be in English only.
`
    : ""
}
${
  importLanguage === "Sindhi" || importLanguage.includes("Sindhi")
    ? `⚠️  CRITICAL SINDHI DEVANAGARI SCRIPT ENFORCEMENT ACTIVE:
This PDF contains Sindhi questions printed in BOTH Devanagari script (e.g. "'ईजाद' लफ़्ज़ जी माना -") AND Perso-Arabic / Urdu script (e.g. "'پھريون ئي جھگڙو' ڪھاڻي آھي :").
You MUST extract ONLY the DEVANAGARI script version of Sindhi text.
DO NOT extract any Perso-Arabic script, Urdu script, or Arabic-alphabet text (e.g. پھريون, جھگڙو, ڪھاڻي, گوورڊن, etc.).
EVERY SINGLE FIELD (text, options, statements, list items, assertion, reason, explanation) MUST BE WRITTEN IN DEVANAGARI SCRIPT SINDHI ONLY!
Any Perso-Arabic or Urdu script characters in your JSON output = STRICT TASK FAILURE.
`
    : ""
}
Target Language Rule:
You MUST extract the questions and option texts in the following language/format: "${importLanguage}".
- If "English" is selected: Extract ONLY the English Roman-script text. Skip/ignore ALL Hindi/Sindhi text completely, even if it appears right next to the English text on the same line.
- If "Hindi" is selected: Extract only the Hindi version of the questions (in Devanagari script).
- If "Sindhi" is selected: Extract ONLY the Sindhi text written in DEVANAGARI script (e.g. "'ईजाद' लफ़्ज़ जी माना -", "(1) ग़लत", "(2) ठाहूको", "(3) सही", "(4) नईं शइ ठहणु"). IGNORE and SKIP completely all Perso-Arabic / Urdu script text (right-to-left Arabic script) and English text.
- If "Bilingual (English & Hindi)" is selected: Keep the question text bilingual (extract both the English and Hindi versions, showing the English text first and Hindi text below it). Do the same for option values (English option first, Hindi translation below it).
- If "Bilingual (English & Sindhi)" is selected: Keep the question text bilingual (extract both the English text and the Sindhi DEVANAGARI script version). Do NOT include any Perso-Arabic/Urdu script text. Do the same for option values (English option first, Sindhi translation below it).

Instructions:
1. Extract the question text exactly as instructed in the Target Language Rule above. Keep punctuation, spacing, and grammar identical to the visual text. Filter out system headers/footers or pagination labels. If a question started on the previous page and finishes at the top of this page (e.g. table continuation or options (A), (B), (C), (D) at top of page), extract it as a complete question using its question number.
2. Extract exactly 4 options matching the Target Language Rule. Options may be labeled (1), (2), (3), (4) or (A), (B), (C), (D) or A., B., C., D. Always extract the 4 options in order as the 4 items in the "options" array (where item 0 = Option 1/A, item 1 = Option 2/B, item 2 = Option 3/C, item 3 = Option 4/D).
3. Identify the question number/index (the small serial number like 1, 2, 3...50 or 1..100). It can appear in ANY of these formats:
   - "3) Definite procedures..." or "3 ) Definite..." → serial=3 (question number followed by parenthesis)
   - "Sl. No.1" or "Sl. No. 1" followed by "QBID:1101001" → serial=1, bank ID=1101001
   - "Sl. No.1\nQBID:1521001" — here 1 is the question number; 1521001 is the bank ID
   - "[Question ID = 1408][Question Description = 103_71_SCY_SEP22_S2_Q03]" → extract "1408" into "ntaQuestionId", filter out Question Description text
   - "[Question ID = 1407]" or "Question ID = 1407" → extract "1407" into "ntaQuestionId"
   - "Objective Question  1   2051" — here 1 is the serial number; 2051 is the Client Question ID
   - "Objective Question  15   2065" — serial=15, clientID=2065
   - "Client Question  ID   Question Body..." is the column header — ignore it
   - "Question Number : 1 Question Id : 5330728243" — here 1 is the question number; 5330728243 is the NTA bank ID
   Use the small sequential number (1, 2, 3...) as "qIndex". Extract the longer bank/client/NTA ID into the "ntaQuestionId" field:
   - From "QBID:1101001" → ntaQuestionId = "1101001"
   - From "[Question ID = 1408]" → ntaQuestionId = "1408"
   - From "Objective Question X   ClientID" → ntaQuestionId = the 4-digit ClientID (e.g. "2051")
   - From "Question Id : 5330728243" → ntaQuestionId = "5330728243"
   - From any other "Question Id : X" or "NTA Question ID : X" → ntaQuestionId = that number
   Note: Filter out metadata footers like "[Question Description = ...]", "[Option ID = ...]", "1. 1 [Option ID = 5629]" — extract ONLY the true question text and 4 option texts!
4. Map the correct option index (1, 2, 3, or 4) by solving the question or using official key inputs.
5. Determine the question type:
    - 'mcq': Standard single choice question with 4 options.
    - 'assertion-reason': Question containing SPECIFICALLY the words "Assertion (A)" (or "Assertion A") and "Reason (R)" (or "Reason R"). You MUST extract the assertion text into the "assertion" field and the reason text into the "reason" field.
    - 'match-column': Question containing matching lists ("List I" and "List II" or "सूची I" and "सूची II"). You MUST extract and populate "list1", "list2", "list1Header", and "list2Header" fields. The "list1Header" and "list2Header" should be the subtitles/headers of the lists (e.g. 'Concept', 'Description').
    - 'multiple-statement': Question containing multiple statements (e.g., points labeled A, B, C, D, E or (A), (B), (C), (D), (E) or I, II, III, IV, V) followed by a set of option combinations (e.g., "(1) A and C only", "(2) D and E only", "(3) B and C only", "(4) B and D only"). CRITICAL: If a question has a list of items labeled with letters/numbers AND is followed by combination options (labeled 1, 2, 3, 4 or (1), (2), (3), (4)), you MUST classify this as 'multiple-statement' (NOT 'mcq'). You MUST extract the statements (A, B, C, D, E) into the "statements" array, and extract the combination options (1, 2, 3, 4) as the 4 items in the "options" array. Do NOT include the statements (A, B, C, D, E) inside the "text" or "options" fields.
    - 'comprehension': Question based on a shared reading passage. You MUST extract the passage text into the "passage" field. All questions belonging to the same passage must have the exact same "passage" content.
    - 'di': Data Interpretation question based on a shared table, graph, or data description. You MUST extract the data description and format the data table as a clean Markdown table in the "passage" field. All questions belonging to the same DI block must have the exact same "passage" content.
6. Set the 'unit' property to an empty string "".
7. Generate a detailed explanation:
    - If the Target Language is "Hindi" or contains "Hindi" (e.g. Bilingual (English & Hindi)): You MUST generate the explanation entirely in Hindi (in Devanagari script).
    - If the Target Language is "Sindhi" or contains "Sindhi" (e.g. Bilingual (English & Sindhi)): You MUST generate the explanation entirely in Sindhi using DEVANAGARI script ONLY (do NOT use Perso-Arabic/Urdu script).
    - Otherwise, generate the explanation in English.
8. Output ONLY a JSON object matching the following schema:

Schema:
{
  "questions": [
    {
      "qIndex": number,
      "ntaQuestionId": "string (e.g. 926341 or empty string if not visible)",
      "unit": "",
      "type": "mcq" | "assertion-reason" | "match-column" | "comprehension" | "multiple-statement" | "di",
      "text": "Clean question text in target script...",
      "passage": "Passage or table details here (only for comprehension or di types)",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "statements": ["Statement A", "Statement B", ...],
      "correct": number,
      "assertion": "Assertion text",
      "reason": "Reason text",
      "list1": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "list2": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "list1Header": "Header 1",
      "list2Header": "Header 2",
      "explanation": "Detailed explanation in target language..."
    }
  ]
}
`;

  // 1. Try Groq Vision first as Primary
  try {
    const groqResult = await callGroqVisionForOcrPage(
      base64Image,
      pageNum,
      textPrompt,
      importLanguage,
    );
    if (groqResult && groqResult.length > 0) {
      console.log(
        `✨ [Groq Vision Primary] Page ${pageNum}: Successfully extracted ${groqResult.length} questions!`,
      );
      return groqResult;
    }
  } catch (groqErr) {
    console.warn(`[Groq Vision Primary]: ${groqErr.message}. Falling back to Gemini...`);
  }

  // 2. Fallback to Gemini Vision
  const geminiModels = [
    process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  for (const modelName of geminiModels) {
    const urlEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(urlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: textPrompt },
                { inlineData: { mimeType: "image/png", data: base64Image } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();

        if (response.status === 503 || response.status === 404 || (response.status === 400 && errText.includes('models/'))) {
          console.warn(`[AI OCR] Key #${keyIndex + 1} ${response.status} on ${modelName}. Trying next Gemini model in cascade...`);
          continue;
        }

        // If Gemini hits 429, cool key and switch
        if (response.status === 429) {
          const retryDelayMatch = errText.match(/"retryDelay"\s*:\s*"(\d+)s"/);
          const retryDelaySecs = retryDelayMatch
            ? parseInt(retryDelayMatch[1])
            : 30;

          keyCooldownUntil[keyIndex] =
            Date.now() + retryDelaySecs * 1000 + 2000;

          if (retryCount < 30) {
            console.warn(
              `[AI OCR] Key #${keyIndex + 1} hit quota (${response.status}) on Page ${pageNum}. Cooling for ${retryDelaySecs}s. Switching to next Gemini key...`,
            );
            return callAIChatForOcrPage(
              base64Image,
              pageNum,
              isPaperII,
              importLanguage,
              expectedCount,
              retryCount + 1,
              ocrRetryCount,
            );
          }
        }
        console.warn(`[Gemini OCR Error] ${modelName} ${response.status}: ${errText.substring(0, 150)}`);
        continue;
      }

      recordRequest(keyIndex);

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const cleaned = cleanJsonString(rawText);

      try {
        const parsed = JSON.parse(cleaned);
        let resQuestions =
          parsed.questions || (Array.isArray(parsed) ? parsed : []);
        return sanitizeSindhiOutput(resQuestions, importLanguage);
      } catch (parseErr) {
        console.warn(`JSON parse error on ${modelName}: ${parseErr.message}`);
      }
    } catch (fetchErr) {
      console.warn(`Network error on ${modelName}: ${fetchErr.message}`);
    }
  }

  if (retryCount < 30) {
    console.warn(
      `[AI OCR] All Gemini models exhausted on Page ${pageNum}. Cooling 3s before retrying (${retryCount + 1}/30)...`,
    );
    await new Promise((r) => setTimeout(r, 3000));
    return callAIChatForOcrPage(
      base64Image,
      pageNum,
      isPaperII,
      importLanguage,
      expectedCount,
      retryCount + 1,
      ocrRetryCount,
    );
  }

  throw new Error(`All Gemini models failed on Page ${pageNum}`);
}

// 5. Main execution
async function main() {
  console.log("=== Interactive Local OCR Importer ===");

  const PDF_PATH = await askQuestion(
    "Enter the absolute path to your PDF file: ",
  );
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Error: PDF file does not exist at path: "${PDF_PATH}"`);
    process.exit(1);
  }

  const TARGET_SET_ID = await askQuestion("Enter the Target PyqSet ID: ");
  if (!mongoose.Types.ObjectId.isValid(TARGET_SET_ID)) {
    console.error("Error: Invalid MongoDB Set ID.");
    process.exit(1);
  }

  const LANGUAGE = await askQuestion(
    "Enter Target Language (e.g. English, Hindi, Sindhi): ",
  );

  const ANSWER_KEY_PATH = await askQuestion(
    "Enter the absolute path to your Answer Key PDF file (optional, press Enter to skip): ",
  );
  if (ANSWER_KEY_PATH && !fs.existsSync(ANSWER_KEY_PATH)) {
    console.error(
      `Error: Answer Key PDF file does not exist at path: "${ANSWER_KEY_PATH}"`,
    );
    process.exit(1);
  }

  try {
    console.log("\nConnecting to live MongoDB database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully!");

    // Get paperType from MongoDB to determine if it's Paper II or Paper I
    const targetSet = await PyqSet.findById(TARGET_SET_ID);
    if (!targetSet) {
      throw new Error(`Target Set not found in database: ${TARGET_SET_ID}`);
    }
    const isPaperII = targetSet.paperType === "Paper II";
    console.log(
      `Target Set Title: "${targetSet.title}" (Paper Type: ${targetSet.paperType || "Paper I"})`,
    );

    // Resolve dependencies locally
    const canvasPkg = require("@napi-rs/canvas");
    const { createCanvas } = canvasPkg;

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const workerPath = path.resolve(
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    );
    pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;

    // Load and parse answer key PDF if provided
    let answerKeyMap = null;
    if (ANSWER_KEY_PATH) {
      console.log("Loading Answer Key PDF document...");
      const keyData = new Uint8Array(fs.readFileSync(ANSWER_KEY_PATH));
      const keyPdfDoc = await pdfjs.getDocument({ data: keyData }).promise;
      let keyText = "";
      for (let pageNum = 1; pageNum <= keyPdfDoc.numPages; pageNum++) {
        const page = await keyPdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        keyText += pageText + "\n";
      }
      answerKeyMap = parseAnswerKey(keyText);
      const mappedCount = Object.keys(answerKeyMap).length;
      console.log(`Successfully mapped ${mappedCount} answers from key.`);
      if (mappedCount === 0) {
        console.warn(
          "⚠️  Warning: No valid question/answer mappings could be parsed from the Answer Key PDF.",
        );
      }
    }

    console.log("Loading local PDF document...");
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const pdfDoc = await pdfjs.getDocument({ data }).promise;
    const totalPages = pdfDoc.numPages;
    console.log(`PDF Loaded. Total pages: ${totalPages}. Scanning pages...`);

    // Detect if this is a bilingual (English + Hindi) PDF — each question appears twice
    // Sample first few pages to check for Hindi characters
    let isBilingualPdf = false;
    for (
      let samplePage = 1;
      samplePage <= Math.min(5, totalPages);
      samplePage++
    ) {
      const sp = await pdfDoc.getPage(samplePage);
      const stc = await sp.getTextContent();
      const sampleText = stc.items.map((i) => i.str).join(" ");
      if (/[\u0900-\u097F]/.test(sampleText)) {
        // Devanagari Unicode range
        isBilingualPdf = true;
        break;
      }
    }
    if (isBilingualPdf) {
      console.log(
        `📖 Detected bilingual PDF (English + Hindi). Each question appears in both languages.`,
      );
    }

    const ocrPages = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      const hasHeader =
        /Question/i.test(pageText) ||
        /Q\s*[\.\:\d]/i.test(pageText) ||
        /Sl\s*\.?\s*No/i.test(pageText) ||
        /QBID/i.test(pageText) ||
        /Question\s+ID\s*=/i.test(pageText) ||
        /Question\s+Description\s*=/i.test(pageText) ||
        /Option\s+ID\s*=/i.test(pageText) ||
        /Objective\s+Question/i.test(pageText) ||
        /Client\s+Question\s+ID/i.test(pageText) ||
        /\b\d{1,3}\s*\)\s+/i.test(pageText) ||
        /Option/i.test(pageText) ||
        /Answer/i.test(pageText) ||
        /Statement/i.test(pageText) ||
        /List/i.test(pageText) ||
        /प्रश्न/i.test(pageText) ||
        /विकल्प/i.test(pageText) ||
        pageText.trim().length > 80;

      // Collect all candidate serial numbers from explicit question-serial markers ONLY
      const serialPatterns = [
        // "Sl. No. X" or "Sl. No.X"
        /Sl\.?\s*No\.?\s*(\d{1,3})\b/gi,
        // "Question Number : X"
        /Question\s+Number\s*[:\.]?\s*(\d{1,3})\b/gi,
        // "QBID: X"
        /QBID\s*[:\.]?\s*(\d+)/gi,
        // "Q.X" or "Q:X" short form
        /\bQ\s*[\.:](\d{1,3})\b/gi,
        // "[Question ID = X]"
        /\[?\s*Question\s+ID\s*=\s*(\d+)\b/gi,
        // "Client Question ID X"
        /Client\s+Question\s+ID\s+(\d+)\b/gi,
        // "Objective Question X"
        /Objective\s+Question\s+(\d{1,3})\b/gi,
      ];

      const qNumMatches = [];
      for (const pat of serialPatterns) {
        for (const m of pageText.matchAll(pat)) {
          const n = parseInt(m[1], 10);
          if (n >= 1 && n <= 300) qNumMatches.push(n);
        }
      }

      const uniqueQNums = Array.from(new Set(qNumMatches));
      let expectedCount = uniqueQNums.length;
      if (isBilingualPdf && expectedCount > 0) {
        expectedCount = Math.ceil(expectedCount / 2);
      }
      const pageSlNos = isBilingualPdf
        ? uniqueQNums.slice(0, Math.ceil(uniqueQNums.length / 2))
        : uniqueQNums;
      if (hasHeader) ocrPages.push({ pageNum, page, expectedCount, pageSlNos });
    }
    console.log(`Pre-scan found ${ocrPages.length} question-bearing pages.`);

    if (ocrPages.length === 0) {
      console.log(
        "\n⚠️  No text-bearing pages found. This PDF appears to be a scanned (image-only) document.",
      );
      const answer = await askQuestion(
        "Would you like to force-process all pages instead? (y/n): ",
      );
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        console.log(`Adding all ${totalPages} pages for OCR processing...`);
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          ocrPages.push({ pageNum, page, expectedCount: 0 });
        }
      }
    }

    // Checkpoint File Setup
    const checkpointFilePath = path.resolve(`checkpoint_${TARGET_SET_ID}.json`);
    let processedPages = new Set();
    let parsedQuestions = [];

    if (fs.existsSync(checkpointFilePath)) {
      try {
        const rawCheckpoint = fs.readFileSync(checkpointFilePath, "utf8");
        const checkpointData = JSON.parse(rawCheckpoint);
        if (checkpointData && checkpointData.setId === TARGET_SET_ID) {
          processedPages = new Set(checkpointData.processedPages || []);
          parsedQuestions = checkpointData.parsedQuestions || [];
          console.log(
            `\n📌 Found existing checkpoint file: "${checkpointFilePath}"`,
          );
          console.log(
            `📌 Resuming import! Already processed ${processedPages.size} pages (${parsedQuestions.length} questions loaded from checkpoint).`,
          );
        }
      } catch (cpErr) {
        console.warn(
          "⚠️  Warning: Could not parse existing checkpoint file. Starting fresh.",
          cpErr.message,
        );
      }
    }

    const pendingPages = ocrPages.filter((p) => !processedPages.has(p.pageNum));
    console.log(`\n⚡ Processing ${pendingPages.length} remaining pages in parallel batches of 5 (using 21 Gemini keys in pool)...`);

    const CONCURRENCY = 5;
    for (let i = 0; i < pendingPages.length; i += CONCURRENCY) {
      const batch = pendingPages.slice(i, i + CONCURRENCY);
      const batchPageNums = batch.map((p) => p.pageNum).join(", ");
      console.log(`\n🚀 [Parallel Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(pendingPages.length / CONCURRENCY)}] Processing Pages [${batchPageNums}] concurrently...`);

      await Promise.all(
        batch.map(async (pageObj) => {
          const { pageNum, page, expectedCount, pageSlNos = [] } = pageObj;

          // Render page to canvas with higher resolution (2.0x scale)
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext("2d");
          await page.render({ canvasContext: context, viewport }).promise;
          const imgBuffer = canvas.toBuffer("image/png");
          const base64Image = imgBuffer.toString("base64");

          let pageQuestions = [];
          try {
            pageQuestions = await callAIChatForOcrPage(
              base64Image,
              pageNum,
              isPaperII,
              LANGUAGE,
              expectedCount || 0,
            );
          } catch (err) {
            console.error(
              `\n❌ Error: Page ${pageNum} failed to process:`,
              err.message,
            );
            return;
          }

          // PDF Sl. No. Override
          if (
            Array.isArray(pageSlNos) &&
            pageSlNos.length > 0 &&
            pageQuestions.length > 0
          ) {
            const sorted = [...pageQuestions].sort((a, b) => {
              const ai = parseInt(
                String(a.qIndex || "0").match(/\d+/)?.[0] || "0",
                10,
              );
              const bi = parseInt(
                String(b.qIndex || "0").match(/\d+/)?.[0] || "0",
                10,
              );
              return ai - bi;
            });
            sorted.forEach((q, idx) => {
              if (idx < pageSlNos.length) {
                q.qIndex = pageSlNos[idx];
              }
            });
            pageQuestions.splice(0, pageQuestions.length, ...sorted);
          }

          pageQuestions.forEach((q) => {
            let rawStr = String(q.qIndex || "").trim();
            let matchDigits = rawStr.match(/\d+/);
            let pdfQNum = matchDigits ? parseInt(matchDigits[0], 10) : NaN;

            let ntaId = q.ntaQuestionId || "";
            if (!isNaN(pdfQNum) && pdfQNum >= 1000 && !ntaId) {
              ntaId = String(pdfQNum);
              pdfQNum = NaN;
            }

            let updatedQ = {
              ...q,
              qIndex: pdfQNum,
              pdfQNum: pdfQNum,
              ntaQuestionId: ntaId,
              setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
              _arrivalIndex: parsedQuestions.length,
            };

            if (answerKeyMap) {
              let correctAns = undefined;
              if (ntaId && answerKeyMap[ntaId] !== undefined) {
                correctAns = answerKeyMap[ntaId];
              } else if (!isNaN(pdfQNum) && answerKeyMap[pdfQNum] !== undefined) {
                correctAns = answerKeyMap[pdfQNum];
              }
              if (correctAns !== undefined) {
                updatedQ.correct = correctAns;
              }
            }

            parsedQuestions.push(updatedQ);
          });

          processedPages.add(pageNum);
          console.log(
            `  ✅ Page ${pageNum} processed (${pageQuestions.length} Qs extracted).`,
          );
        }),
      );

      // Save checkpoint after each parallel batch
      try {
        const checkpointData = {
          setId: TARGET_SET_ID,
          pdfPath: PDF_PATH,
          processedPages: Array.from(processedPages),
          parsedQuestions: parsedQuestions,
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(
          checkpointFilePath,
          JSON.stringify(checkpointData, null, 2),
          "utf8",
        );
        console.log(`💾 [Checkpoint Saved] Progress saved up to Batch.`);
      } catch (cpSaveErr) {
        await new Promise((resolve) => setTimeout(resolve, spacingDelay));
      }
    }

    // Automatically detect if this PDF uses shifted numbering (e.g. Q51..Q150 for Paper II, or Q51..Q100 for Paper I)
    const validPdfNums = parsedQuestions
      .map((q) => q.pdfQNum)
      .filter((n) => !isNaN(n) && n > 0 && n <= 300);
    const maxPdfNum = validPdfNums.length > 0 ? Math.max(...validPdfNums) : 0;
    const minPdfNum = validPdfNums.length > 0 ? Math.min(...validPdfNums) : 0;

    const needsShift50 =
      (isPaperII && maxPdfNum > 100 && minPdfNum >= 51) ||
      (!isPaperII && maxPdfNum > 50 && minPdfNum >= 51);
    const needsShift100 = isPaperII && maxPdfNum > 150 && minPdfNum >= 101;

    if (needsShift50) {
      console.log(
        `\n📌 Auto-detected shifted question range (Q${minPdfNum}..Q${maxPdfNum}). Normalizing to Q1..Q${maxPdfNum - 50}...`,
      );
    } else if (needsShift100) {
      console.log(
        `\n📌 Auto-detected shifted question range (Q${minPdfNum}..Q${maxPdfNum}). Normalizing to Q1..Q${maxPdfNum - 100}...`,
      );
    }

    // Apply normalized qIndex
    parsedQuestions.forEach((q) => {
      let dbQIndex = q.pdfQNum;
      if (!isNaN(q.pdfQNum)) {
        if (needsShift50) dbQIndex = q.pdfQNum - 50;
        else if (needsShift100) dbQIndex = q.pdfQNum - 100;
      }
      q.qIndex = dbQIndex;

      // Handle forced DI/comprehension ranges matching website logic
      if (!isPaperII) {
        if (dbQIndex >= 1 && dbQIndex <= 5) q.type = "di";
        else if (dbQIndex >= 46 && dbQIndex <= 50) q.type = "comprehension";
      } else {
        if (dbQIndex >= 91 && dbQIndex <= 95) q.type = "comprehension";
        else if (dbQIndex >= 96 && dbQIndex <= 100) q.type = "comprehension";
      }

      // If answer key provided and question still has no correct answer, try lookup by normalized dbQIndex
      if (
        answerKeyMap &&
        q.correct === undefined &&
        !isNaN(dbQIndex) &&
        answerKeyMap[dbQIndex] !== undefined
      ) {
        q.correct = answerKeyMap[dbQIndex];
      }
    });

    // Deduplicate and smart fallback index assignment (ensure NO questions are discarded)
    const questionMap = new Map();
    const maxAllowedQuestions = isPaperII ? 100 : 50;
    const unindexedQueue = [];

    parsedQuestions.forEach((q) => {
      // If qIndex is valid within range 1..maxAllowedQuestions
      if (
        !isNaN(q.qIndex) &&
        q.qIndex >= 1 &&
        q.qIndex <= maxAllowedQuestions
      ) {
        if (!questionMap.has(q.qIndex)) {
          questionMap.set(q.qIndex, q);
        } else {
          // If duplicate, keep the version with more complete text
          const existing = questionMap.get(q.qIndex);
          const existingScore =
            (existing.text || "").length +
            (existing.explanation || "").length +
            (existing.options || []).join("").length;
          const newScore =
            (q.text || "").length +
            (q.explanation || "").length +
            (q.options || []).join("").length;

          if (newScore > existingScore) {
            questionMap.set(q.qIndex, q);
          }
        }
      } else {
        // FIX #5: Log out-of-range question numbers so they are traceable instead of silently dropped
        if (!isNaN(q.qIndex) && q.qIndex > maxAllowedQuestions) {
          console.warn(
            `  ⚠️  [Out-of-Range] Q${q.qIndex} is outside allowed range (1–${maxAllowedQuestions}). Placing in gap-fill queue (NTA ID: ${q.ntaQuestionId || "N/A"}).`,
          );
        }
        // Out of bounds or 6-digit Question ID — collect in unindexedQueue for smart gap filling
        unindexedQueue.push(q);
      }
    });

    // Fill missing index gaps (1..maxAllowedQuestions) using unindexedQueue
    // CRITICAL: Sort unindexedQueue by their _arrivalIndex so the PDF sequence is preserved!
    // Without this, QBID / Client Question ID / Question Id questions would be inserted
    // into slots in scan order (1,2,3...) instead of the order they appear in the PDF.
    if (unindexedQueue.length > 0) {
      console.log(
        `\n📌 Auto-assigning ${unindexedQueue.length} questions with bank IDs or non-standard numbering into open slots (in PDF sequence order)...`,
      );
      // Sort by original arrival index to preserve PDF reading order
      unindexedQueue.sort(
        (a, b) => (a._arrivalIndex ?? 0) - (b._arrivalIndex ?? 0),
      );
      let queueIdx = 0;
      for (
        let slot = 1;
        slot <= maxAllowedQuestions && queueIdx < unindexedQueue.length;
        slot++
      ) {
        if (!questionMap.has(slot)) {
          const item = unindexedQueue[queueIdx++];
          item.qIndex = slot;
          questionMap.set(slot, item);
          console.log(
            `   [Auto-Indexed] Assigned Q${slot} ← NTA/Bank ID: ${item.ntaQuestionId || item._arrivalIndex}`,
          );
        }
      }
    }

    const finalQuestions = Array.from(questionMap.values()).sort(
      (a, b) => a.qIndex - b.qIndex,
    );
    console.log(
      `Original parsed count: ${parsedQuestions.length}. Clean imported count: ${finalQuestions.length}`,
    );
    // FIX #4: Warn clearly if the final count is less than expected
    const missing = maxAllowedQuestions - finalQuestions.length;
    if (missing > 0) {
      console.warn(
        `\n⚠️  WARNING: Import completed with only ${finalQuestions.length}/${maxAllowedQuestions} questions! ${missing} question(s) missing.`,
      );
      // Find which slots are missing and print them for easy debugging
      const presentSlots = new Set(finalQuestions.map((q) => q.qIndex));
      const missingSlots = [];
      for (let s = 1; s <= maxAllowedQuestions; s++) {
        if (!presentSlots.has(s)) missingSlots.push(s);
      }
      console.warn(`   Missing question numbers: ${missingSlots.join(", ")}`);
      console.warn(
        `   ➡  Re-run the importer with the same Set ID to resume from checkpoint and fill missing questions.`,
      );
    } else {
      console.log(
        `✅  All ${maxAllowedQuestions} questions imported successfully!`,
      );
    }

    if (finalQuestions.length > 0) {
      console.log(`Cleaning old questions for Set ${TARGET_SET_ID}...`);
      await Question.deleteMany({
        setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
      });

      console.log(
        `Inserting ${finalQuestions.length} newly parsed questions into database...`,
      );
      await Question.insertMany(finalQuestions);

      await PyqSet.findByIdAndUpdate(TARGET_SET_ID, {
        questionsLoaded: finalQuestions.length,
      });
      console.log("Database updated successfully!");

      // Remove checkpoint file after successful save
      if (fs.existsSync(checkpointFilePath)) {
        fs.unlinkSync(checkpointFilePath);
        console.log(
          `🧹 [Checkpoint Cleaned] Removed temporary checkpoint file: "${checkpointFilePath}".`,
        );
      }
    } else {
      console.log("No questions extracted.");
    }
  } catch (err) {
    console.error("Fatal Error:", err);
  } finally {
    mongoose.connection.close();
    console.log("Mongoose connection closed.");
    process.exit(0);
  }
}

main();
