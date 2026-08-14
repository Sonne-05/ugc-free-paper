const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const { PDFParse } = require('pdf-parse');

// Load environment variables
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

// Interactive terminal input helper
function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

// Utility function to parse answer key PDF text into a mapping object { [qIndex]: correctOption }
function parseAnswerKey(text) {
  const mapping = {};

  // Format E: "[Question ID = X]...[Option ID = Y]"
  const qIdOptionPattern = /\[Question ID\s*=\s*(\d+)\].*?\n(?:.*?\n)*?1\.\s*1\s*\[Option ID\s*=\s*(\d+)\]/g;
  const formatEMatches = [];
  let fmatch;
  while ((fmatch = qIdOptionPattern.exec(text)) !== null) {
    formatEMatches.push({ questionId: fmatch[1], firstOptionId: parseInt(fmatch[2], 10), index: fmatch.index });
  }

  if (formatEMatches.length > 0) {
    const qIdToFirstOption = {};
    for (const m of formatEMatches) {
      qIdToFirstOption[m.questionId] = m.firstOptionId;
    }

    const correctPattern = /\[Question ID\s*=\s*(\d+)\].*?(\d+)\.\s*(\d+)\s*\[Option ID\s*=\s*(\d+)\]/gs;
    let cp;
    while ((cp = correctPattern.exec(text)) !== null) {
      const questionId = cp[1];
      const listedOptionNum = parseInt(cp[3], 10);
      if (listedOptionNum >= 1 && listedOptionNum <= 4 && qIdToFirstOption[questionId] !== undefined) {
        mapping[`qid:${questionId}`] = listedOptionNum;
      }
    }

    if (Object.keys(mapping).some(k => k.startsWith('qid:'))) {
      return mapping;
    }
  }

  // Standard line-by-line format
  const lines = text.split('\n');
  for (const line of lines) {
    let cleanLine = line.trim();
    if (!cleanLine) continue;

    cleanLine = cleanLine
      .replace(/\s*\|\s*/g, '1 ')
      .replace(/\]/g, '1')
      .replace(/\bT(\d+)\b/g, '7$1')
      .replace(/\bl(\d+)\b/g, '1$1')
      .replace(/\bI(\d+)\b/g, '1$1')
      .replace(/\bl\b/g, '1')
      .replace(/\bI\b/g, '1')
      .replace(/\big\b/g, '11');

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

    const cleanTokens = tokens.map(t => t.replace(/^[Qq]/, '').replace(/[.:]$/, '').trim()).filter(Boolean);
    const optionMap = {
      'a': 1, 'b': 2, 'c': 3, 'd': 4,
      '1': 1, '2': 2, '3': 3, '4': 4,
      'dropped': 0, 'drop': 0, 'null': 0, '0': 0
    };

    for (let i = 0; i < cleanTokens.length - 1; i += 2) {
      const q = parseInt(cleanTokens[i], 10);
      const a = optionMap[cleanTokens[i + 1].toLowerCase()];
      if (!isNaN(q) && q >= 1 && q <= 9999999 && a !== undefined) {
        mapping[q] = a;
        mapping[String(q)] = a;
      }
    }
  }

  return mapping;
}

