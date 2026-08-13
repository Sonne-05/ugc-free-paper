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
      .replace(/\s*\|\s*/g, '1 ')        // '8 | B' -> '81 B'
      .replace(/\]/g, '1')              // '4]' -> '41', '9]' -> '91'
      .replace(/\bT(\d+)\b/g, '7$1')     // 'T7' -> '77'
      .replace(/\bl(\d+)\b/g, '1$1')     // 'l5' -> '15'
      .replace(/\bI(\d+)\b/g, '1$1')     // 'I5' -> '15'
      .replace(/\bl\b/g, '1')            // isolated 'l' -> '1'
      .replace(/\bI\b/g, '1')            // isolated 'I' -> '1'
      .replace(/\big\b/g, '11');         // 'ig' -> '11'
      
    const tokens = cleanLine.split(/[\s,;|]+/);
    
    let hasLongWord = false;
    for (const t of tokens) {
      const lower = t.toLowerCase();
      if (['dropped', 'drop', 'null'].includes(lower)) continue;
      if (/[a-zA-Z]{3,}/.test(t)) {
        hasLongWord = true;
        break;
      }
    }
    if (hasLongWord) continue;
    
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

// 1. Load env file manually
const envConfig = dotenv.parse(fs.readFileSync(path.resolve('.env')));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

// 2. Define Mongoose Schemas (matching backend)
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

// 3. Multi-key rotation + per-key rate limiting
// Add keys: GROQ_OCR_KEY_1, GROQ_OCR_KEY_2, ... GROQ_OCR_KEY_N in .env
// Falls back to GROQ_OCR_API_KEY and GROQ_API_KEY if numbered keys not found
function loadGroqKeys() {
  const keys = [];
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GROQ_OCR_KEY_${i}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  // Also include legacy keys (split by comma in case of comma-separated lists)
  const legacySources = [
    process.env.GROQ_OCR_API_KEY,
    ...(process.env.GROQ_API_KEY || '').split(','),
  ];
  for (const k of legacySources) {
    if (k && k.trim() && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  }
  return keys;
}

const GROQ_KEYS = loadGroqKeys();
let currentKeyIndex = 0;
let exhaustedKeyCount = 0; // tracks consecutive 429s across all keys
const keyHistories = {}; // per-key request timestamps
const KEY_RPM = 2; // safe RPM per key

function getCurrentKey() {
  return GROQ_KEYS[currentKeyIndex];
}

function rotateToNextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  console.log(`  [Key Rotation] Switched to key ${currentKeyIndex + 1}/${GROQ_KEYS.length}`);
}

