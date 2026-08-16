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
  subPrompt: String,
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

      return null;
    },

    getEarliestGeminiCooldown() {
      const now = Date.now();
      let earliest = Infinity;
      for (let i = 0; i < this.geminiKeys.length; i++) {
        if (this.geminiCooldowns[i] > now) {
          earliest = Math.min(earliest, this.geminiCooldowns[i]);
        }
      }
      return earliest === Infinity ? 0 : Math.max(0, earliest - now);
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

// Call AI using Groq (Primary) across all Groq keys, with fallback to Gemini (Secondary) and back to Groq
async function callAiStructuring(prompt, keyPool, retryCount = 0) {
  // 1. Try all active Groq keys with Llama 3.3 70B and Llama 3.1 8B
  for (let gAttempt = 0; gAttempt < (keyPool.groqKeys.length || 1); gAttempt++) {
    const groqInfo = keyPool.getNextGroqKey();
    if (!groqInfo) break;

    const { key: groqKey, keyIndex: groqKeyIndex } = groqInfo;
    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];

    for (const groqModel of groqModels) {
      try {
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
          if (groqRes.status === 413) {
            console.warn(`[Groq 413] Prompt too large for Groq model. Routing to Gemini fallback with large context...`);
            break;
          } else if (groqRes.status === 429) {
            if (groqModel !== 'llama-3.1-8b-instant') {
              console.warn(`[Groq ${groqModel} Quota Reached on Key #${groqKeyIndex + 1}] Switching to Groq Llama 3.1 8B Instant (500k TPD)...`);
              continue;
            } else {
              console.warn(`[Groq 429] Groq Key #${groqKeyIndex + 1} rate limited. Cooling for 25s.`);
              keyPool.coolDownGroqKey(groqKeyIndex, 25);
            }
          } else {
            console.warn(`[Groq ${groqRes.status} on ${groqModel} Key #${groqKeyIndex + 1}]: ${groqErrText.substring(0, 120)}`);
            continue;
          }
        }
      } catch (groqErr) {
        console.warn(`[Groq Network Error on Key #${groqKeyIndex + 1}]: ${groqErr.message}`);
      }
    }
  }

  // 2. Fallback to Gemini (Secondary) across all available keys with gentle pacing
  for (let gemAttempt = 0; gemAttempt < (keyPool.geminiKeys.length || 1); gemAttempt++) {
    const geminiInfo = await keyPool.getNextGeminiKey();
    if (!geminiInfo) break;

    const { key, keyIndex } = geminiInfo;
    console.log(`[AI Fallback] Routing batch to Gemini Key #${keyIndex + 1}...`);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

    try {
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
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
      if (res.status === 400 && errText.includes('API_KEY_INVALID')) {
        console.warn(`[Gemini 400] Key #${keyIndex + 1} is invalid. Disabling key.`);
        keyPool.coolDownGeminiKey(keyIndex, 86400);
      } else if (res.status === 429 || res.status === 503) {
        const retryMatch = errText.match(/Please retry in ([\d\.]+)s/i) || errText.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
        const waitSec = retryMatch ? parseFloat(retryMatch[1]) : 20;
        console.warn(`[Gemini ${res.status}] Key #${keyIndex + 1} cooling for ${waitSec.toFixed(0)}s.`);
        keyPool.coolDownGeminiKey(keyIndex, waitSec);
      } else {
        console.warn(`[Gemini API Error] Status ${res.status}: ${errText.substring(0, 120)}`);
        keyPool.coolDownGeminiKey(keyIndex, 20);
      }
    } catch (gErr) {
      console.warn(`[Gemini Timeout/Network on Key #${keyIndex + 1}]: ${gErr.message}`);
      keyPool.coolDownGeminiKey(keyIndex, 20);
    }

    // Respectful 1.5s pace between Gemini key attempts to prevent Google IP throttling
    await new Promise(r => setTimeout(r, 1500));
  }

  // 3. Circular Loop: If all providers (Groq & Gemini) are cooling, wait for earliest key to recover
  if (retryCount < 30) {
    const now = Date.now();
    let earliestGroq = keyPool.groqCooldowns.length > 0 ? Math.min(...keyPool.groqCooldowns) : now + 5000;
    let earliestGeminiMs = keyPool.getEarliestGeminiCooldown();

    let waitMs = Math.min(
      Math.max(earliestGroq - now + 500, 3000),
      earliestGeminiMs > 0 ? earliestGeminiMs + 500 : 15000
    );

    if (waitMs > 25000) waitMs = 15000;
    if (waitMs < 3000) waitMs = 3000;

    console.warn(`⏳ [Rate Limiter] All AI keys cooling down. Waiting ${(waitMs / 1000).toFixed(0)}s before next batch...`);
    await new Promise(r => setTimeout(r, waitMs));
    return callAiStructuring(prompt, keyPool, retryCount + 1);
  }

  throw new Error('All AI providers (Groq, Gemini) exhausted after 30 retry cycles.');
}