// Define Mongoose Models
const QuestionSchema = new mongoose.Schema({
  setId: mongoose.Schema.Types.ObjectId,
  qIndex: Number,
  ntaQuestionId: String,
  unit: String,
  type: {
    type: String,
    enum: ['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di']
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
  passage: String
}, { collection: 'questions' });

const PyqSetSchema = new mongoose.Schema({
  title: String,
  paperType: { type: String, enum: ['Paper I', 'Paper II'], default: 'Paper I' },
  questionsLoaded: Number
}, { collection: 'pyqsets' });

const Question = mongoose.model('Question', QuestionSchema);
const PyqSet = mongoose.model('PyqSet', PyqSetSchema);

// Key Pool & Rate Limiter
function setupKeyPool() {
  const geminiKeys = (process.env.GEMINI_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  
  const groqKeys = (process.env.GROQ_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  const geminiHistory = geminiKeys.map(() => []);
  const geminiCooldowns = geminiKeys.map(() => 0);
  const groqCooldowns = groqKeys.map(() => 0);

  return {
    geminiKeys,
    groqKeys,
    geminiHistory,
    geminiCooldowns,
    groqCooldowns,
    geminiIndex: 0,
    groqIndex: 0,
    PER_KEY_RPM: 15, // Conservative safe RPM per project
    
    async getNextGeminiKey() {
      if (this.geminiKeys.length === 0) return null;
      const now = Date.now();
      const windowMs = 60000;

      // Purge expired timestamps
      for (let i = 0; i < this.geminiHistory.length; i++) {
        this.geminiHistory[i] = this.geminiHistory[i].filter(ts => now - ts < windowMs);
      }

      // Round-Robin search across all available keys
      for (let attempt = 0; attempt < this.geminiKeys.length; attempt++) {
        const idx = (this.geminiIndex + attempt) % this.geminiKeys.length;
        if (this.geminiCooldowns[idx] <= now && this.geminiHistory[idx].length < this.PER_KEY_RPM) {
          this.geminiIndex = (idx + 1) % this.geminiKeys.length;
          this.geminiHistory[idx].push(now);
          return { key: this.geminiKeys[idx], keyIndex: idx };
        }
      }

      // If all keys busy/cooling, calculate earliest free time
      let earliest = Infinity;
      for (let i = 0; i < this.geminiKeys.length; i++) {
        if (this.geminiCooldowns[i] > now) {
          earliest = Math.min(earliest, this.geminiCooldowns[i]);
        }
        if (this.geminiHistory[i].length >= this.PER_KEY_RPM && this.geminiHistory[i].length > 0) {
          earliest = Math.min(earliest, this.geminiHistory[i][0] + windowMs);
        }
      }

      const waitMs = Math.max(earliest - Date.now() + 200, 500);
      if (waitMs > 0 && waitMs < 60000) {
        console.log(`[Rate Limiter] All Gemini keys busy. Waiting ${(waitMs / 1000).toFixed(1)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
        return this.getNextGeminiKey();
      }

      return null;
    },

    coolDownGeminiKey(keyIndex, seconds) {
      if (keyIndex >= 0 && keyIndex < this.geminiCooldowns.length) {
        this.geminiCooldowns[keyIndex] = Date.now() + (seconds * 1000) + 1000;
      }
    },

    getNextGroqKey() {
      if (this.groqKeys.length === 0) return null;
      const now = Date.now();
      for (let attempt = 0; attempt < this.groqKeys.length; attempt++) {
        const idx = (this.groqIndex + attempt) % this.groqKeys.length;
        if (this.groqCooldowns[idx] <= now) {
          this.groqIndex = (idx + 1) % this.groqKeys.length;
          return { key: this.groqKeys[idx], keyIndex: idx };
        }
      }
      return null;
    },

    coolDownGroqKey(keyIndex, seconds) {
      if (keyIndex >= 0 && keyIndex < this.groqCooldowns.length) {
        this.groqCooldowns[keyIndex] = Date.now() + (seconds * 1000) + 1000;
      }
    }
  };
}

function cleanJsonString(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const jsonMatch = cleaned.match(/({[\s\S]*}|\[[\s\S]*\])/);
  if (jsonMatch) cleaned = jsonMatch[1];
  return cleaned;
}

// Call AI using Groq (Primary) with Infinite Circular Fallback to Gemini (Secondary) and Back to Groq
async function callAiStructuring(prompt, keyPool, retryCount = 0) {
  // 1. Try Groq first as Primary
  const groqInfo = keyPool.getNextGroqKey();
  if (groqInfo) {
    const { key: groqKey, keyIndex: groqKeyIndex } = groqInfo;
    try {
      const groqModels = [process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
      
      for (const groqModel of groqModels) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          signal: AbortSignal.timeout(35000),
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: 'user', content: prompt + '\nReturn ONLY valid JSON matching {"questions": [...]}.' }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
            max_tokens: 2048
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(cleanJsonString(content));
          return parsed.questions || (Array.isArray(parsed) ? parsed : []);
        } else {
          const groqErrText = await groqRes.text();
          if (groqRes.status === 429) {
            if (groqModel !== 'llama-3.1-8b-instant') {
              console.warn(`[Groq 70B Quota Reached] Switching to Groq Llama 3.1 8B Instant (500k TPD)...`);
              continue;
            } else {
              console.warn(`[Groq 429] Groq Key #${groqKeyIndex + 1} rate limited. Cooling for 30s. Switching to Gemini fallback...`);
              keyPool.coolDownGroqKey(groqKeyIndex, 30);
            }
          } else {
            console.warn(`[Groq ${groqRes.status} on ${groqModel}]: ${groqErrText.substring(0, 150)}`);
          }
        }
      }
    } catch (groqErr) {
      console.warn(`[Groq Error]: ${groqErr.message}. Switching to Gemini fallback...`);
    }
  }

  // 2. Fallback to Gemini (Secondary) across 21 keys
  const geminiInfo = await keyPool.getNextGeminiKey();
  if (geminiInfo) {
    const { key, keyIndex } = geminiInfo;
    console.log(`[AI Fallback] Routing batch to Gemini Key #${keyIndex + 1}...`);
    const geminiModels = [
      process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.6-pro',
      'gemini-pro-latest'
    ];

    for (const modelName of geminiModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  questions: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        qIndex: { type: 'INTEGER' },
                        ntaQuestionId: { type: 'STRING' },
                        unit: { type: 'STRING' },
                        type: {
                          type: 'STRING',
                          enum: ['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di']
                        },
                        text: { type: 'STRING' },
                        options: { type: 'ARRAY', items: { type: 'STRING' } },
                        statements: { type: 'ARRAY', items: { type: 'STRING' } },
                        correct: { type: 'INTEGER' },
                        assertion: { type: 'STRING' },
                        reason: { type: 'STRING' },
                        list1: { type: 'ARRAY', items: { type: 'STRING' } },
                        list2: { type: 'ARRAY', items: { type: 'STRING' } },
                        list1Header: { type: 'STRING' },
                        list2Header: { type: 'STRING' },
                        passage: { type: 'STRING' },
                        explanation: { type: 'STRING' }
                      },
                      required: ['qIndex', 'type', 'text', 'options', 'correct', 'explanation']
                    }
                  }
                },
                required: ['questions']
              }
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const parsed = JSON.parse(cleanJsonString(rawJson));
          return parsed.questions || (Array.isArray(parsed) ? parsed : []);
        }

        const errText = await res.text();
        if (res.status === 503 || res.status === 404 || (res.status === 400 && errText.includes('models/'))) {
          console.warn(`[Gemini ${res.status} on ${modelName}] Trying next active Gemini model in cascade...`);
          continue;
        }

        if (res.status === 429 && retryCount < 30) {
          const retryMatch = errText.match(/Please retry in ([\d\.]+)s/i) || errText.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
          const waitSec = retryMatch ? parseFloat(retryMatch[1]) : 15;
          console.warn(`[Gemini 429] Key #${keyIndex + 1} Rate Limit. Cooling for ${waitSec}s. Switching back to Groq / next Gemini key...`);
          keyPool.coolDownGeminiKey(keyIndex, waitSec);
          return callAiStructuring(prompt, keyPool, retryCount + 1);
        }
        console.warn(`[Gemini API Error] Model ${modelName} Status ${res.status}: ${errText.substring(0, 150)}`);
      } catch (gErr) {
        console.warn(`[Gemini Network Error on ${modelName}]: ${gErr.message}`);
      }
    }
  }

  // 3. Circular Loop: If Gemini fails / rate-limits, loop back to Groq after short pause
  if (retryCount < 30) {
    console.warn(`[AI Failover] Both Groq and Gemini currently cooling. Retrying in 2s (Attempt ${retryCount + 1}/30)...`);
    await new Promise(r => setTimeout(r, 2000));
    return callAiStructuring(prompt, keyPool, retryCount + 1);
  }

  throw new Error('All AI providers (Groq, Gemini) exhausted after 30 retry cycles.');
}