async function waitForGroqRateLimit() {
  const key = getCurrentKey();
  if (!keyHistories[key]) keyHistories[key] = [];
  const history = keyHistories[key];
  const now = Date.now();
  const windowMs = 60000;
  while (history.length > 0 && now - history[0] >= windowMs) history.shift();
  if (history.length >= KEY_RPM) {
    const waitMs = history[0] + windowMs - Date.now() + 500;
    if (waitMs > 0) {
      console.log(`  [Rate Limiter] Key ${currentKeyIndex + 1} at RPM cap. Waiting ${(waitMs / 1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    return waitForGroqRateLimit();
  }
  history.push(Date.now());
  exhaustedKeyCount = 0; // reset on successful slot acquisition
}

// 4. Upload base64 image to imgbb and get a public URL (auto-deletes in 5 minutes)
async function uploadImageToImgbb(base64Image) {
  const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';
  if (!IMGBB_API_KEY) {
    throw new Error('IMGBB_API_KEY is not set in .env. Add your key from https://imgbb.com/signup → API tab.');
  }

  const formData = new URLSearchParams();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Image);
  formData.append('expiration', '300'); // auto-delete after 5 minutes

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`imgbb upload failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`imgbb upload error: ${JSON.stringify(data)}`);
  }

  return data.data.url; // public URL, valid for 5 minutes then auto-deleted
}

function cleanJsonString(str) {
  // 1. Strip <think>...</think> blocks (Qwen reasoning)
  let cleaned = str.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // 2. Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // 3. Try to extract the first JSON object or array via regex
  const jsonMatch = cleaned.match(/({[\s\S]*}|\[[\s\S]*\])/);
  if (jsonMatch) cleaned = jsonMatch[1];
  return cleaned;
}

// 5. API Call to Groq Qwen 3.6 27B Vision
async function callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount = 0, retryCount = 0, ocrRetryCount = 0) {
  const groqKey = getCurrentKey();
  if (!groqKey) throw new Error('No Groq API keys found in .env');

  // Upload image to imgbb to get a public URL (Groq requires public URLs, not base64)
  let imageUrl;
  try {
    imageUrl = await uploadImageToImgbb(base64Image);
    console.log(`  [imgbb] Page ${pageNum} uploaded. URL: ${imageUrl}`);
  } catch (uploadErr) {
    if (retryCount < 5) {
      console.warn(`  [imgbb] Upload failed on Page ${pageNum}: ${uploadErr.message}. Retrying (${retryCount + 1}/5)...`);
      await new Promise(r => setTimeout(r, 3000));
      // Pass expectedCount and ocrRetryCount correctly
      return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount + 1, ocrRetryCount);
    }
    throw uploadErr;
  }

  await waitForGroqRateLimit();

  const textPrompt = [
    'Extract ALL MCQ questions from this UGC NET ' + (isPaperII ? 'Paper II' : 'Paper I') + ' page from top to bottom.',
    'Language mode: ' + importLanguage + (expectedCount > 0 ? '. Expect ~' + expectedCount + ' questions.' : '.'),
    '',
    (importLanguage.includes('Sindhi') ? '⚠️  CRITICAL SINDHI DEVANAGARI SCRIPT ENFORCEMENT ACTIVE:\nExtract ONLY Devanagari script Sindhi (e.g. "\'ईजाद\' लफ़्ज़ जी माना -"). DO NOT extract any Perso-Arabic/Urdu script text (\'پھريون ئي جھگڙو\'). Any Perso-Arabic/Urdu script in output = TASK FAILURE.\n' : ''),
    'Rules:',
    '- Extract every question top-to-bottom. Do not skip any.',
    '- Target Language Rule:',
    '  - If English: extract ONLY English Roman text. Skip Devanagari/Hindi/Sindhi.',
    '  - If Hindi: extract ONLY Hindi text in Devanagari script.',
    '  - If Sindhi: extract ONLY Sindhi text written in DEVANAGARI script. Skip/ignore all Perso-Arabic/Urdu script and English text.',
    '  - If Bilingual: extract English first, followed by Devanagari text below it.',
    '- Question ID Formats:',
    '  - "3) Definite procedures..." → qIndex=3',
    '  - "Sl. No.1 QBID:1101001" → qIndex=1, ntaQuestionId="1101001"',
    '  - "[Question ID = 1408][Question Description = ...]" → ntaQuestionId="1408"',
    '  - "Objective Question  1   2051" → qIndex=1, ntaQuestionId="2051"',
    '  - "Question Number : 1 Question Id : 5330728243" → qIndex=1, ntaQuestionId="5330728243"',
    '  Note: Filter out metadata footers like "[Question Description = ...]" and "[Option ID = ...]" from text.',
    '- options: always 4 items [A,B,C,D]. correct: 1-4. unit: always empty string.',
    '- type: mcq | assertion-reason | match-column | multiple-statement | comprehension | di',
    '  - assertion-reason: fill assertion, reason fields.',
    '  - match-column: fill list1[], list2[], list1Header, list2Header.',
    '  - multiple-statement: fill statements[].',
    '  - comprehension/di: fill passage field.',
    '- explanation: detailed explanation in target language (Devanagari script only if Sindhi/Hindi).',
    '',
    'Output ONLY valid JSON, no markdown:',
    '{"questions":[{"qIndex":1,"ntaQuestionId":"","unit":"","type":"mcq","text":"","options":["","","",""],"correct":1,"explanation":"","passage":"","statements":[],"assertion":"","reason":"","list1":[],"list2":[],"list1Header":"","list2Header":""}]}'
  ].join('\n');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: textPrompt }
          ]
        }],
        temperature: 0.1,
        max_tokens: 4096,
        reasoning_effort: 'none'
      })
    });

    if (!response.ok) {
      const errText = await response.text();

      // --- 401 Invalid API Key: skip this key permanently ---
      if (response.status === 401) {
        const badKey = getCurrentKey();
        console.error(`[Groq] ❌ Key ${currentKeyIndex + 1}/${GROQ_KEYS.length} is invalid (401). Removing it from rotation.`);
        GROQ_KEYS.splice(currentKeyIndex, 1);
        if (GROQ_KEYS.length === 0) {
          throw new Error(`Groq API error: All keys invalid (401). ${errText}`);
        }
        // currentKeyIndex now points to next key (or wraps)
        currentKeyIndex = currentKeyIndex % GROQ_KEYS.length;
        return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount, ocrRetryCount);
      }

      if ((response.status === 429 || response.status === 503) && retryCount < 30) {
        if (response.status === 429 && GROQ_KEYS.length > 1) {
          // Track how many consecutive 429s we've seen
          exhaustedKeyCount++;
          if (exhaustedKeyCount >= GROQ_KEYS.length) {
            // ALL keys are rate limited — wait 60s for them to reset
            exhaustedKeyCount = 0;
            currentKeyIndex = 0; // reset back to key 1
            console.warn(`[Groq] ⚠️  ALL ${GROQ_KEYS.length} keys rate limited on Page ${pageNum}. Waiting 60s for reset...`);
            await new Promise(r => setTimeout(r, 60000));
          } else {
            rotateToNextKey();
            console.warn(`[Groq] Rate limited on Page ${pageNum}. Rotated to key ${currentKeyIndex + 1}/${GROQ_KEYS.length}. (Retry ${retryCount + 1})`);
          }
        } else {
          const waitSecs = response.status === 429 ? 60 : 10;
          console.warn(`[Groq] Rate limited (${response.status}) on Page ${pageNum}. Waiting ${waitSecs}s... (Retry ${retryCount + 1})`);
          await new Promise(r => setTimeout(r, waitSecs * 1000));
        }
        return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount + 1, ocrRetryCount);
      }
      throw new Error(`Groq API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';

    const cleaned = cleanJsonString(rawText);

    try {
      const parsed = JSON.parse(cleaned);
      let resQuestions = parsed.questions || (Array.isArray(parsed) ? parsed : []);

      // If Sindhi is requested, sanitize output to remove any residual Perso-Arabic/Urdu script characters (\u0600-\u06FF, etc.)
      if (importLanguage && importLanguage.includes('Sindhi')) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
        const cleanField = (val) => {
          if (typeof val === 'string') {
            return val.replace(arabicRegex, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
          }
          if (Array.isArray(val)) {
            return val.map(item => typeof item === 'string' ? item.replace(arabicRegex, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : item);
          }
          return val;
        };

        resQuestions = resQuestions.map(q => ({
          ...q,
          text: cleanField(q.text),
          options: cleanField(q.options),
          statements: cleanField(q.statements),
          list1: cleanField(q.list1),
          list2: cleanField(q.list2),
          assertion: cleanField(q.assertion),
          reason: cleanField(q.reason),
          passage: cleanField(q.passage),
          explanation: cleanField(q.explanation)
        }));
      }

      // FIX #1 & #2: Use a separate ocrRetryCount so count-check retries are
      // never consumed by API-error retries (429/503). Limit raised to 5 attempts.
      if (expectedCount > 0 && resQuestions.length < expectedCount && ocrRetryCount < 5) {
        console.warn(`[Groq OCR] Page ${pageNum}: Extracted ${resQuestions.length}/${expectedCount} expected questions. Retrying OCR (attempt ${ocrRetryCount + 1}/5)...`);
        await new Promise(r => setTimeout(r, 2000));
        return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount, ocrRetryCount + 1);
      } else if (resQuestions.length === 0 && ocrRetryCount < 5) {
        console.warn(`[Groq OCR] 0 questions extracted on Page ${pageNum}. Retrying OCR (attempt ${ocrRetryCount + 1}/5)...`);
        await new Promise(r => setTimeout(r, 2000));
        return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount, ocrRetryCount + 1);
      }

      return resQuestions;
    } catch (jsonErr) {
      if (retryCount < 5) {
        console.warn(`[Groq OCR] Malformed JSON on Page ${pageNum}. Retrying (${retryCount + 1}/5)...`);
        await new Promise(r => setTimeout(r, 10000));
        return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount + 1, ocrRetryCount);
      }
      throw jsonErr;
    }
  } catch (err) {
    if (retryCount < 5 && (err.message.includes('fetch') || err.message.includes('timeout'))) {
      console.warn(`[Groq OCR] Network error on Page ${pageNum} (${err.message}). Retrying (${retryCount + 1}/5)...`);
      await new Promise(r => setTimeout(r, 5000));
      // FIX #3: Pass expectedCount correctly (was already correct here, keeping ocrRetryCount too)
      return callGroqQwenVision(base64Image, pageNum, isPaperII, importLanguage, expectedCount, retryCount + 1, ocrRetryCount);
    }
    throw err;
  }
}

// 6. Main Importer Routine
async function main() {
  console.log("=================================================");
  console.log("   UGC NET Local Importer v2 (Groq Qwen Vision) ");
  console.log("=================================================\n");

  // Validate required keys upfront
  if (GROQ_KEYS.length === 0) {
    console.error("❌ Error: No Groq API keys found. Add GROQ_OCR_KEY_1, GROQ_OCR_KEY_2... or GROQ_OCR_API_KEY in .env");
    process.exit(1);
  }
  console.log(`🔑 Loaded ${GROQ_KEYS.length} Groq key(s) for rotation.`);
  if (!process.env.IMGBB_API_KEY) {
    console.error("❌ Error: IMGBB_API_KEY is not set in your .env file.");
    console.error("   Get your key: imgbb.com → Login → API tab → copy the key");
    process.exit(1);
  }

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

  const LANGUAGE = await askQuestion("Enter Target Language (e.g. English, Hindi, Sindhi, Sindhi (Devanagari)): ");

  const ANSWER_KEY_PATH = await askQuestion("Enter the absolute path to your Answer Key PDF file (optional, press Enter to skip): ");
  if (ANSWER_KEY_PATH && !fs.existsSync(ANSWER_KEY_PATH)) {
    console.error(`Error: Answer Key PDF file does not exist at path: "${ANSWER_KEY_PATH}"`);
    process.exit(1);
  }

  try {
    console.log("\nConnecting to live MongoDB database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully!");

    const targetSet = await PyqSet.findById(TARGET_SET_ID);
    if (!targetSet) {
      throw new Error(`Target Set not found in database: ${TARGET_SET_ID}`);
    }
    const isPaperII = targetSet.paperType === 'Paper II';
    console.log(`Target Set Title: "${targetSet.title}" (Paper Type: ${targetSet.paperType || 'Paper I'})`);
    console.log(`AI Engine: Groq Qwen 3.6 27B Vision (standalone — no Colab needed)`);

    // Resolve PDF.js and Canvas dependencies
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

    // Detect if this is a bilingual (English + Hindi) PDF
    let isBilingualPdf = false;
    for (let samplePage = 1; samplePage <= Math.min(5, totalPages); samplePage++) {
      const sp = await pdfDoc.getPage(samplePage);
      const stc = await sp.getTextContent();
      const sampleText = stc.items.map(i => i.str).join(' ');
      if (/[\u0900-\u097F]/.test(sampleText)) { // Devanagari Unicode range
        isBilingualPdf = true;
        break;
      }
    }
    if (isBilingualPdf) {
      console.log(`📖 Detected bilingual PDF (English + Hindi). Each question appears in both languages.`);
    }

    const ocrPages = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      const hasHeader = /Question/i.test(pageText) || 
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

      const serialPatterns = [
        /\b(\d{1,3})\s*\)\s+/gi,
        /Sl\.?\s*No\.?\s*(\d{1,3})\b/gi,
        /Question\s+Number\s*[:\.]?\s*(\d{1,3})\b/gi,
        /\bQ\s*[\.:](\d{1,3})\b/gi,
        /\[?\s*Question\s+ID\s*=\s*(\d{1,3})\b/gi,
        /Client\s+Question\s+ID\s+(\d{1,3})\b/gi,
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
      console.log("\n⚠️  No text-bearing pages found. This PDF appears to be a scanned document.");
      const answer = await askQuestion("Would you like to force-process all pages instead? (y/n): ");
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          ocrPages.push({ pageNum, page, expectedCount: 0, pageSlNos: [] });
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
      const { pageNum, page, expectedCount, pageSlNos } = ocrPages[i];

      if (processedPages.has(pageNum)) {
        console.log(`\n--- Page ${pageNum} (${completedOcrCount}/${totalOcrPages}) ---`);
        console.log(`⏩ [Checkpoint] Skipping Page ${pageNum} (already processed in checkpoint).`);
        continue;
      }

      console.log(`\n--- Processing Page ${pageNum} (${completedOcrCount + 1}/${totalOcrPages}) ---`);
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      const imgBuffer = canvas.toBuffer('image/png');
      const base64Image = imgBuffer.toString('base64');
      
      console.log(`Page ${pageNum} rendered. Image size: ${imgBuffer.length} bytes.${expectedCount > 0 ? ` (Pre-scan detected ~${expectedCount} questions)` : ''}`);
      console.log(`Sending to Groq Qwen 3.6 27B Vision...`);
      
      let pageQuestions = [];
      try {
        pageQuestions = await callGroqQwenVision(base64Image, pageNum, isPaperII, LANGUAGE, expectedCount || 0);
      } catch (err) {
        console.error(`\n❌ Error: Page ${pageNum} failed to process after all retries:`, err.message);
        console.error(`💾 Progress saved in checkpoint! Run the command again with Set ID ${TARGET_SET_ID} to resume from Page ${pageNum}.`);
        process.exit(1);
      }

      // --- PDF Sl. No. Ground-Truth Override ---
      if (pageSlNos && pageSlNos.length > 0 && pageQuestions.length > 0) {
        const sorted = [...pageQuestions].sort((a, b) => {
          const ai = parseInt(String(a.qIndex || '0').match(/\d+/)?.[0] || '0', 10);
          const bi = parseInt(String(b.qIndex || '0').match(/\d+/)?.[0] || '0', 10);
          return ai - bi;
        });
        sorted.forEach((q, idx) => {
          if (idx < pageSlNos.length) {
            const pdfNum = pageSlNos[idx];
            const aiNum = parseInt(String(q.qIndex || '').match(/\d+/)?.[0] || 'NaN', 10);
            if (!isNaN(aiNum) && aiNum !== pdfNum) {
              console.log(`  📌 [Sl.No Fix] Page ${pageNum}: AI said Q${aiNum}, PDF says Q${pdfNum} → using PDF value`);
            }
            q.qIndex = pdfNum;
          }
        });
        pageQuestions.splice(0, pageQuestions.length, ...sorted);
      }

      pageQuestions.forEach(q => {
        let rawStr = String(q.qIndex || '').trim();
        let matchDigits = rawStr.match(/\d+/);
        let pdfQNum = matchDigits ? parseInt(matchDigits[0], 10) : NaN;

        let ntaId = q.ntaQuestionId || '';
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
          explanation: q.explanation || "",
          _arrivalIndex: parsedQuestions.length
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

      if (i < ocrPages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30s between pages to avoid 429
      }
    }

    // Automatically detect if this PDF uses shifted numbering
    const validPdfNums = parsedQuestions.map(q => q.pdfQNum).filter(n => !isNaN(n) && n > 0 && n <= 300);
    const maxPdfNum = validPdfNums.length > 0 ? Math.max(...validPdfNums) : 0;
    const minPdfNum = validPdfNums.length > 0 ? Math.min(...validPdfNums) : 0;

    const needsShift50 = (isPaperII && maxPdfNum > 100 && minPdfNum >= 51) || (!isPaperII && maxPdfNum > 50 && minPdfNum >= 51);
    const needsShift100 = (isPaperII && maxPdfNum > 150 && minPdfNum >= 101);

    if (needsShift50) {
      console.log(`\n📌 Auto-detected shifted question range (Q${minPdfNum}..Q${maxPdfNum}). Normalizing to Q1..Q${maxPdfNum - 50}...`);
    } else if (needsShift100) {
      console.log(`\n📌 Auto-detected shifted question range (Q${minPdfNum}..Q${maxPdfNum}). Normalizing to Q1..Q${maxPdfNum - 100}...`);
    }

    // Apply normalized qIndex
    parsedQuestions.forEach(q => {
      let dbQIndex = q.pdfQNum;
      if (!isNaN(q.pdfQNum)) {
        if (needsShift50) dbQIndex = q.pdfQNum - 50;
        else if (needsShift100) dbQIndex = q.pdfQNum - 100;
      }
      q.qIndex = dbQIndex;

      if (!isPaperII) {
        if (dbQIndex >= 1 && dbQIndex <= 5) q.type = 'di';
        else if (dbQIndex >= 46 && dbQIndex <= 50) q.type = 'comprehension';
      } else {
        if (dbQIndex >= 91 && dbQIndex <= 95) q.type = 'comprehension';
        else if (dbQIndex >= 96 && dbQIndex <= 100) q.type = 'comprehension';
      }

      if (answerKeyMap && q.correct === undefined && !isNaN(dbQIndex) && answerKeyMap[dbQIndex] !== undefined) {
        q.correct = answerKeyMap[dbQIndex];
      }
    });

    // Deduplicate and smart fallback index assignment
    const questionMap = new Map();
    const maxAllowedQuestions = isPaperII ? 100 : 50;
    const unindexedQueue = [];

    parsedQuestions.forEach(q => {
      if (!isNaN(q.qIndex) && q.qIndex >= 1 && q.qIndex <= maxAllowedQuestions) {
        if (!questionMap.has(q.qIndex)) {
          questionMap.set(q.qIndex, q);
        } else {
          const existing = questionMap.get(q.qIndex);
          const existingScore = (existing.text || '').length + (existing.explanation || '').length + (existing.options || []).join('').length;
          const newScore = (q.text || '').length + (q.explanation || '').length + (q.options || []).join('').length;
          if (newScore > existingScore) questionMap.set(q.qIndex, q);
        }
      } else {
        // FIX #5: Log out-of-range question numbers so they are traceable instead of silently dropped
        if (!isNaN(q.qIndex) && q.qIndex > maxAllowedQuestions) {
          console.warn(`  ⚠️  [Out-of-Range] Q${q.qIndex} is outside allowed range (1–${maxAllowedQuestions}). Placing in gap-fill queue (NTA ID: ${q.ntaQuestionId || 'N/A'}).`);
        }
        unindexedQueue.push(q);
      }
    });

    if (unindexedQueue.length > 0) {
      console.log(`\n📌 Auto-assigning ${unindexedQueue.length} questions with bank IDs or non-standard numbering into open slots (in PDF sequence order)...`);
      unindexedQueue.sort((a, b) => (a._arrivalIndex ?? 0) - (b._arrivalIndex ?? 0));
      let queueIdx = 0;
      for (let slot = 1; slot <= maxAllowedQuestions && queueIdx < unindexedQueue.length; slot++) {
        if (!questionMap.has(slot)) {
          const item = unindexedQueue[queueIdx++];
          item.qIndex = slot;
          questionMap.set(slot, item);
          console.log(`   [Auto-Indexed] Assigned Q${slot} ← NTA/Bank ID: ${item.ntaQuestionId || item._arrivalIndex}`);
        }
      }
    }

    const finalQuestions = Array.from(questionMap.values()).sort((a, b) => a.qIndex - b.qIndex);
    console.log(`Original parsed count: ${parsedQuestions.length}. Clean imported count: ${finalQuestions.length}`);
    // FIX #4: Warn clearly if the final count is less than expected
    const missing = maxAllowedQuestions - finalQuestions.length;
    if (missing > 0) {
      console.warn(`\n⚠️  WARNING: Import completed with only ${finalQuestions.length}/${maxAllowedQuestions} questions! ${missing} question(s) missing.`);
      const presentSlots = new Set(finalQuestions.map(q => q.qIndex));
      const missingSlots = [];
      for (let s = 1; s <= maxAllowedQuestions; s++) {
        if (!presentSlots.has(s)) missingSlots.push(s);
      }
      console.warn(`   Missing question numbers: ${missingSlots.join(', ')}`);
      console.warn(`   ➡  Re-run the importer with the same Set ID to resume from checkpoint and fill missing questions.`);
    } else {
      console.log(`✅  All ${maxAllowedQuestions} questions imported successfully!`);
    }

    if (finalQuestions.length > 0) {
      console.log(`Cleaning old questions for Set ${TARGET_SET_ID}...`);
      await Question.deleteMany({ setId: new mongoose.Types.ObjectId(TARGET_SET_ID) });
      
      console.log(`Inserting ${finalQuestions.length} newly parsed questions into database...`);
      await Question.insertMany(finalQuestions);
      
      await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: finalQuestions.length });
      console.log("Database updated successfully!");

      if (fs.existsSync(checkpointFilePath)) {
        fs.unlinkSync(checkpointFilePath);
        console.log(`🧹 [Checkpoint Cleaned] Removed temporary checkpoint file.`);
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