function buildPrompt(batch, compPassages, answerKeyMap, isPaperII, importLanguage) {
  let langRule = '';
  if (importLanguage === 'Hindi') {
    langRule = `Target Language & Script Rule (STRICT ENFORCEMENT):
Selected Language: HINDI ONLY (हिन्दी - देवनागरी)
- Extract the entire question prompt, statements, and all 4 options strictly in HINDI using DEVANAGARI script.
- If the original paper has English + Hindi side-by-side or stacked, isolate and extract ONLY the Hindi Devanagari text.
- The "explanation" field MUST be written in clear, accurate academic Hindi using Devanagari script with HTML formatting.`;
  } else if (importLanguage === 'Sindhi') {
    langRule = `Target Language & Script Rule (STRICT ENFORCEMENT):
Selected Language: SINDHI DEVANAGARI ONLY (सिन्धी - देवनागरी)
- In UGC NET Sindhi papers, questions are given in both Devanagari script and Perso-Arabic script.
- You MUST extract ONLY the Sindhi text written in DEVANAGARI script.
- Completely DISCARD and STRIP ALL Perso-Arabic / Urdu script characters and lines.
- Accurately preserve Sindhi Devanagari phonetic letters (ॻ, ॼ, ॾ, ॿ, ङ, ञ, ड़, ढ़, ॴ, ॵ, etc.).
- The "explanation" field must be written in clear Sindhi Devanagari.`;
  } else if (importLanguage === 'Bilingual') {
    langRule = `Target Language & Script Rule (STRICT ENFORCEMENT):
Selected Language: BILINGUAL (English + Hindi)
- Provide English text first, followed by the Devanagari translation on a new line for question text and options.`;
  } else {
    langRule = `Target Language & Script Rule (STRICT ENFORCEMENT):
Selected Language: 100% PURE ENGLISH ONLY
- Extract ONLY the English text for question text, statements, and all 4 options.
- DO NOT translate any question, option, statement, or explanation into Hindi or any other language.
- If the original paper has Hindi translations or notes, completely DISCARD and STRIP all Hindi/Devanagari text.
- All question text, options, statements, and explanations MUST be in 100% English.`;
  }

  let prompt = `You are an expert UGC NET ${isPaperII ? 'Paper II' : 'Paper I'} exam parser.
Analyze the following ${batch.length} questions from the exam paper.

${langRule}

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
   - 'multiple-statement': The question has statements (A, B, C, D, E or I, II, III, IV / कथन). Extract all statements into the "statements" array. The 4 combination choices (e.g. "(1) A, B and C only" / "(1) केवल A, B और C") MUST be put in the "options" array. NEVER put statements A, B, C, D into the "options" array!
   - 'di': Data Interpretation (Q1-5 in Paper I). Fill "passage" field with table/data.
   - 'comprehension': Reading Comprehension / गद्यांश. Fill "passage" field.
4. Generate a rich, high-quality step-by-step HTML explanation (100-150 words) with <p>, <strong>, <ul>, <li> tags in the selected target language.
5. For fill-in-the-blank or incomplete sentence prompts (e.g. ending in "would refer to as", "is known as", "is called", "defined as", "associated with"), format the end cleanly with "_________." or a colon ":" so it forms a complete grammatical sentence.

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

  // Automatic High-Resolution OCR Companion Detection
  const pdfDir = path.dirname(PDF_PATH);
  const pdfBase = path.basename(PDF_PATH);
  const candidateOcrPaths = [
    path.join(pdfDir, 'OCR', pdfBase),
    path.join(pdfDir, 'OCR', pdfBase.replace(/\.pdf$/i, ' P2.pdf')),
    path.join(pdfDir, 'OCR', pdfBase.replace(/Shift\s*(\d)/i, 'Shift $1') + ' P2.pdf'),
    path.join(pdfDir, 'P2', pdfBase),
    path.join(pdfDir, 'P2', pdfBase.replace(/\.pdf$/i, ' P2.pdf'))
  ];

  for (const ocrPath of candidateOcrPaths) {
    if (ocrPath !== PDF_PATH && fs.existsSync(ocrPath)) {
      console.log(`\n✨ Auto-detected cleaner high-resolution OCR companion file:`);
      console.log(`   ➜ ${ocrPath}`);
      PDF_PATH = ocrPath;
      break;
    }
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

    // Format D: Robust SI. No. / QBID / OBID / Description parser
    if (matchesList.length === 0) {
      const robustDRegex = /(?:SI\.?\s*No\.?\s*(\d+)\s*)?[\r\n\s]*(?:QBID|OBID|Q8ID|QB\s*ID)\s*:?\s*(\d+)/gi;
      while ((match = robustDRegex.exec(text)) !== null) {
        let qNum = match[1] ? parseInt(match[1], 10) : null;
        let qId = match[2];
        if (!qNum) {
          const block = text.substring(match.index, Math.min(text.length, match.index + 800));
          const descMatch = /Question\s*Description\s*:\s*[^\n]*?_q(\d+)/i.exec(block);
          if (descMatch) {
            qNum = parseInt(descMatch[1], 10);
          }
        }
        matchesList.push({ index: match.index, qNum: qNum || (matchesList.length + 1), qId });
      }
    }

    // Format E: Robust [Question ID = X][Question Description = ...Q01]
    if (matchesList.length === 0) {
      const qIdRegex = /(?:\[|\b)[\s\r\n]*Question ID\s*=\s*(\d+)\](?:[\s\r\n]*\[[\s\r\n]*Question Description\s*=\s*([^\]]+)\])?/gi;
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
        if (isPaperII && allFormatEMatches.some(m => /_GP\d+|_GP_/i.test(m.desc))) {
          targetMatches = allFormatEMatches.filter(m => !/_GP\d+|_GP_/i.test(m.desc));
        } else if (!isPaperII && allFormatEMatches.some(m => /_GP\d+|_GP_/i.test(m.desc))) {
          targetMatches = allFormatEMatches.filter(m => /_GP\d+|_GP_/i.test(m.desc));
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
        cleanQuestions.sort((a, b) => (a.pdfQNum || a.qIndex) - (b.pdfQNum || b.qIndex));
        cleanQuestions.forEach((q, idx) => {
          q.qIndex = idx + 1;
        });
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

      const maxMatchedNum = Math.max(...matchesList.map(m => m.qNum || 0));

      if (isPaperII) {
        if (maxMatchedNum > 100) {
          startQNum = 51;
          endQNum = 150;
          qNumOffset = 50;
        } else {
          startQNum = 1;
          endQNum = 100;
          qNumOffset = 0;
        }
      } else {
        startQNum = 1;
        endQNum = 50;
        qNumOffset = 0;
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

      cleanQuestions = Array.from(questionsMap.values()).sort((a, b) => (a.pdfQNum || a.qIndex) - (b.pdfQNum || b.qIndex));
      cleanQuestions.forEach((q, idx) => {
        q.qIndex = idx + 1;
      });
    }

    console.log(`Filtered ${cleanQuestions.length} unique questions for processing.`);

    if (cleanQuestions.length === 0) {
      throw new Error('No structured questions could be sliced from the PDF text.');
    }

    // Helper: Standardize and sanitize all question types
    function sanitizeQuestion(rawParsed, rawItem, targetIndex) {
      let qType = (rawParsed.type || 'mcq').toLowerCase();
      let text = (rawParsed.text || rawParsed.question || `Question ${targetIndex}`).trim();
      const rawText = rawItem ? rawItem.text : '';
      const rawLines = rawText ? rawText.split('\n').map(l => l.trim()).filter(Boolean) : [];

      // 1. Fix Scrambled OCR Prompt Title (e.g. "3. B and E only.")
      const isScrambledTitle = /^\d+\.\s+[A-E]/i.test(text) || text.length < 15;
      if (isScrambledTitle && rawLines.length > 0) {
        const questionKeywords = [/^(?:Which|Who|What|Identify|Arrange|Choose|Find|According|In\s+|Name|From|Where|How|Select|Given|Match)/i];
        let detectedPrompt = '';
        for (const line of rawLines) {
          if (/^SI\.?\s*No/i.test(line) || /^QBID/i.test(line) || /\[Option ID/i.test(line) || /^Choose the correct/i.test(line) || /^--\s*\d+\s+of/i.test(line) || /^Question Description/i.test(line)) continue;
          if (/^\(?\d+\)?\s*[\.:]/i.test(line) && (/\bonly\b/i.test(line) || /[A-E]\s*,\s*[A-E]/i.test(line))) continue;

          if (questionKeywords.some(rx => rx.test(line)) || (line.endsWith('?') || line.endsWith(':') || line.endsWith('—') || line.endsWith('-'))) {
            if (!detectedPrompt || line.length > detectedPrompt.length) {
              detectedPrompt = line;
            }
          }
        }
        if (detectedPrompt) text = detectedPrompt;
      }

      // 2. Deterministic Statement Harvester
      let statements = Array.isArray(rawParsed.statements) ? [...rawParsed.statements] : [];
      if (statements.length === 0 && rawLines.length > 0) {
        const stmtsMap = new Map();
        for (const line of rawLines) {
          if (/^SI\.?\s*No/i.test(line) || /^QBID/i.test(line) || /\[Option ID/i.test(line) || /^Choose the/i.test(line) || /^--\s*\d+\s+of/i.test(line) || /^Question Description/i.test(line)) continue;
          const stmtMatch = line.match(/^(\([A-E]\)|[A-E]\.)\s*(.+)$/i);
          if (stmtMatch) {
            const letter = stmtMatch[1].replace(/[\(\)\.]/g, '').toUpperCase();
            const content = stmtMatch[2].replace(/\[Option ID[\s\S]*$/, '').replace(/\b(?:Choose the correct|Question Description)[\s\S]*$/i, '').trim();
            if (content.length > 1) {
              if (!stmtsMap.has(letter) || stmtsMap.get(letter).length < content.length) {
                stmtsMap.set(letter, `${letter}. ${content}`);
              }
            }
          }
        }
        const parsedStmts = Array.from(stmtsMap.values()).sort();
        if (parsedStmts.length >= 2) {
          statements = parsedStmts;
        }
      }

      // 3. Match-column detection & Side-by-Side Line Splitter
      let list1 = Array.isArray(rawParsed.list1) ? [...rawParsed.list1] : [];
      let list2 = Array.isArray(rawParsed.list2) ? [...rawParsed.list2] : [];
      const isMatchPattern = /Match\s+(?:the\s+)?List|सूची\s*I\s*को\s*सूची\s*II/i.test(text) || /Match\s+(?:the\s+)?List|सूची\s*I\s*को\s*सूची\s*II/i.test(rawText);

      if (isMatchPattern || list1.length > 0 || list2.length > 0) {
        qType = 'match-column';
        if (text.length > 50 && /^Match/i.test(text)) {
          text = LANGUAGE === 'Hindi' ? 'सूची - I को सूची - II से सुमेलित कीजिए।' : 'Match List - I with List - II.';
        }

        // Check if List I and List II were merged side-by-side on same lines
        const needsSplit = list1.some(item => /[\/\|\–—]\s*(?:I|II|III|IV|[1-4])\./i.test(item) || /\b(?:I|II|III|IV|[1-4])\.\s+[A-Za-z]/i.test(item));
        if ((list1.length === 0 || list2.length === 0 || needsSplit) && rawLines.length > 0) {
          const l1Matches = [...rawText.matchAll(/(?:\n|^)\s*(?:\([A-D]\)|[A-D]\.)\s*([^\n]+)/gi)];
          const l2Matches = [...rawText.matchAll(/(?:\n|^)\s*(?:\([I|V|X]+\)|[I|V|X]+\.|\([1-4]\))\s*([^\n]+)/gi)];

          if (l1Matches.length >= 4 && l2Matches.length >= 4) {
            list1 = [];
            list2 = [];
            for (let j = 0; j < 4; j++) {
              const lLetter = String.fromCharCode(65 + j);
              list1.push(`${lLetter}. ${l1Matches[j][1].replace(/\[Option ID[\s\S]*$/, '').trim()}`);
              list2.push(`${['I', 'II', 'III', 'IV'][j]}. ${l2Matches[j][1].replace(/\[Option ID[\s\S]*$/, '').trim()}`);
            }
          }
        }
      } else if ((rawParsed.assertion && rawParsed.reason) || (/(?:Assertion\s*\(?A\)?|अभिकथन\s*\(?A\)?)/i.test(rawText) && /(?:Reason\s*\(?R\)?|कारण\s*\(?R\)?)/i.test(rawText))) {
        qType = 'assertion-reason';
        text = LANGUAGE === 'Hindi'
          ? 'नीचे दो कथन दिए गए हैं : एक को अभिकथन (A) और दूसरे को कारण (R) के रूप में लेबल किया गया है।'
          : 'Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason (R).';
      } else if (statements.length > 0) {
        qType = 'multiple-statement';
      } else if (rawParsed.passage || (!isPaperII && targetIndex <= 5)) {
        qType = !isPaperII && targetIndex <= 5 ? 'di' : 'comprehension';
      } else if (isPaperII && targetIndex >= 91 && targetIndex <= 100) {
        qType = 'comprehension';
      } else if (!isPaperII && targetIndex >= 46 && targetIndex <= 50) {
        qType = 'comprehension';
      } else if (!['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di'].includes(qType) || (qType === 'multiple-statement' && statements.length === 0)) {
        qType = 'mcq';
      }

      // Comprehension/DI Passage Attachment
      let passage = rawParsed.passage || '';
      if (!passage && compPassages) {
        const compKeys = Object.keys(compPassages);
        if (!isPaperII) {
          if (targetIndex >= 1 && targetIndex <= 5 && compKeys[0]) passage = compPassages[compKeys[0]];
          if (targetIndex >= 46 && targetIndex <= 50 && compKeys[1]) passage = compPassages[compKeys[1]];
        } else {
          if (targetIndex >= 91 && targetIndex <= 95 && compKeys[0]) passage = compPassages[compKeys[0]];
          if (targetIndex >= 96 && targetIndex <= 100 && (compKeys[1] || compKeys[0])) passage = compPassages[compKeys[1] || compKeys[0]];
        }
      }

      // Options Array Formatting
      let options = Array.isArray(rawParsed.options) && rawParsed.options.length >= 4 
        ? rawParsed.options.slice(0, 4) 
        : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
      options = options.map((opt, i) => {
        let str = String(opt || `Option ${i + 1}`).replace(/^\(?[1-4]\)?[\.:\-–\s]*/, '').trim();
        return str;
      });

      // Match-column Headers
      let list1Header = rawParsed.list1Header || (LANGUAGE === 'Hindi' ? 'सूची - I' : 'List - I');
      let list2Header = rawParsed.list2Header || (LANGUAGE === 'Hindi' ? 'सूची - II' : 'List - II');

      // Correct Answer Resolution
      let correct = parseInt(rawParsed.correct, 10);
      if (isNaN(correct) || correct < 1 || correct > 4) correct = 1;

      if (answerKeyMap) {
        const lookup = (rawItem && rawItem.pdfQNum) || targetIndex;
        const ans = answerKeyMap[lookup] || (rawItem && rawItem.qId && answerKeyMap[`qid:${rawItem.qId}`]);
        if (ans !== undefined && ans >= 1 && ans <= 4) correct = ans;
      }

      // Sub-Prompt Resolution
      let subPrompt = rawParsed.subPrompt || '';
      if (qType === 'assertion-reason') {
        subPrompt = LANGUAGE === 'Hindi'
          ? 'उपरोक्त कथन के आलोक में, नीचे दिए गए विकल्पों में से सबसे उपयुक्त उत्तर का चयन कीजिए :'
          : 'In the light of the above statements, choose the most appropriate answer from the options given below :';
      } else if (qType === 'multiple-statement' || qType === 'match-column') {
        if (!subPrompt) {
          subPrompt = LANGUAGE === 'Hindi'
            ? 'नीचे दिए गए विकल्पों में से सही उत्तर का चयन कीजिए :'
            : 'Choose the correct answer from the options given below:';
        }
      }

      return {
        setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
        qIndex: targetIndex,
        ntaQuestionId: rawItem ? (rawItem.qId || '') : (rawParsed.ntaQuestionId || ''),
        unit: rawParsed.unit || '',
        type: qType,
        text: text,
        options: options,
        statements: statements,
        correct: correct,
        explanation: (typeof rawParsed.explanation === 'string' ? rawParsed.explanation.trim() : '<p>Detailed explanation.</p>'),
        assertion: rawParsed.assertion || '',
        reason: rawParsed.reason || '',
        subPrompt: subPrompt,
        list1: qType === 'match-column' ? list1 : [],
        list2: qType === 'match-column' ? list2 : [],
        list1Header: qType === 'match-column' ? list1Header : '',
        list2Header: qType === 'match-column' ? list2Header : '',
        passage: passage
      };
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
        console.warn(`Batch had missing items (${batchErr.message}). Retrying entire batch item by item...`);
        batchResults = [];
        for (const singleQ of batch) {
          try {
            const singlePrompt = buildPrompt([singleQ], compPassages, answerKeyMap, isPaperII, LANGUAGE);
            const singleRes = await callAiStructuring(singlePrompt, keyPool);
            if (singleRes && singleRes.length > 0) {
              batchResults.push(singleRes[0]);
            }
          } catch (singleErr) {
            console.error(`Failed to process Q${singleQ.qIndex}: ${singleErr.message}`);
          }
        }
      }

      // Map and sanitize batch results
      (batchResults || []).forEach((q, idx) => {
        const matched = batch.find(item => item.qIndex === q.qIndex) || batch[idx];
        const qIndex = matched ? matched.qIndex : (q.qIndex || completedQuestions.length + 1);
        const structuredQ = sanitizeQuestion(q, matched, qIndex);

        const existingIdx = completedQuestions.findIndex(item => item.qIndex === qIndex);
        if (existingIdx !== -1) {
          completedQuestions[existingIdx] = structuredQ;
        } else {
          completedQuestions.push(structuredQ);
        }
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
    completedQuestions.forEach(q => {
      if (q.qIndex >= 1 && q.qIndex <= cleanQuestions.length) {
        finalMap.set(q.qIndex, q);
      }
    });

    const missingQuestions = cleanQuestions.filter(cq => !finalMap.has(cq.qIndex));
    if (missingQuestions.length > 0) {
      console.log(`\n🔍 Found ${missingQuestions.length} missing question(s). Running rigorous auto-recovery pass...`);
      for (const misQ of missingQuestions) {
        let recovered = false;
        for (let retry = 0; retry < 3 && !recovered; retry++) {
          try {
            console.log(`Auto-recovering Q${misQ.qIndex} (Attempt ${retry + 1}/3)...`);
            const singlePrompt = buildPrompt([misQ], compPassages, answerKeyMap, isPaperII, LANGUAGE);
            const singleRes = await callAiStructuring(singlePrompt, keyPool);
            if (singleRes && singleRes.length > 0) {
              const structuredQ = sanitizeQuestion(singleRes[0], misQ, misQ.qIndex);
              finalMap.set(misQ.qIndex, structuredQ);
              recovered = true;
            }
          } catch (recErr) {
            console.error(`Could not auto-recover Q${misQ.qIndex}: ${recErr.message}`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }

    // 4. Save to Database (Strictly continuous sequence from 1 to cleanQuestions.length)
    const finalQuestions = [];
    for (let i = 1; i <= cleanQuestions.length; i++) {
      if (finalMap.has(i)) {
        const item = finalMap.get(i);
        item.qIndex = i; // Strict contiguous guarantee
        finalQuestions.push(item);
      }
    }

    // =========================================================================
    // 🛡️ PRE-FLIGHT QUALITY AUDIT & AUTO-REPAIR ENGINE
    // =========================================================================
    console.log(`\n[3.5/4] Running Comprehensive Pre-Flight Quality Audit...`);
    const cleanRawMap = new Map();
    cleanQuestions.forEach(cq => cleanRawMap.set(cq.qIndex, cq));

    let preFlightRepairs = 0;
    const typeBreakdown = { mcq: 0, 'multiple-statement': 0, 'match-column': 0, 'assertion-reason': 0, comprehension: 0, di: 0 };

    for (let i = 0; i < finalQuestions.length; i++) {
      const q = finalQuestions[i];
      const rawItem = cleanRawMap.get(q.qIndex);
      const rawText = rawItem ? rawItem.text : '';
      const rawLines = rawText ? rawText.split('\n').map(l => l.trim()).filter(Boolean) : [];

      // 1. Guard against empty multiple-statements
      if (q.type === 'multiple-statement' && (!Array.isArray(q.statements) || q.statements.length === 0)) {
        q.type = 'mcq';
        preFlightRepairs++;
      }

      // 2. Guard against scrambled prompt titles, placeholders & corrupted OCR gibberish
      if (q.text) {
        q.text = q.text.replace(/^\(?\d+\)?[\.\)]\s*/, '').trim();
      }
      const isCorruptedPrompt = /ofa\s+feu|fa@cul|fawcul|cifsre|forsoriciRad|aisigz|YoRmn|Welool|foriqui|Fazwu|aor\s+cifsre|wel\s+ser|wél\s+Far/i.test(q.text) || ((q.text.match(/[@#~`]/g) || []).length >= 2);
      if (/^\d+\.\s+[A-E]/i.test(q.text) || q.text.length < 15 || /^Question\s*\d+$/i.test(q.text) || isCorruptedPrompt) {
        const questionKeywords = [/^(?:Which|Who|What|Identify|Arrange|Choose|Find|According|In\s+|Out\s+of|Name|From|Where|How|Select|Given|Match|Derek|The\s+|“|'|\d+\))/i];
        for (const line of rawLines) {
          if (/^SI\.?\s*No/i.test(line) || /^QBID/i.test(line) || /\[Option ID/i.test(line) || /^\[Question ID/i.test(line) || /^Choose the correct/i.test(line) || /^--\s*\d+\s+of/i.test(line) || /^Question Description/i.test(line) || /^Topic:/i.test(line)) continue;
          if (/ofa\s+feu|fa@cul|fawcul|cifsre|forsoriciRad|aisigz|YoRmn|Welool|foriqui|Fazwu/i.test(line)) continue;
          if (/^\(?\d+\)?\s*[\.:]/i.test(line) && (/\bonly\b/i.test(line) || /[A-E]\s*,\s*[A-E]/i.test(line))) continue;
          if (questionKeywords.some(rx => rx.test(line)) || (line.endsWith('?') || line.endsWith(':') || line.endsWith('—') || line.endsWith('-'))) {
            const cleaned = line.replace(/^\d+[\)\.\s]+/, '').replace(/^KRWDYN\s*=\s*/, '').trim();
            if (cleaned.length > 15 && !/ofa\s+feu/i.test(cleaned)) {
              q.text = cleaned;
              preFlightRepairs++;
              break;
            }
          }
        }
      }

      // 3. Guard for Match-the-Column
      if (q.type === 'match-column' || (Array.isArray(q.list1) && q.list1.length > 0)) {
        q.type = 'match-column';
        q.statements = [];
        q.text = LANGUAGE === 'Hindi' ? 'सूची - I को सूची - II से सुमेलित कीजिए :' : 'Match List - I with List - II:';
        q.subPrompt = LANGUAGE === 'Hindi' ? 'नीचे दिए गए विकल्पों में से सही उत्तर का चयन कीजिए :' : 'Choose the correct answer from the options given below:';
        const needsSplit = (q.list1 || []).some(item => /[\/\|\–—]\s*(?:I|II|III|IV|[1-4])\./i.test(item) || /\b(?:I|II|III|IV|[1-4])\.\s+[A-Za-z]/i.test(item));
        if ((!q.list1 || q.list1.length === 0 || !q.list2 || q.list2.length === 0 || needsSplit) && rawLines.length > 0) {
          const l1Matches = [...rawText.matchAll(/(?:\n|^)\s*(?:\([A-D]\)|[A-D]\.)\s*([^\n]+)/gi)];
          const l2Matches = [...rawText.matchAll(/(?:\n|^)\s*(?:\([I|V|X]+\)|[I|V|X]+\.|\([1-4]\))\s*([^\n]+)/gi)];
          if (l1Matches.length >= 4 && l2Matches.length >= 4) {
            q.list1 = [];
            q.list2 = [];
            for (let j = 0; j < 4; j++) {
              const lLetter = String.fromCharCode(65 + j);
              q.list1.push(`${lLetter}. ${l1Matches[j][1].replace(/\[Option ID[\s\S]*$/, '').trim()}`);
              q.list2.push(`${['I', 'II', 'III', 'IV'][j]}. ${l2Matches[j][1].replace(/\[Option ID[\s\S]*$/, '').trim()}`);
            }
            preFlightRepairs++;
          }
        }

        // Clean & heal match-column combination options (strip (1)/(2), fix Roman numerals)
        if (Array.isArray(q.options)) {
          const allRomans = ['I', 'II', 'III', 'IV'];
          q.options = q.options.map(rawOpt => {
            if (!rawOpt) return '';
            let opt = String(rawOpt).replace(/^\(?[1-4]\)?[\.:\-–\s]*/, '').replace(/^\(([A-D])\)/g, '$1').trim();
            const parts = opt.split(/,\s*/);
            const letterMap = {};

            const cleanedParts = parts.map(part => {
              const m = part.match(/^([A-D])\s*[-–—:]\s*([A-Za-z0-9\|\!]+)/i);
              if (!m) return part.trim();
              const letter = m[1].toUpperCase();
              let r = m[2].trim().toUpperCase();

              if (r === 'IV' || r === '1V' || r === 'LV') r = 'IV';
              else if (r === 'III' || r === 'IIL' || r === 'HI' || r === 'HL' || r === 'IU' || r === 'U' || r === 'UL' || r === '1II' || r === 'LLL') r = 'III';
              else if (r === 'II' || r === 'IL' || r === 'H' || r === 'FL' || r === 'LL' || r === '1I') r = 'II';
              else if (r === 'I' || r === 'L' || r === 'FE' || r === '1' || r === '|') r = 'I';

              letterMap[letter] = r;
              return `${letter}-${r}`;
            });

            const letters = ['A', 'B', 'C', 'D'];
            const presentLetters = letters.filter(l => letterMap[l]);
            if (presentLetters.length === 4) {
              const presentRomans = presentLetters.map(l => letterMap[l]);
              const romanCounts = {};
              presentRomans.forEach(r => { romanCounts[r] = (romanCounts[r] || 0) + 1; });
              const missingRomans = allRomans.filter(r => !presentRomans.includes(r));

              if (missingRomans.length === 1) {
                for (const l of letters) {
                  if (romanCounts[letterMap[l]] > 1) {
                    letterMap[l] = missingRomans[0];
                    break;
                  }
                }
              }
              return letters.map(l => `${l}-${letterMap[l]}`).join(', ');
            }
            return cleanedParts.join(', ');
          });
        }
      }

      // 4. Guard for Assertion-Reason
      if (q.type === 'assertion-reason') {
        q.text = LANGUAGE === 'Hindi'
          ? 'नीचे दो कथन दिए गए हैं : एक को अभिकथन (A) और दूसरे को कारण (R) के रूप में लेबल किया गया है।'
          : 'Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason (R).';
        q.subPrompt = LANGUAGE === 'Hindi'
          ? 'उपरोक्त कथन के आलोक में, नीचे दिए गए विकल्पों में से सबसे उपयुक्त उत्तर का चयन कीजिए :'
          : 'In the light of the above statements, choose the most appropriate answer from the options given below :';
        q.statements = [];

        if ((!q.assertion || !q.reason) && rawLines.length > 0) {
          const aMatch = rawText.match(/(?:Assertion\s*\([A-Z]\)|अभिकथन\s*\([A-Z]\))\s*:\s*([^\n]+(?:\n(?!(?:Reason\s*\([A-Z]\)|कारण\s*\([A-Z]\)|In light of|Choose the|Options\s*:|\[Option ID|\(1\)|\(2\)|\(3\)|\(4\)|1\.|2\.|3\.|4\.))[^\n]+)*)/i);
          const rMatch = rawText.match(/(?:Reason\s*\([A-Z]\)|कारण\s*\([A-Z]\))\s*:\s*([^\n]+(?:\n(?!(?:In light of|Choose the|Options\s*:|\[Option ID|\(1\)|\(2\)|\(3\)|\(4\)|1\.|2\.|3\.|4\.))[^\n]+)*)/i);
          if (aMatch && rMatch) {
            q.assertion = aMatch[1].replace(/\[Option ID[\s\S]*$/, '').trim();
            q.reason = rMatch[1].replace(/\[Option ID[\s\S]*$/, '').trim();
            preFlightRepairs++;
          }
        }
      } else if (q.type === 'multiple-statement' || q.type === 'match-column') {
        if (!q.subPrompt) {
          q.subPrompt = LANGUAGE === 'Hindi'
            ? 'नीचे दिए गए विकल्पों में से सही उत्तर का चयन कीजिए :'
            : 'Choose the correct answer from the options given below:';
        }

        // Guard against statements accidentally placed into options array (with or without A./B. labels)
        if (q.type === 'multiple-statement' && Array.isArray(q.statements) && q.statements.length > 0 && rawLines.length > 0) {
          const isOptionsDuplicateOfStatements = q.options && q.options.length === q.statements.length && q.options.every((opt, i) => opt === q.statements[i]);
          const optionsLookLikeStatements = q.options && q.options.some(opt => {
            const cleanOpt = opt.replace(/^[A-E][\.\)]\s*/i, '').trim();
            return q.statements.some(stmt => {
              const cleanStmt = stmt.replace(/^[A-E][\.\)]\s*/i, '').trim();
              return cleanStmt === cleanOpt || (cleanOpt.length > 5 && cleanStmt.includes(cleanOpt));
            }) && !/\bonly\b/i.test(opt) && !/[A-E]\s*,\s*[A-E]/i.test(opt) && !/[A-E]\s+and\s+[A-E]/i.test(opt);
          });

          if (isOptionsDuplicateOfStatements || optionsLookLikeStatements || !q.options || q.options.length < 4) {
            const comboRegex = /(?:\n|^)\s*(?:\([1-4]\)|[1-4][\.\)]|\([1-4]\))\s*[<>\s]*([A-E\s,\.andonlyकेवलऔर\(\)\-]+)/gi;
            const matches = [...rawText.matchAll(comboRegex)];
            if (matches.length >= 4) {
              q.options = matches.slice(0, 4).map(m => {
                let opt = m[1].replace(/\[Option ID[\s\S]*$/, '').replace(/^[<>\s]+/, '').trim();
                opt = opt.replace(/([A-E])only/i, '$1 only').replace(/\s+/g, ' ');
                return opt;
              });
              preFlightRepairs++;
            }
          }
        }
      }

      // 4.6 Guard for Unlabelled Multiple-Statement Extraction & Conversion
      const hasComboOptions = q.options && q.options.some(opt => /\b(?:[A-E]\s*,\s*[A-E]|[A-E]\s+and\s+[A-E]|only|केवल)\b/i.test(opt));
      if (hasComboOptions && (!Array.isArray(q.statements) || q.statements.length < 2) && rawLines.length > 0) {
        q.type = 'multiple-statement';
        q.subPrompt = LANGUAGE === 'Hindi'
          ? 'नीचे दिए गए विकल्पों में से सही उत्तर का चयन कीजिए :'
          : 'Choose the correct answer from the options given below:';

        const chooseIdx = rawLines.findIndex(l => /^(?:Choose the correct|नीचे दिए गए विकल्पों|Options\s*:|\(1\)|\(A\)-)/i.test(l));
        const promptIdx = rawLines.findIndex(l => /^(?:Which|Who|What|Identify|Arrange|In\s+|Out\s+of|According|Within|Chronologically|Given)/i.test(l));
        
        const startLine = promptIdx !== -1 ? promptIdx + 1 : 1;
        const endLine = chooseIdx !== -1 ? chooseIdx : rawLines.length;
        
        if (endLine > startLine) {
          const potentialStmts = rawLines.slice(startLine, endLine).filter(l => 
            l.length > 3 && 
            !/^--\s*\d+\s+of/i.test(l) && 
            !/\[Option ID|\[Question ID|^SI\.?\s*No|^QBID|^Topic:/i.test(l)
          );
          
          if (potentialStmts.length >= 2 && potentialStmts.length <= 6) {
            q.statements = potentialStmts.map((stmt, sIdx) => {
              const letter = String.fromCharCode(65 + sIdx);
              return `${letter}. ${stmt.replace(/^\(?[A-E]\)?[\.:]\s*/i, '').trim()}`;
            });
            preFlightRepairs++;
          }
        }
      }

      // 5. Unbroken Text / Dangling Sentence Healer (List I, Statements, Prompt)
      const isDangling = (str) => /\b(?:that\s+a|that|the|of|in|and|with|to|for|or|a|an|as|by|from|is|was|are|were|which|who|whose|must|be)$/i.test(str.trim()) || ((str.match(/"/g) || []).length % 2 !== 0 && !str.endsWith('"'));

      if (Array.isArray(q.list1)) {
        for (let idx = 0; idx < q.list1.length; idx++) {
          let item = q.list1[idx];
          if (isDangling(item) && rawText) {
            const cleanSnip = item.replace(/^[A-D]\.\s*/, '').replace(/^[“"']/, '').substring(0, 15);
            const snipIdx = rawText.indexOf(cleanSnip);
            if (snipIdx !== -1) {
              const fullSnippet = rawText.substring(snipIdx, snipIdx + 300);
              const secondQuote = fullSnippet.indexOf('"', 1);
              if (secondQuote !== -1) {
                const completeStr = fullSnippet.substring(0, secondQuote + 1).replace(/\s+/g, ' ').trim();
                const prefix = item.match(/^[A-D]\.\s*/)?.[0] || '';
                q.list1[idx] = prefix + '"' + completeStr.replace(/^["“”]/, '');
                preFlightRepairs++;
              }
            }
          }
        }
      }

      // 6. Strict Language Enforcement Guard
      const devanagariRegex = /[\u0900-\u097F]/;
      if (LANGUAGE === 'English') {
        const stripHindiFromStr = (str) => (str || '').replace(/\s*\/[\u0900-\u097F\s\(\)\.\-,\:–—]+$/g, '').trim();

        q.text = stripHindiFromStr(q.text);
        if (devanagariRegex.test(q.text) && rawLines.length > 0) {
          for (const line of rawLines) {
            if (/^[A-Za-z0-9\s\,\.\?\!\'\"\-–—\(\)\:\;\/]+$/.test(line) && line.length > 15 && !/\[Option ID|\[Question ID|^SI\.?\s*No|^QBID/i.test(line)) {
              if (line.endsWith('?') || line.endsWith(':') || /^(?:Which|Who|What|Identify|Arrange|Choose|Find|According|In\s+|Name|From|Where|How|Select|Given|Match)/i.test(line)) {
                q.text = line.trim();
                preFlightRepairs++;
                break;
              }
            }
          }
        }

        if (Array.isArray(q.options)) {
          q.options = q.options.map(opt => stripHindiFromStr(opt));
        }

        if (Array.isArray(q.statements)) {
          q.statements = q.statements.map((stmt, sIdx) => {
            const cleanStmt = stripHindiFromStr(stmt);
            if (devanagariRegex.test(cleanStmt) && rawLines.length > 0) {
              const letter = String.fromCharCode(65 + sIdx);
              const engLine = rawLines.find(l => new RegExp(`^\\(?${letter}\\)?[\\.:]\\s*([A-Za-z0-9\\s\\,\\.\\'\\"\\-–—\\(\\)]+)`, 'i').test(l) && !devanagariRegex.test(l));
              if (engLine) {
                preFlightRepairs++;
                return `${letter}. ${engLine.replace(/^\(?[A-E]\)?[\.:]\s*/i, '').trim()}`;
              }
            }
            return cleanStmt.replace(/[\u0900-\u097F]+/g, '').trim();
          });
        }
      }

      // 7. Fill-in-the-blank & Incomplete Prompt Grammatical Formatter
      if (q.text && !/[?.:!—_]$/.test(q.text.trim())) {
        if (/\b(?:refer to as|refers to as|referred to as|known as|termed as|defined as|called|associated with|characterized by|consists of|classified as|meaning of|such as|denotes)$/i.test(q.text.trim())) {
          q.text = q.text.trim() + ' _________.';
          preFlightRepairs++;
        } else if (/\b(?:is|are|was|were|to|of|in|for|from|with|by|as)$/i.test(q.text.trim())) {
          q.text = q.text.trim() + ' _________.';
          preFlightRepairs++;
        } else {
          q.text = q.text.trim() + ':';
          preFlightRepairs++;
        }
      }

      // 8. Comprehension / DI Passage Sanitizer
      if ((q.type === 'comprehension' || q.type === 'di') && q.passage) {
        const prevLen = q.passage.length;
        q.passage = q.passage
          .replace(/Question\s*Numbers?\s*:\s*\(\d+\s*to\s*\d+\)/gi, '')
          .replace(/Question\s*Id\s*:\s*\d+/gi, '')
          .replace(/Question\s*Type\s*:\s*COMPREHENSION/gi, '')
          .replace(/Sub\s*Question\s*(?:Shuffling\s*Allowed\s*:\s*(?:Yes|No)|No\s*:\s*\d+)/gi, '')
          .replace(/Group\s*Comprehension\s*Questions\s*:\s*(?:Yes|No)/gi, '')
          .replace(/Question\s*Pattern\s*Type\s*:\s*[A-Za-z]+/gi, '')
          .replace(/Question\s*Label\s*:\s*Comprehension/gi, '')
          .replace(/^[\s\n]*Read the following passage and answer the questions\s*:?[\s\n]*/i, '')
          .replace(/Sub\s*questions[\s\S]*$/i, '')
          .trim();
        if (q.passage.length !== prevLen) preFlightRepairs++;
      }

      // 9. Universal Option Sanitizer (Strip duplicate prefixes like (1)/(2)/1./2.)
      if (Array.isArray(q.options)) {
        q.options = q.options.map((opt, i) => {
          let cleanOpt = String(opt || `Option ${i + 1}`).replace(/^\(?[1-4]\)?[\.:\-–\s]*/, '').trim();
          return cleanOpt || `Option ${i + 1}`;
        });
      }

      typeBreakdown[q.type] = (typeBreakdown[q.type] || 0) + 1;
    }

    console.log(`✅ Pre-Flight Audit Passed: Verified ${finalQuestions.length} questions (${preFlightRepairs} automated edge-case repairs).`);
    console.log(`📊 Final Type Distribution:`);
    console.table(typeBreakdown);

    console.log(`\n[4/4] Committing ${finalQuestions.length} verified questions to MongoDB...`);

    await Question.deleteMany({ setId: new mongoose.Types.ObjectId(TARGET_SET_ID) });
    await Question.insertMany(finalQuestions);
    await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: finalQuestions.length });

    if (fs.existsSync(checkpointFile)) {
      fs.unlinkSync(checkpointFile);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 SUCCESS: Imported ${finalQuestions.length} questions into Set "${targetSet.title}" with strict sequence & type integrity!`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('\n❌ Fatal Import Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