function buildPrompt(batch, compPassages, answerKeyMap, isPaperII, importLanguage) {
  let prompt = `You are an expert UGC NET ${isPaperII ? 'Paper II' : 'Paper I'} exam parser with deep mastery in English, Hindi (हिन्दी), and Sindhi (सिन्धी - देवनागरी).
Analyze the following ${batch.length} questions from the exam paper.

Target Language & Script Rules (STRICT ENFORCEMENT):
Selected Language: "${importLanguage}".

1. If "${importLanguage}" is "Hindi":
   - Extract the entire question prompt, statements, and all 4 options strictly in HINDI (हिन्दी) using DEVANAGARI script.
   - If the original paper has English + Hindi side-by-side or stacked, isolate and extract ONLY the Hindi Devanagari text.
   - The "explanation" field MUST be written in clear, accurate academic Hindi (हिन्दी) using Devanagari script with HTML formatting (<p>, <strong>, <ul>, <li>).

2. If "${importLanguage}" is "Sindhi":
   - In UGC NET Sindhi papers, questions are given in both Devanagari script (देवनागरी) and Perso-Arabic script (سنڌي).
   - You MUST extract ONLY the Sindhi text written in DEVANAGARI (देवनागरी) script.
   - Completely DISCARD and STRIP ALL Perso-Arabic / Urdu script characters and lines.
   - Accurately preserve Sindhi Devanagari phonetic letters (such as ॻ, ॼ, ॾ, ॿ, ङ, ञ, ड़, ढ़, ॴ, ॵ, etc.).
   - The "explanation" field must be written in clear Sindhi Devanagari (or standard academic Devanagari) with rich step-by-step reasoning.

3. If "${importLanguage}" is "English":
   - Extract ONLY the English text for question text, statements, and 4 options.
   - Discard all Hindi, Sindhi, Devanagari, and Perso-Arabic translations or annotations.
   - The "explanation" field must be written in English.

4. If "${importLanguage}" is "Bilingual":
   - Provide English text first, followed by the Devanagari translation on a new line for question text and options.

Common Formatting Rules:
1. Extract true question text and exactly 4 clean options (Option 1, 2, 3, 4). Filter out system footers, marks, question paper metadata, and OCR noise.
2. Determine correct option index (1, 2, 3, or 4).
3. Classify question type accurately:
   - 'mcq': standard 4-option single choice.
   - 'assertion-reason': contains "Assertion (A)" and "Reason (R)" or "अभिकथन (A)" and "कारण (R)". Fill "assertion" and "reason" fields.
   - 'match-column': matching lists (List I / List II or सूची I / सूची II).
     CRITICAL FOR 'match-column':
     * In UGC NET text, List I items are labeled (A), (B), (C), (D) and List II items are labeled (I), (II), (III), (IV) (often side-by-side on the same line or with OCR variations like {i}, (ft), (1), (Il}, (I{l})).
     * You MUST separate them: extract the 4 List I items into "list1" array and the 4 List II items into "list2" array.
     * Put the 4 combination choices (e.g. "(A)-(III), (B)-(I), (C)-(IV), (D)-(II)") into the "options" array.
     * Set "list1Header" to "List - I" and "list2Header" to "List - II".
     * NEVER leave "list1" or "list2" empty for a match-column question!
   - 'multiple-statement': statements (A, B, C, D, E or I, II, III, IV / कथन) followed by combination options (e.g., "(1) A and B only" / "(1) केवल A और B"). Fill "statements" array and combination options in "options".
   - 'di': Data Interpretation (Q1-5 in Paper I). Fill "passage" field with table/data.
   - 'comprehension': Reading Comprehension / गद्यांश. Fill "passage" field.
4. Generate a rich, high-quality step-by-step HTML explanation (100-150 words) with <p>, <strong>, <ul>, <li> tags in the selected target language.

Questions to process:\n\n`;

  if (answerKeyMap) {
    prompt += `Official Answer Key Hints:\n`;
    batch.forEach(q => {
      const lookup = q.pdfQNum || q.qIndex;
      let ans = answerKeyMap[lookup] || (q.qId ? answerKeyMap[`qid:${q.qId}`] : undefined);
      if (ans !== undefined) {
        prompt += `- Q${q.qIndex}: Option ${ans}\n`;
      }
    });
    prompt += `\n`;
  }

  const compKeys = Object.keys(compPassages || {});
  const passage1Id = compKeys[0];
  const passage2Id = compKeys[1];

  let passageContext = '';
  if (!isPaperII) {
    if (batch.some(q => q.qIndex >= 1 && q.qIndex <= 5) && passage1Id && compPassages[passage1Id]) {
      passageContext = `[DI Passage Context:\n${compPassages[passage1Id].substring(0, 1500)}]\n\n`;
    } else if (batch.some(q => q.qIndex >= 46 && q.qIndex <= 50) && passage2Id && compPassages[passage2Id]) {
      passageContext = `[RC Passage Context:\n${compPassages[passage2Id].substring(0, 1500)}]\n\n`;
    }
  } else {
    if (batch.some(q => q.qIndex >= 91 && q.qIndex <= 95) && passage1Id && compPassages[passage1Id]) {
      passageContext = `[RC Passage Context:\n${compPassages[passage1Id].substring(0, 1500)}]\n\n`;
    } else if (batch.some(q => q.qIndex >= 96 && q.qIndex <= 100) && passage2Id && compPassages[passage2Id]) {
      passageContext = `[RC Passage Context:\n${compPassages[passage2Id].substring(0, 1500)}]\n\n`;
    }
  }

  if (passageContext) prompt += passageContext;

  batch.forEach(q => {
    prompt += `--- QUESTION ${q.qIndex} (Raw ID: ${q.qId}) ---\n`;
    prompt += q.text + '\n\n';
  });

  return prompt;
}

