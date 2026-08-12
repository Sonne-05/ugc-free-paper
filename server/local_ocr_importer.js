const fs = require('fs');
const path = require('path');
const url = require('url');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

// Helper for interactive terminal input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

// Utility function to parse answer key PDF text into a mapping object { [qIndex]: correctOption }
function parseAnswerKey(text) {
  const mapping = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    let cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Apply pre-processing string replacements for common OCR typos
    cleanLine = cleanLine
      .replace(/\s*\|\s*/g, '1 ')        // '8 | B' -> '81 B' (replace space-pipe-space with '1 ')
      .replace(/\]/g, '1')              // '4]' -> '41', '9]' -> '91'
      .replace(/\bT(\d+)\b/g, '7$1')     // 'T7' -> '77'
      .replace(/\bl(\d+)\b/g, '1$1')     // 'l5' -> '15'
      .replace(/\bI(\d+)\b/g, '1$1')     // 'I5' -> '15'
      .replace(/\bl\b/g, '1')            // isolated 'l' -> '1'
      .replace(/\bI\b/g, '1')            // isolated 'I' -> '1'
      .replace(/\big\b/g, '11');         // 'ig' -> '11'
      
    // Split by whitespace, comma, tab, semicolon, vertical bar
    const tokens = cleanLine.split(/[\s,;|]+/);
    
    // Check if there are any words with length >= 3 to avoid headers/footers
    let hasLongWord = false;
    for (const t of tokens) {
      const lower = t.toLowerCase();
      // Allow 'dropped', 'drop', 'null' as valid answer key tokens
      if (['dropped', 'drop', 'null'].includes(lower)) {
        continue;
      }
      if (/[a-zA-Z]{3,}/.test(t)) {
        hasLongWord = true;
        break;
      }
    }
    if (hasLongWord) continue;
    
    // Clean tokens: remove Q/q from start, dots/colons from end
    const cleanTokens = tokens.map(t => {
      return t.replace(/^[Qq]/, '').replace(/[.:]$/, '').trim();
    }).filter(Boolean);
    
    const optionMap = { 
      'a': 1, 'b': 2, 'c': 3, 'd': 4, 
      '1': 1, '2': 2, '3': 3, '4': 4,
      'dropped': 0, 'drop': 0, 'null': 0, '0': 0
    };
    
    for (let i = 0; i < cleanTokens.length - 1; i += 2) {
      const qStr = cleanTokens[i];
      const aStr = cleanTokens[i+1];
      
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
const envConfig = dotenv.parse(fs.readFileSync(path.resolve('.env')));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

// 2. Define Mongoose Schemas (matching your backend)
const QuestionSchema = new mongoose.Schema({
  setId: mongoose.Schema.Types.ObjectId,
  qIndex: Number,
  ntaQuestionId: String,
  unit: String,
  type: { type: String, enum: ['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di'] },
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
  passage: String
}, { collection: 'questions' });

const PyqSetSchema = new mongoose.Schema({
  title: String,
  paperType: { type: String, enum: ['Paper I', 'Paper II'], default: 'Paper I' },
  questionsLoaded: Number
}, { collection: 'pyqsets' });

const Question = mongoose.model('Question', QuestionSchema);
const PyqSet = mongoose.model('PyqSet', PyqSetSchema);

// 3. Setup per-key rate limiter
const apiKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

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

// Returns index of the best available key right now.
// Skips keys that are in a retryDelay cooldown or at RPM capacity.
// If ALL keys are unavailable, waits for the earliest one to free up, then retries.
async function getAvailableKeyIndex() {
  const now = Date.now();
  const windowMs = 60000;

  // Purge expired sliding window timestamps for every key
  for (let i = 0; i < keyHistory.length; i++) {
    keyHistory[i] = keyHistory[i].filter(ts => now - ts < windowMs);
  }

  // Find the best available key:
  // Must be (a) not in retryDelay cooldown AND (b) under its RPM cap
  let bestIndex = -1;
  let lowestUsage = Infinity;
  for (let i = 0; i < keyHistory.length; i++) {
    if (keyCooldownUntil[i] > now) continue;        // skip: still in retryDelay cooldown
    const usage = keyHistory[i].length;
    if (usage < PER_KEY_RPM && usage < lowestUsage) {
      lowestUsage = usage;
      bestIndex = i;
    }
  }

  // Found an available key — return immediately
  if (bestIndex !== -1) return bestIndex;

  // All keys are either in cooldown or at RPM cap.
  // Find the earliest moment ANY key becomes available.
  let earliestAvailable = Infinity;
  for (let i = 0; i < keyHistory.length; i++) {
    // Cooldown expiry time for this key
    if (keyCooldownUntil[i] > now) {
      earliestAvailable = Math.min(earliestAvailable, keyCooldownUntil[i]);
    }
    // RPM sliding window expiry time for this key
    if (keyHistory[i].length >= PER_KEY_RPM && keyHistory[i].length > 0) {
      const rpmFreeAt = keyHistory[i][0] + windowMs;
      earliestAvailable = Math.min(earliestAvailable, rpmFreeAt);
    }
  }

  const waitMs = earliestAvailable - Date.now() + 300; // +300ms buffer
  if (waitMs > 0) {
    console.log(`[Rate Limiter] All ${apiKeys.length} keys unavailable. Waiting ${(waitMs / 1000).toFixed(1)}s for next key to free up...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  // Recurse to re-evaluate after the wait
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
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  try {
    cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    });
  } catch (e) {}
  return cleaned;
}

// 4. API Call to Gemini
async function callAIChatForOcrPage(base64Image, pageNum, isPaperII, importLanguage, retryCount = 0) {
  // Pick the key with the most available capacity (waits automatically if all are exhausted)
  const keyIndex = await getAvailableKeyIndex();
  const apiKey = apiKeys[keyIndex];
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const urlEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const textPrompt = `You are an expert UGC NET ${isPaperII ? 'Paper II' : 'Paper I'} exam parser.
Look at the provided PDF page image and extract all multiple choice questions visible on it.

Target Language Rule:
You MUST extract the questions and option texts in the following language/format: "${importLanguage}".
- If "English" is selected: Extract only the English version of the questions. If the text has both English and Hindi/Sindhi versions, ignore the Hindi/Sindhi text and extract only the English text.
- If "Hindi" is selected: Extract only the Hindi version of the questions (in Devanagari script).
- If "Sindhi" is selected: Extract only the Sindhi version of the questions.
- If "Bilingual (English & Hindi)" is selected: Keep the question text bilingual (extract both the English and Hindi versions, showing the English text first and Hindi text below it). Do the same for option values (English option first, Hindi translation below it).
- If "Bilingual (English & Sindhi)" is selected: Keep the question text bilingual (extract both the English and Sindhi versions, showing the English text first and Sindhi text below it). Do the same for option values (English option first, Sindhi translation below it).

Instructions:
1. Extract the question text exactly as instructed in the Target Language Rule above. Keep punctuation, spacing, and grammar identical to the visual text. Filter out system headers/footers or pagination labels.
2. Extract exactly 4 options matching the Target Language Rule.
3. Identify the question number/index (e.g. Sl. No. 1, Q51, Question Number: 51, or Question 51). Also extract the Question Bank ID / NTA Question ID (e.g. 5001 from 'QBID:5001' or 926341 from 'Question Id : 926341') into the "ntaQuestionId" field if present.
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
    - If the Target Language is "Sindhi" or contains "Sindhi" (e.g. Bilingual (English & Sindhi)): You MUST generate the explanation entirely in Sindhi (using the Arabic script or Devanagari script, matching the script used in the question text).
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

  try {
    const response = await fetch(urlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: textPrompt },
            { inlineData: { mimeType: 'image/png', data: base64Image } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      if ((response.status === 429 || response.status === 503) && retryCount < 30) {
        // Parse retryDelay from Google's 429 response body (e.g. "retryDelay": "53s")
        // This is a per-key/per-project cooldown — apply it ONLY to this specific key
        const retryDelayMatch = errText.match(/"retryDelay"\s*:\s*"(\d+)s"/);
        const retryDelaySecs = retryDelayMatch ? parseInt(retryDelayMatch[1]) : 0;

        if (retryDelaySecs > 5) {
          // Key is in Google-enforced cooldown — mark it, other keys remain usable
          keyCooldownUntil[keyIndex] = Date.now() + (retryDelaySecs * 1000) + 2000;
          console.warn(`[AI OCR] Key #${keyIndex + 1} hit quota (${response.status}) on Page ${pageNum}. Cooling this key for ${retryDelaySecs}s. Switching to next available key...`);
        } else {
          // No retryDelay — just saturate the key's sliding window so it won't be reused immediately
          const slotsToFill = PER_KEY_RPM - keyHistory[keyIndex].length;
          for (let s = 0; s < slotsToFill; s++) keyHistory[keyIndex].push(Date.now());
          console.warn(`[AI OCR] Key #${keyIndex + 1} rate limited (${response.status}) on Page ${pageNum}. Switching to next available key (Retry ${retryCount + 1}/30)...`);
        }

        // getAvailableKeyIndex() will skip cooled-down keys and wait only if ALL are unavailable
        return callAIChatForOcrPage(base64Image, pageNum, isPaperII, importLanguage, retryCount + 1);
      }
      throw new Error(`API error: ${response.status} - ${errText}`);
    }

    // Record this successful request in the per-key sliding window
    recordRequest(keyIndex);

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleaned = cleanJsonString(rawText);
    
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.questions || parsed;
    } catch (jsonErr) {
      if (retryCount < 30) {
        console.warn(`[AI OCR] Malformed JSON on Page ${pageNum}. Retrying (${retryCount + 1}/30)...`);
        await new Promise(r => setTimeout(r, 2000));
        return callAIChatForOcrPage(base64Image, pageNum, isPaperII, importLanguage, retryCount + 1);
      }
      throw jsonErr;
    }
  } catch (err) {
    if (retryCount < 30 && (err.message.includes('fetch') || err.message.includes('timeout') || err.message.includes('API error'))) {
      console.warn(`[AI OCR] Network error on Page ${pageNum} (${err.message}). Retrying (${retryCount + 1}/30)...`);
      await new Promise(r => setTimeout(r, 5000));
      return callAIChatForOcrPage(base64Image, pageNum, isPaperII, importLanguage, retryCount + 1);
    }
    throw err;
  }
}

// 5. Main execution
async function main() {
  console.log("=== Interactive Local OCR Importer ===");
  
  const PDF_PATH = await askQuestion("Enter the absolute path to your PDF file: ");
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Error: PDF file does not exist at path: "${PDF_PATH}"`);
    process.exit(1);
  }

  const TARGET_SET_ID = await askQuestion("Enter the Target PyqSet ID: ");
  if (!mongoose.Types.ObjectId.isValid(TARGET_SET_ID)) {
    console.error("Error: Invalid MongoDB Set ID.");
    process.exit(1);
  }

  const LANGUAGE = await askQuestion("Enter Target Language (e.g. English, Hindi, Sindhi): ");

  const ANSWER_KEY_PATH = await askQuestion("Enter the absolute path to your Answer Key PDF file (optional, press Enter to skip): ");
  if (ANSWER_KEY_PATH && !fs.existsSync(ANSWER_KEY_PATH)) {
    console.error(`Error: Answer Key PDF file does not exist at path: "${ANSWER_KEY_PATH}"`);
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
    const isPaperII = targetSet.paperType === 'Paper II';
    console.log(`Target Set Title: "${targetSet.title}" (Paper Type: ${targetSet.paperType || 'Paper I'})`);

    // Resolve dependencies locally
    const canvasPkg = require('@napi-rs/canvas');
    const { createCanvas } = canvasPkg;

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
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
        const pageText = textContent.items.map(item => item.str).join(' ');
        keyText += pageText + "\n";
      }
      answerKeyMap = parseAnswerKey(keyText);
      const mappedCount = Object.keys(answerKeyMap).length;
      console.log(`Successfully mapped ${mappedCount} answers from key.`);
      if (mappedCount === 0) {
        console.warn("⚠️  Warning: No valid question/answer mappings could be parsed from the Answer Key PDF.");
      }
    }

    console.log("Loading local PDF document...");
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const pdfDoc = await pdfjs.getDocument({ data }).promise;
    const totalPages = pdfDoc.numPages;

    console.log(`PDF Loaded. Total pages: ${totalPages}. Scanning pages...`);
    const ocrPages = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      const hasHeader = /Question/i.test(pageText) || 
                        /Q\s*[\.\:\d]/i.test(pageText) || 
                        /Sl\s*\.\s*No/i.test(pageText) || 
                        /QBID/i.test(pageText) || 
                        /Option/i.test(pageText) || 
                        /Answer/i.test(pageText) || 
                        /Statement/i.test(pageText) || 
                        /List/i.test(pageText) || 
                        /प्रश्न/i.test(pageText) || 
                        /विकल्प/i.test(pageText) ||
                        pageText.trim().length > 80;
      if (hasHeader) ocrPages.push({ pageNum, page });
    }
    console.log(`Pre-scan found ${ocrPages.length} question-bearing pages.`);
    
    if (ocrPages.length === 0) {
      console.log("\n⚠️  No text-bearing pages found. This PDF appears to be a scanned (image-only) document.");
      const answer = await askQuestion("Would you like to force-process all pages instead? (y/n): ");
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log(`Adding all ${totalPages} pages for OCR processing...`);
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          ocrPages.push({ pageNum, page });
        }
      }
    }
    
    // Checkpoint File Setup
    const checkpointFilePath = path.resolve(`checkpoint_${TARGET_SET_ID}.json`);
    let processedPages = new Set();
    let parsedQuestions = [];

    if (fs.existsSync(checkpointFilePath)) {
      try {
        const rawCheckpoint = fs.readFileSync(checkpointFilePath, 'utf8');
        const checkpointData = JSON.parse(rawCheckpoint);
        if (checkpointData && checkpointData.setId === TARGET_SET_ID) {
          processedPages = new Set(checkpointData.processedPages || []);
          parsedQuestions = checkpointData.parsedQuestions || [];
          console.log(`\n📌 Found existing checkpoint file: "${checkpointFilePath}"`);
          console.log(`📌 Resuming import! Already processed ${processedPages.size} pages (${parsedQuestions.length} questions loaded from checkpoint).`);
        }
      } catch (cpErr) {
        console.warn("⚠️  Warning: Could not parse existing checkpoint file. Starting fresh.", cpErr.message);
      }
    }

    let completedOcrCount = processedPages.size;
    const totalOcrPages = ocrPages.length;

    for (let i = 0; i < ocrPages.length; i++) {
      const { pageNum, page } = ocrPages[i];

      // Skip page if already in checkpoint
      if (processedPages.has(pageNum)) {
        console.log(`\n--- Page ${pageNum} (${completedOcrCount}/${totalOcrPages}) ---`);
        console.log(`⏩ [Checkpoint] Skipping Page ${pageNum} (already processed in checkpoint).`);
        continue;
      }

      console.log(`\n--- Processing Page ${pageNum} (${completedOcrCount + 1}/${totalOcrPages}) ---`);
      
      // Render page to canvas
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      const imgBuffer = canvas.toBuffer('image/png');
      const base64Image = imgBuffer.toString('base64');
      
      console.log(`Page ${pageNum} rendered. Image size: ${imgBuffer.length} bytes.`);
      console.log(`Sending to Gemini API...`);
      
      let pageQuestions = [];
      try {
        pageQuestions = await callAIChatForOcrPage(base64Image, pageNum, isPaperII, LANGUAGE);
      } catch (err) {
        console.error(`\n❌ Error: Page ${pageNum} failed to process after all retries:`, err.message);
        console.error(`💾 Progress saved in checkpoint! Run the command again with Set ID ${TARGET_SET_ID} to resume from Page ${pageNum}.`);
        process.exit(1);
      }

      pageQuestions.forEach(q => {
        // Robustly parse digits from qIndex (handles "Q1", "Q. 51", "Question 101", etc.)
        let rawStr = String(q.qIndex || '').trim();
        let matchDigits = rawStr.match(/\d+/);
        let pdfQNum = matchDigits ? parseInt(matchDigits[0], 10) : NaN;
        
        let dbQIndex = pdfQNum;
        const maxAllowedQuestions = isPaperII ? 100 : 50;

        if (!isNaN(pdfQNum)) {
          if (isPaperII) {
            if (pdfQNum >= 51 && pdfQNum <= 150) dbQIndex = pdfQNum - 50;
            else if (pdfQNum >= 101 && pdfQNum <= 200) dbQIndex = pdfQNum - 100;
          } else {
            if (pdfQNum >= 51 && pdfQNum <= 100) dbQIndex = pdfQNum - 50;
          }
        }

        let updatedQ = {
          ...q,
          qIndex: dbQIndex,
          pdfQNum: pdfQNum,
          setId: new mongoose.Types.ObjectId(TARGET_SET_ID)
        };

        // Handle forced DI/comprehension ranges matching website logic
        if (!isPaperII) {
          if (dbQIndex >= 1 && dbQIndex <= 5) updatedQ.type = 'di';
          else if (dbQIndex >= 46 && dbQIndex <= 50) updatedQ.type = 'comprehension';
        } else {
          if (dbQIndex >= 91 && dbQIndex <= 95) updatedQ.type = 'comprehension';
          else if (dbQIndex >= 96 && dbQIndex <= 100) updatedQ.type = 'comprehension';
        }

        // Override correct answer with official key if provided
        if (answerKeyMap) {
          let correctAns = undefined;
          if (q.ntaQuestionId && answerKeyMap[q.ntaQuestionId] !== undefined) {
            correctAns = answerKeyMap[q.ntaQuestionId];
          } else if (!isNaN(pdfQNum) && answerKeyMap[pdfQNum] !== undefined) {
            correctAns = answerKeyMap[pdfQNum];
          } else if (!isNaN(dbQIndex) && answerKeyMap[dbQIndex] !== undefined) {
            correctAns = answerKeyMap[dbQIndex];
          }
          if (correctAns !== undefined) {
            updatedQ.correct = correctAns;
          }
        }
        
        parsedQuestions.push(updatedQ);
      });
      
      console.log(`Page ${pageNum} processed successfully. Questions found: ${pageQuestions.length}`);
      completedOcrCount++;
      
      // Save checkpoint after every page
      processedPages.add(pageNum);
      try {
        const checkpointData = {
          setId: TARGET_SET_ID,
          pdfPath: PDF_PATH,
          processedPages: Array.from(processedPages),
          parsedQuestions: parsedQuestions,
          updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(checkpointFilePath, JSON.stringify(checkpointData, null, 2), 'utf8');
        console.log(`💾 [Checkpoint Saved] Page ${pageNum} saved to local checkpoint.`);
      } catch (cpSaveErr) {
        console.warn(`⚠️  Warning: Failed to write checkpoint file for page ${pageNum}:`, cpSaveErr.message);
      }

      // Small spacing delay between requests to keep the IP connection throughput smooth
      if (i < ocrPages.length - 1) {
        const spacingDelay = 1500;
        await new Promise(resolve => setTimeout(resolve, spacingDelay));
      }
    }

    // Deduplicate and smart fallback index assignment (ensure NO questions are discarded)
    const questionMap = new Map();
    const maxAllowedQuestions = isPaperII ? 100 : 50;
    const unindexedQueue = [];

    parsedQuestions.forEach(q => {
      // If qIndex is valid within range 1..maxAllowedQuestions
      if (!isNaN(q.qIndex) && q.qIndex >= 1 && q.qIndex <= maxAllowedQuestions) {
        if (!questionMap.has(q.qIndex)) {
          questionMap.set(q.qIndex, q);
        } else {
          // If duplicate, keep the version with more complete text
          const existing = questionMap.get(q.qIndex);
          const existingScore = (existing.text || '').length + (existing.explanation || '').length + (existing.options || []).join('').length;
          const newScore = (q.text || '').length + (q.explanation || '').length + (q.options || []).join('').length;
          
          if (newScore > existingScore) {
            questionMap.set(q.qIndex, q);
          }
        }
      } else {
        // Out of bounds or 6-digit Question ID — collect in unindexedQueue for smart gap filling
        unindexedQueue.push(q);
      }
    });

    // Fill missing index gaps (1..maxAllowedQuestions) using unindexedQueue
    if (unindexedQueue.length > 0) {
      console.log(`\n📌 Auto-assigning ${unindexedQueue.length} questions with 6-digit IDs or non-standard numbering into open slots...`);
      let queueIdx = 0;
      for (let slot = 1; slot <= maxAllowedQuestions && queueIdx < unindexedQueue.length; slot++) {
        if (!questionMap.has(slot)) {
          const item = unindexedQueue[queueIdx++];
          item.qIndex = slot;
          questionMap.set(slot, item);
          console.log(`   [Auto-Indexed] Assigned question to Q${slot}`);
        }
      }
    }

    const finalQuestions = Array.from(questionMap.values()).sort((a, b) => a.qIndex - b.qIndex);
    console.log(`Original parsed count: ${parsedQuestions.length}. Clean imported count: ${finalQuestions.length}`);

    if (finalQuestions.length > 0) {
      console.log(`Cleaning old questions for Set ${TARGET_SET_ID}...`);
      await Question.deleteMany({ setId: new mongoose.Types.ObjectId(TARGET_SET_ID) });
      
      console.log(`Inserting ${finalQuestions.length} newly parsed questions into database...`);
      await Question.insertMany(finalQuestions);
      
      await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: finalQuestions.length });
      console.log("Database updated successfully!");

      // Remove checkpoint file after successful save
      if (fs.existsSync(checkpointFilePath)) {
        fs.unlinkSync(checkpointFilePath);
        console.log(`🧹 [Checkpoint Cleaned] Removed temporary checkpoint file: "${checkpointFilePath}".`);
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