// Main CLI Execution
async function main() {
  console.log('\n======================================================');
  console.log('⚡ High-Speed Zero-Token Text Question Importer');
  console.log('======================================================\n');

  let PDF_PATH = process.argv[2];
  let TARGET_SET_ID = process.argv[3];
  let LANGUAGE = process.argv[4];
  let ANSWER_KEY_PATH = process.argv[5];

  if (!PDF_PATH) {
    PDF_PATH = await askQuestion('Enter the absolute path to your Questions PDF file: ');
  }
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Error: PDF file does not exist: "${PDF_PATH}"`);
    process.exit(1);
  }

  if (!TARGET_SET_ID) {
    TARGET_SET_ID = await askQuestion('Enter the Target PyqSet MongoDB ID: ');
  }
  if (!mongoose.Types.ObjectId.isValid(TARGET_SET_ID)) {
    console.error('Error: Invalid MongoDB ObjectId.');
    process.exit(1);
  }

  if (!LANGUAGE) {
    LANGUAGE = process.argv[2] ? 'English' : ((await askQuestion('Enter Target Language (English/Hindi/Sindhi/Bilingual) [Default: English]: ')) || 'English');
  }
  if (!ANSWER_KEY_PATH && !process.argv[2]) {
    ANSWER_KEY_PATH = await askQuestion('Enter Answer Key PDF path (optional, press Enter to skip): ');
  }
  let answerKeyMap = null;

  if (ANSWER_KEY_PATH && fs.existsSync(ANSWER_KEY_PATH)) {
    console.log('Parsing Answer Key PDF...');
    try {
      const keyBuffer = fs.readFileSync(ANSWER_KEY_PATH);
      const keyParser = new PDFParse({ data: keyBuffer });
      const parsedKey = await keyParser.getText();
      answerKeyMap = parseAnswerKey(parsedKey.text);
      console.log(`Mapped ${Object.keys(answerKeyMap).length} answers from Answer Key.`);
    } catch (kErr) {
      console.warn(`Warning: Could not parse answer key: ${kErr.message}`);
    }
  }

  try {
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database!');

    const targetSet = await PyqSet.findById(TARGET_SET_ID);
    if (!targetSet) {
      throw new Error(`Target set ${TARGET_SET_ID} not found in database.`);
    }
    const isPaperII = targetSet.paperType === 'Paper II';
    console.log(`Target Set: "${targetSet.title}" (${targetSet.paperType || 'Paper I'})`);

    // 1. Extract raw text from PDF
    console.log('\n[1/4] Extracting raw text from PDF on your local PC...');
    const fileBuffer = fs.readFileSync(PDF_PATH);
    const parser = new PDFParse({ data: fileBuffer });
    const parsedPdf = await parser.getText();
    const text = parsedPdf.text || '';

    console.log(`Extracted ${text.length} characters of raw text.`);
    if (text.length < 500) {
      console.warn('⚠️  Warning: PDF text is extremely short or empty. This may be a scanned image PDF.');
      const proceed = await askQuestion('Continue anyway? (y/n): ');
      if (proceed.toLowerCase() !== 'y') process.exit(0);
    }

    // 2. Multi-Format Question Header Detection
    console.log('[2/4] Slicing questions into structured blocks...');
    const qHeaderRegex = /Question Number\s*:\s*(\d+)\s+Question Id\s*:\s*(\d+)/g;
    let match;
    const matchesList = [];
    let cleanQuestions = [];

    // Format A: Question Number : X Question Id : Y
    while ((match = qHeaderRegex.exec(text)) !== null) {
      matchesList.push({ index: match.index, qNum: parseInt(match[1], 10), qId: match[2] });
    }

    // Format B: Q.X ... Question ID : Y
    if (matchesList.length === 0) {
      const qPattern = /^Q\s*\.\s*(\d+)\b/gm;
      const qMatches = [];
      while ((match = qPattern.exec(text)) !== null) {
        qMatches.push({ index: match.index, qNum: parseInt(match[1], 10) });
      }
      for (let i = 0; i < qMatches.length; i++) {
        const nextIndex = (i + 1 < qMatches.length) ? qMatches[i + 1].index : text.length;
        const block = text.substring(qMatches[i].index, nextIndex);
        const idMatch = /Question\s*ID\s*:\s*(\d+)/i.exec(block);
        if (idMatch) {
          matchesList.push({ index: qMatches[i].index, qNum: qMatches[i].qNum, qId: idMatch[1] });
        }
      }
    }

    // Format D: SI. No. X \n QBID: Y
    if (matchesList.length === 0) {
      const siNoRegex = /SI\.\s*No\.(\d+)\s*\n?QBID\s*:?\s*(\d+)/g;
      while ((match = siNoRegex.exec(text)) !== null) {
        matchesList.push({ index: match.index, qNum: parseInt(match[1], 10), qId: match[2] });
      }
    }

    // Format E: [Question ID = X][Question Description = ...Q01]
    if (matchesList.length === 0) {
      const qIdRegex = /\[Question ID\s*=\s*(\d+)\](?:\[Question Description\s*=\s*([^\]]+)\])?/g;
      const allFormatEMatches = [];
      while ((match = qIdRegex.exec(text)) !== null) {
        let qNum = null;
        if (match[2]) {
          const numMatch = match[2].match(/_Q0*(\d+)/i) || match[2].match(/_(\d+)$/);
          if (numMatch) qNum = parseInt(numMatch[1], 10);
        }
        allFormatEMatches.push({
          index: match.index,
          matchLength: match[0].length,
          qId: match[1],
          desc: match[2] || '',
          qNum
        });
      }

      if (allFormatEMatches.length > 0) {
        console.log(`Detected Format E: found ${allFormatEMatches.length} [Question ID] markers.`);
        
        // Filter based on Paper Type (Paper II vs Paper I / GP)
        let targetMatches = allFormatEMatches;
        if (isPaperII && allFormatEMatches.some(m => /_GP\d+/i.test(m.desc))) {
          targetMatches = allFormatEMatches.filter(m => !/_GP\d+/i.test(m.desc));
        } else if (!isPaperII && allFormatEMatches.some(m => /_GP\d+/i.test(m.desc))) {
          targetMatches = allFormatEMatches.filter(m => /_GP\d+/i.test(m.desc));
        }

        for (let i = 0; i < targetMatches.length; i++) {
          const cur = targetMatches[i];
          const prevMatch = i > 0 ? targetMatches[i - 1] : null;
          let textStart = 0;
          if (prevMatch) {
            const prevBlock = text.substring(prevMatch.index, cur.index);
            const lastOpt = prevBlock.lastIndexOf('[Option ID');
            if (lastOpt !== -1) {
              const bracketEnd = prevBlock.indexOf(']', lastOpt);
              textStart = prevMatch.index + (bracketEnd !== -1 ? bracketEnd + 1 : lastOpt + 10);
            } else {
              textStart = prevMatch.index + prevMatch.matchLength;
            }
          }
          const rawQText = text.substring(textStart, cur.index)
            .replace(/^[\s\d\)\-\.]+/g, '')
            .replace(/Topic:‐\s*[^\n]+\n/gi, '')
            .trim();

          const nextMatch = i + 1 < targetMatches.length ? targetMatches[i + 1] : null;
          let optEnd = nextMatch ? nextMatch.index : text.length;
          if (nextMatch) {
            const betweenBlock = text.substring(cur.index, nextMatch.index);
            const lastOpt = betweenBlock.lastIndexOf('[Option ID');
            if (lastOpt !== -1) {
              const bracketEnd = betweenBlock.indexOf(']', lastOpt);
              optEnd = cur.index + (bracketEnd !== -1 ? bracketEnd + 1 : betweenBlock.length);
            }
          }
          const rawOptText = text.substring(cur.index + cur.matchLength, optEnd).trim();

          cleanQuestions.push({
            qIndex: cur.qNum || (i + 1),
            pdfQNum: cur.qNum || (i + 1),
            qId: cur.qId,
            text: rawQText + '\n' + rawOptText
          });
        }
      }
    }

    // Comprehension Passages
    const compPassages = {};
    const compRegex = /Question Id\s*:\s*(\d+)\s+Question Type\s*:\s*(COMPREHENSION)/g;
    while ((match = compRegex.exec(text)) !== null) {
      const qId = match[1];
      if (!compPassages[qId]) {
        const nextIdx = text.indexOf('Sub questions', match.index);
        compPassages[qId] = text.substring(match.index, nextIdx > -1 ? nextIdx : match.index + 2000);
      }
    }

    if (cleanQuestions.length === 0 && matchesList.length > 0) {
      console.log(`Detected ${matchesList.length} question markers.`);
      let startQNum = 1;
      let endQNum = isPaperII ? 100 : 50;
      let qNumOffset = 0;

      if (isPaperII && matchesList.some(m => m.qNum >= 51 && m.qNum <= 150)) {
        startQNum = 51;
        endQNum = 150;
        qNumOffset = 50;
      }

      const questionsMap = new Map();
      for (let i = 0; i < matchesList.length; i++) {
        const current = matchesList[i];
        if (current.qNum < startQNum || current.qNum > endQNum) continue;

        const nextIndex = (i + 1 < matchesList.length) ? matchesList[i + 1].index : text.length;
        const questionBlockText = text.substring(current.index, nextIndex);

        if (!questionsMap.has(current.qId)) {
          questionsMap.set(current.qId, {
            qIndex: current.qNum - qNumOffset,
            pdfQNum: current.qNum,
            qId: current.qId,
            text: questionBlockText
          });
        }
      }

      cleanQuestions = Array.from(questionsMap.values()).sort((a, b) => a.qIndex - b.qIndex);
    }

    console.log(`Filtered ${cleanQuestions.length} unique questions for processing.`);

    if (cleanQuestions.length === 0) {
      throw new Error('No structured questions could be sliced from the PDF text.');
    }

    // 3. Batch AI Processing with Checkpoint
    const checkpointFile = path.resolve(`checkpoint_fast_${TARGET_SET_ID}.json`);
    let completedQuestions = [];
    let processedIndices = new Set();

    if (fs.existsSync(checkpointFile)) {
      try {
        const cp = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
        if (cp.setId === TARGET_SET_ID && Array.isArray(cp.questions)) {
          completedQuestions = cp.questions;
          processedIndices = new Set(completedQuestions.map(q => q.qIndex));
          console.log(`📌 Found checkpoint! Resuming with ${completedQuestions.length} already processed questions.`);
        }
      } catch (_) {}
    }

    const keyPool = setupKeyPool();
    const batches = [];
    const pendingQuestions = cleanQuestions.filter(q => !processedIndices.has(q.qIndex));

    for (let i = 0; i < pendingQuestions.length; i += 4) {
      batches.push(pendingQuestions.slice(i, i + 4));
    }

    console.log(`\n[3/4] Processing ${batches.length} remaining batches using Groq Llama 3.3 (Primary) with Multi-Gemini Fallback (${keyPool.geminiKeys.length} Gemini keys)...`);

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      console.log(`Processing Batch ${b + 1}/${batches.length} (Q${batch[0].qIndex} - Q${batch[batch.length - 1].qIndex})...`);

      const prompt = buildPrompt(batch, compPassages, answerKeyMap, isPaperII, LANGUAGE);
      let batchResults = [];

      try {
        batchResults = await callAiStructuring(prompt, keyPool);
        if (!Array.isArray(batchResults) || batchResults.length < batch.length) {
          throw new Error(`Incomplete batch returned: got ${batchResults ? batchResults.length : 0}/${batch.length}`);
        }
      } catch (batchErr) {
        console.warn(`Batch had missing items (${batchErr.message}). Retrying missing items individually...`);
        const returnedIndices = new Set((batchResults || []).map(r => r.qIndex));
        for (const singleQ of batch) {
          if (!returnedIndices.has(singleQ.qIndex)) {
            try {
              const singlePrompt = buildPrompt([singleQ], compPassages, answerKeyMap, isPaperII, LANGUAGE);
              const singleRes = await callAiStructuring(singlePrompt, keyPool);
              if (singleRes && singleRes.length > 0) {
                if (!batchResults) batchResults = [];
                batchResults.push(singleRes[0]);
              }
            } catch (singleErr) {
              console.error(`Failed to process Q${singleQ.qIndex}: ${singleErr.message}`);
            }
          }
        }
      }

function extractRawQuestionText(rawBlock) {
  if (!rawBlock) return '';
  let cleaned = rawBlock
    .replace(/^Question Number\s*:\s*\d+[\s\S]*?Option Orientation\s*:\s*\w+/i, '')
    .replace(/^Question Number\s*:\s*\d+[\s\S]*?Wrong Marks\s*:\s*\d+/i, '')
    .replace(/^SI\.\s*No\.?\s*\d+[\s\S]*?QBID\s*:\s*\d+/i, '')
    .replace(/^\[Question ID\s*=\s*\d+\][\s\S]*?\[Question Description\s*=\s*[^\]]+\]/i, '')
    .replace(/Options\s*:[\s\S]*$/i, '')
    .replace(/\n\s*1\.\s+[\s\S]*$/i, '')
    .replace(/\n\s*\(1\)\s+[\s\S]*$/i, '')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, '')
    .trim();
  return cleaned;
}

      // Map and sanitize batch results
      (batchResults || []).forEach((q, idx) => {
        const matched = batch.find(item => item.qIndex === q.qIndex || item.pdfQNum === q.qIndex) || batch[idx];
        const qIndex = matched ? matched.qIndex : (q.qIndex || completedQuestions.length + 1);

        let finalPromptText = (q.text || q.question || q.questionText || q.prompt || '').trim();
        if (!finalPromptText || finalPromptText.startsWith('Question ') || finalPromptText.length < 10) {
          const rawExtracted = extractRawQuestionText(matched?.text);
          if (rawExtracted && rawExtracted.length > 5) {
            finalPromptText = rawExtracted;
          }
        }

        let qType = (q.type || 'mcq').toLowerCase();
        if ((Array.isArray(q.list1) && q.list1.length > 0) || (Array.isArray(q.list2) && q.list2.length > 0) || /^Match\s+(?:the\s+)?List/i.test(finalPromptText)) {
          qType = 'match-column';
          if (finalPromptText.length > 40 && /^Match/i.test(finalPromptText)) {
            finalPromptText = 'Match List - I with List - II.';
          }
        } else if (q.assertion && q.reason) {
          qType = 'assertion-reason';
        } else if (Array.isArray(q.statements) && q.statements.length > 0) {
          qType = 'multiple-statement';
        } else if (!['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di'].includes(qType)) {
          qType = 'mcq';
        }

        const structuredQ = {
          setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
          qIndex: qIndex,
          ntaQuestionId: matched ? matched.qId : (q.ntaQuestionId || ''),
          unit: '',
          type: qType,
          text: finalPromptText || `Question ${qIndex}`,
          options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          statements: Array.isArray(q.statements) ? q.statements : [],
          correct: parseInt(q.correct, 10) || 1,
          explanation: (q.explanation || '<p>Detailed explanation.</p>').trim(),
          assertion: q.assertion || '',
          reason: q.reason || '',
          list1: Array.isArray(q.list1) ? q.list1 : [],
          list2: Array.isArray(q.list2) ? q.list2 : [],
          list1Header: q.list1Header || '',
          list2Header: q.list2Header || '',
          passage: q.passage || ''
        };

        // Override with Answer Key if available
        if (answerKeyMap) {
          const ans = answerKeyMap[qIndex] || (matched && answerKeyMap[`qid:${matched.qId}`]);
          if (ans !== undefined) structuredQ.correct = ans;
        }

        completedQuestions.push(structuredQ);
      });

      // Save Checkpoint
      fs.writeFileSync(checkpointFile, JSON.stringify({
        setId: TARGET_SET_ID,
        questions: completedQuestions,
        updatedAt: new Date().toISOString()
      }, null, 2));

      await new Promise(r => setTimeout(r, 800)); // Smooth pacing
    }

    // Safety Pass: Check for any missing question numbers from 1 to total cleanQuestions
    const finalMap = new Map();
    completedQuestions.forEach(q => finalMap.set(q.qIndex, q));

    const missingQuestions = cleanQuestions.filter(cq => !finalMap.has(cq.qIndex));
    if (missingQuestions.length > 0) {
      console.log(`\n🔍 Found ${missingQuestions.length} missing question(s). Running auto-recovery pass...`);
      for (const misQ of missingQuestions) {
        try {
          console.log(`Auto-recovering Q${misQ.qIndex}...`);
          const singlePrompt = buildPrompt([misQ], compPassages, answerKeyMap, isPaperII, LANGUAGE);
          const singleRes = await callAiStructuring(singlePrompt, keyPool);
          if (singleRes && singleRes.length > 0) {
            const q = singleRes[0];
            const structuredQ = {
              setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
              qIndex: misQ.qIndex,
              ntaQuestionId: misQ.qId || '',
              unit: '',
              type: q.type || 'mcq',
              text: (q.text || `Question ${misQ.qIndex}`).trim(),
              options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
              statements: Array.isArray(q.statements) ? q.statements : [],
              correct: parseInt(q.correct, 10) || 1,
              explanation: (q.explanation || '<p>Detailed explanation.</p>').trim(),
              assertion: q.assertion || '',
              reason: q.reason || '',
              list1: Array.isArray(q.list1) ? q.list1 : [],
              list2: Array.isArray(q.list2) ? q.list2 : [],
              list1Header: q.list1Header || '',
              list2Header: q.list2Header || '',
              passage: q.passage || ''
            };
            if (answerKeyMap) {
              const ans = answerKeyMap[misQ.qIndex] || (misQ.qId && answerKeyMap[`qid:${misQ.qId}`]);
              if (ans !== undefined) structuredQ.correct = ans;
            }
            finalMap.set(misQ.qIndex, structuredQ);
          }
        } catch (recErr) {
          console.error(`Could not auto-recover Q${misQ.qIndex}: ${recErr.message}`);
        }
      }
    }

    // 4. Save to Database
    const finalQuestions = Array.from(finalMap.values()).sort((a, b) => a.qIndex - b.qIndex);
    console.log(`\n[4/4] Committing ${finalQuestions.length} questions to MongoDB...`);

    await Question.deleteMany({ setId: new mongoose.Types.ObjectId(TARGET_SET_ID) });
    await Question.insertMany(finalQuestions);
    await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: finalQuestions.length });

    if (fs.existsSync(checkpointFile)) {
      fs.unlinkSync(checkpointFile);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 SUCCESS: Imported ${finalQuestions.length} questions into Set "${targetSet.title}"!`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('\n❌ Fatal Import Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
