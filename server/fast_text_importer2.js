const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const { PDFParse } = require('pdf-parse');

// Load environment variables reliably from both script dir and current working dir
const serverEnvPath = path.join(__dirname, '.env');
const cwdEnvPath = path.resolve('.env');

[serverEnvPath, cwdEnvPath].forEach(envFile => {
  if (fs.existsSync(envFile)) {
    const envConfig = dotenv.parse(fs.readFileSync(envFile));
    for (const k in envConfig) {
      if (!process.env[k] || envFile === serverEnvPath) {
        process.env[k] = envConfig[k];
      }
    }
  }
});

// Interactive terminal input helper
function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

// Utility function to extract individual Option IDs from a question's raw text
function extractOptionIdsFromText(rawText) {
  if (!rawText) return {};
  const map = {}; // { 1: optId1, 2: optId2, 3: optId3, 4: optId4 }

  // Format 1: Option 1 ID : 5401
  const explicitOptRegex = /Option\s*([1-4])\s*ID\s*[:=]\s*(\d+)/gi;
  let em;
  while ((em = explicitOptRegex.exec(rawText)) !== null) {
    map[parseInt(em[1], 10)] = em[2];
  }
  if (Object.keys(map).length === 4) return map;

  // Format 2: 1. ... [Option ID = 5401] or (1) ... [Option ID = 5401]
  const numOptRegex = /(?:^|\n)\s*\(?([1-4])\)?[\.\:\-\s][^\n]*?\[Option ID\s*=\s*(\d+)\]/gi;
  let nm;
  while ((nm = numOptRegex.exec(rawText)) !== null) {
    map[parseInt(nm[1], 10)] = nm[2];
  }
  if (Object.keys(map).length === 4) return map;

  // Format 3: All [Option ID = 5401] in sequence
  const allOptRegex = /\[Option ID\s*=\s*(\d+)\]/gi;
  const list = [];
  let am;
  while ((am = allOptRegex.exec(rawText)) !== null) {
    list.push(am[1]);
  }
  if (list.length >= 4) {
    list.slice(0, 4).forEach((id, idx) => {
      if (!map[idx + 1]) map[idx + 1] = id;
    });
  }

  return map;
}

// Robust helper to resolve the exact correct option index (1-4) given answer key data and question context
function resolveCorrectOption(targetIndex, rawItem, rawParsed, answerKeyMap, isPaperII = false) {
  let correct = parseInt(rawParsed?.correct, 10);
  if (isNaN(correct) || correct < 1 || correct > 4) correct = 1;

  if (!answerKeyMap) return correct;

  const rawText = (rawItem && rawItem.text) || '';
  const qId = rawItem && rawItem.qId ? String(rawItem.qId).trim() : '';
  const pdfQNum = rawItem && rawItem.pdfQNum !== undefined ? rawItem.pdfQNum : targetIndex;

  let targetRawOpt = null;
  let directNum = null;

  if (qId && answerKeyMap[`rawopt:qid:${qId}`] !== undefined) {
    targetRawOpt = answerKeyMap[`rawopt:qid:${qId}`];
    directNum = answerKeyMap[`optnum:qid:${qId}`] || answerKeyMap[`qid:${qId}`];
  } else if (qId && answerKeyMap[`qid:${qId}`] !== undefined) {
    const val = answerKeyMap[`qid:${qId}`];
    if (String(val).length > 1) targetRawOpt = String(val);
    else directNum = val;
  } else if (isPaperII && answerKeyMap[`p2:${targetIndex}`] !== undefined) {
    directNum = answerKeyMap[`p2:${targetIndex}`];
    targetRawOpt = answerKeyMap[`rawopt:p2:${targetIndex}`];
  } else if (answerKeyMap[pdfQNum] !== undefined) {
    directNum = answerKeyMap[pdfQNum];
    targetRawOpt = answerKeyMap[`rawopt:${pdfQNum}`];
  } else if (answerKeyMap[targetIndex] !== undefined) {
    directNum = answerKeyMap[targetIndex];
    targetRawOpt = answerKeyMap[`rawopt:${targetIndex}`];
  }

  if (targetRawOpt === '%' || targetRawOpt === '&' || directNum === 0) {
    return 1;
  }

  // If we have a multi-digit Option ID (e.g. "5404"), match against question text options
  if (targetRawOpt && /^\d{3,8}$/.test(targetRawOpt)) {
    const optIdMap = extractOptionIdsFromText(rawText);
    for (let optIdx = 1; optIdx <= 4; optIdx++) {
      if (optIdMap[optIdx] === targetRawOpt) {
        return optIdx;
      }
    }
  }

  if (directNum !== undefined && directNum !== null && !isNaN(directNum) && directNum >= 1 && directNum <= 4) {
    return directNum;
  }

  return correct;
}

// Utility function to parse answer key PDF text into a mapping object
function parseAnswerKey(text) {
  const mapping = {};
  if (!text) return mapping;

  // 1. Format NTA Official Final Answer Key (Question ID -> Correct Option ID table / list)
  // e.g. "1351 5404", "1352 5406", "25314 41256", "1351 %", "1352 &"
  const ntaPairs = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    if (/^Exam\s*Date|^NATIONAL\s*TESTING|^UGC\s*NET|^Subject\s*:|^Question\s*$|^ID\s*$|^Correct\s*$|^Option\s*ID|^Page\s*\d+|^Note\s*:/i.test(cleanLine)) {
      continue;
    }

    const pairRegex = /\b(\d{3,8})\s+([0-9]{3,8}|[\%\&]|DROPPED|DROP|NULL|CANCELLED)\b/gi;
    let pm;
    while ((pm = pairRegex.exec(cleanLine)) !== null) {
      ntaPairs.push({ qId: pm[1], correctOpt: pm[2] });
    }
  }

  if (ntaPairs.length < 10) {
    const pairRegex = /\b(\d{3,8})\s+([0-9]{3,8}|[\%\&]|DROPPED|DROP|NULL|CANCELLED)\b/gi;
    let pm;
    while ((pm = pairRegex.exec(text)) !== null) {
      if (!ntaPairs.some(p => p.qId === pm[1])) {
        ntaPairs.push({ qId: pm[1], correctOpt: pm[2] });
      }
    }
  }

  if (ntaPairs.length >= 10) {
    console.log(`Detected NTA Final Answer Key format: parsed ${ntaPairs.length} Question ID -> Option ID pairs.`);

    ntaPairs.forEach((p, idx) => {
      let optNum = 0;
      if (/^[\%\&]$|DROPPED|DROP|NULL|CANCELLED/i.test(p.correctOpt)) {
        optNum = 0;
      } else {
        const numVal = parseInt(p.correctOpt, 10);
        if (!isNaN(numVal)) {
          optNum = ((numVal - 1) % 4) + 1;
        }
      }

      mapping[`qid:${p.qId}`] = optNum;
      mapping[`rawopt:qid:${p.qId}`] = p.correctOpt;
      mapping[`optnum:qid:${p.qId}`] = optNum;

      const seqIndex = idx + 1;
      mapping[seqIndex] = optNum;
      mapping[String(seqIndex)] = optNum;
      mapping[`rawopt:${seqIndex}`] = p.correctOpt;

      if (ntaPairs.length > 50 && seqIndex > 50) {
        const p2Idx = seqIndex - 50;
        mapping[`p2:${p2Idx}`] = optNum;
        mapping[`rawopt:p2:${p2Idx}`] = p.correctOpt;
      }
    });

    return mapping;
  }

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

  // Tabular / Embedded ANSWER KEY parser (e.g. "ANSWER KEY\nQ.NO ANS Q.NO ANS" or "1 D 51 B")
  const ansKeyIdx = text.search(/ANSWER\s*KEY/i);
  const relevantText = ansKeyIdx !== -1 ? text.substring(ansKeyIdx) : text;

  const normalized = relevantText
    .replace(/([A-D])\s*,\s*([A-D])/gi, '$1')
    .replace(/\b(DROPPED|DROP|NULL)\b/gi, '0');

  const pairRegex = /\b(\d{1,3})\s+([A-D1-4]|0)\b/gi;
  let match;
  while ((match = pairRegex.exec(normalized)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ansRaw = match[2].toUpperCase();
    const map = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, '1': 1, '2': 2, '3': 3, '4': 4, '0': 0 };
    if (qNum >= 1 && qNum <= 150 && map[ansRaw] !== undefined) {
      mapping[qNum] = map[ansRaw];
      mapping[String(qNum)] = map[ansRaw];
    }
  }

  if (Object.keys(mapping).length >= 10) {
    return mapping;
  }

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

const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
const PyqSet = mongoose.models.PyqSet || mongoose.model('PyqSet', PyqSetSchema);

function cleanJsonString(str) {
  let cleaned = str.trim();
  const mdMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch) {
    cleaned = mdMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const isObj = cleaned[startIdx] === '{';
    const lastIdx = isObj ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
    if (lastIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, lastIdx + 1);
    }
  }
  return cleaned;
}

// OpenRouter Key Pool & Rate Limiter
function setupOpenRouterKeyPool() {
  const rawKeys = [];
  
  if (process.env.OPENROUTER_API_KEY) {
    rawKeys.push(...process.env.OPENROUTER_API_KEY.split(',').map(s => s.trim()).filter(Boolean));
  }
  if (process.env.OPENROUTER_API_KEYS) {
    rawKeys.push(...process.env.OPENROUTER_API_KEYS.split(',').map(s => s.trim()).filter(Boolean));
  }
  for (let i = 1; i <= 50; i++) {
    if (process.env[`OPENROUTER_API_KEY_${i}`]) rawKeys.push(process.env[`OPENROUTER_API_KEY_${i}`].trim());
    if (process.env[`OR_KEY_${i}`]) rawKeys.push(process.env[`OR_KEY_${i}`].trim());
  }

  const keys = Array.from(new Set(rawKeys)).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('No OPENROUTER_API_KEY found in environment (.env). Please provide at least one OpenRouter key.');
  }

  return {
    keys,
    history: keys.map(() => []),
    cooldowns: keys.map(() => 0),
    lastUsed: keys.map(() => 0),
    index: 0,
    PER_KEY_RPM: 20,
    MIN_INTERVAL_MS: 1500,

    async getNextKey() {
      const now = Date.now();
      const windowMs = 60000;

      for (let i = 0; i < this.history.length; i++) {
        this.history[i] = this.history[i].filter(ts => now - ts < windowMs);
      }

      for (let attempt = 0; attempt < this.keys.length; attempt++) {
        const idx = (this.index + attempt) % this.keys.length;
        const isNotCooling = this.cooldowns[idx] <= now;
        const isUnderRpm = this.history[idx].length < this.PER_KEY_RPM;
        const hasPassedInterval = (now - this.lastUsed[idx]) >= this.MIN_INTERVAL_MS;

        if (isNotCooling && isUnderRpm && hasPassedInterval) {
          this.index = (idx + 1) % this.keys.length;
          this.history[idx].push(now);
          this.lastUsed[idx] = now;
          return { key: this.keys[idx], keyIndex: idx };
        }
      }

      // If all keys are busy, pick the one clearing cooldown earliest
      const shortestCooldown = Math.min(...this.cooldowns);
      const waitMs = Math.max(500, shortestCooldown - now);
      await new Promise(r => setTimeout(r, Math.min(waitMs, 3000)));

      const fallbackIdx = this.index % this.keys.length;
      this.index = (fallbackIdx + 1) % this.keys.length;
      return { key: this.keys[fallbackIdx], keyIndex: fallbackIdx };
    },

    markRateLimited(keyIndex, cooldownSeconds = 20) {
      if (keyIndex >= 0 && keyIndex < this.cooldowns.length) {
        this.cooldowns[keyIndex] = Date.now() + (cooldownSeconds * 1000);
        console.warn(`[OpenRouter Key Pool] Key #${keyIndex + 1} marked cooling for ${cooldownSeconds}s.`);
      }
    }
  };
}

let globalKeyPool = null;

// Unified OpenRouter API Caller with multi-key round-robin rotation & model fallback
async function callOpenRouterApi(prompt, model, keyPool, retryCount = 0) {
  if (!keyPool) {
    if (!globalKeyPool) globalKeyPool = setupOpenRouterKeyPool();
    keyPool = globalKeyPool;
  }

  const { key, keyIndex } = await keyPool.getNextKey();
  const urlEndpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const modelFallbacks = [
    model,
    'google/gemini-2.5-flash',
    'deepseek/deepseek-chat',
    'qwen/qwen-2.5-72b-instruct'
  ];
  const targetModel = modelFallbacks[retryCount % modelFallbacks.length];

  try {
    const res = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://ugc-free-paper.vercel.app',
        'X-Title': 'UGC NET Question Importer'
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: targetModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert UGC NET exam parser. You extract questions and output ONLY valid JSON matching {"questions": [...]}. Keep explanations concise (1-2 sentences). Never output markdown fences or commentary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 4096
      })
    });

    if (res.ok) {
      const rawText = await res.text();
      let rawJson = '';
      try {
        const data = JSON.parse(rawText);
        rawJson = data.choices?.[0]?.message?.content || (typeof data === 'string' ? data : JSON.stringify(data));
      } catch (_) {
        rawJson = rawText;
      }

      const parsed = JSON.parse(cleanJsonString(rawJson));
      const questionsList = parsed.questions || (Array.isArray(parsed) ? parsed : []);
      return questionsList;
    }

    const errText = await res.text();
    if (res.status === 429) {
      keyPool.markRateLimited(keyIndex, 25);
    } else if (res.status === 401 || res.status === 402 || res.status === 403) {
      keyPool.markRateLimited(keyIndex, 600);
    }

    if (retryCount < 10) {
      console.warn(`[OpenRouter ${res.status}] Key #${keyIndex + 1} (${targetModel}): ${errText.substring(0, 100)}. Switching key/model (Attempt ${retryCount + 1}/10)...`);
      await new Promise(r => setTimeout(r, 1000));
      return callOpenRouterApi(prompt, model, keyPool, retryCount + 1);
    }
  } catch (err) {
    console.warn(`[OpenRouter Network Error on Key #${keyIndex + 1} (${targetModel})]: ${err.message}`);
    keyPool.markRateLimited(keyIndex, 10);
  }

  if (retryCount < 10) {
    await new Promise(r => setTimeout(r, 1500));
    return callOpenRouterApi(prompt, model, keyPool, retryCount + 1);
  }

  throw new Error(`All OpenRouter keys and model attempts exhausted after 10 retry cycles.`);
}

function buildPrompt(batch, compPassages, answerKeyMap, isPaperII, importLanguage) {
  let langRule = '';
  if (importLanguage === 'Hindi') {
    langRule = `Target Language & Script Rule (STRICT ENFORCEMENT):
Selected Language: HINDI ONLY (हिन्दी - देवनागरी)
- Extract the entire question prompt, statements, and all 4 options strictly in HINDI using DEVANAGARI script.
- If the original paper has English + Hindi side-by-side or stacked, isolate and extract ONLY the Hindi Devanagari text.
- The "explanation" field must be written in Hindi (1-2 sentences).`;
  } else if (importLanguage === 'Sindhi') {
    langRule = `Target Language & Script Rule (STRICT ENFORCEMENT):
Selected Language: SINDHI DEVANAGARI ONLY (सिन्धी - देवनागरी)
- In UGC NET Sindhi papers, questions are given in both Devanagari script and Perso-Arabic script.
- You MUST extract ONLY the Sindhi text written in DEVANAGARI script.
- Completely DISCARD and STRIP ALL Perso-Arabic / Urdu script characters and lines.
- Accurately preserve Sindhi Devanagari phonetic letters (ॻ, ॼ, ॾ, ॿ, ङ, ञ, ड़, ढ़, ॴ, ॵ, etc.).
- The "explanation" field must be written in Sindhi Devanagari (1-2 sentences).`;
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
   - 'multiple-statement': statements (A, B, C, D, E or I, II, III, IV / कथन) followed by combination options (e.g., "(1) A and B only" / "(1) केवल A और B"). Fill "statements" array and combination options in "options".
   - 'di': Data Interpretation (Q1-5 in Paper I). Fill "passage" field with table/data.
   - 'comprehension': Reading Comprehension / गद्यांश. Fill "passage" field.
4. Keep the "explanation" field SHORT & CONCISE (1 to 2 clear sentences only, e.g. "<p>Option (X) is correct because...</p>"). Do NOT write long paragraphs.

Return JSON in this EXACT schema:
{
  "questions": [
    {
      "qIndex": number,
      "ntaQuestionId": "string",
      "unit": "",
      "type": "mcq" | "assertion-reason" | "match-column" | "comprehension" | "multiple-statement" | "di",
      "text": "string",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "statements": [],
      "correct": number,
      "assertion": "",
      "reason": "",
      "list1": [],
      "list2": [],
      "list1Header": "",
      "list2Header": "",
      "passage": "",
      "explanation": "<p>Detailed explanation...</p>"
    }
  ]
}

Questions to process:\n\n`;

  if (answerKeyMap) {
    prompt += `Official Answer Key Hints:\n`;
    batch.forEach(q => {
      const qId = q.qId ? String(q.qId).trim() : '';
      const targetRawOpt = qId ? answerKeyMap[`rawopt:qid:${qId}`] : null;
      const ans = resolveCorrectOption(q.qIndex, q, null, answerKeyMap, isPaperII);
      if (ans !== undefined && ans >= 1 && ans <= 4) {
        prompt += `- Q${q.qIndex}${targetRawOpt ? ` (Option ID: ${targetRawOpt})` : ''}: Option ${ans}\n`;
      }
    });
    prompt += `\n`;
  }

  const compKeys = Object.keys(compPassages || {});
  const passage1Id = compKeys[0];
  const passage2Id = compKeys[1];

  batch.forEach(q => {
    prompt += `--- QUESTION ${q.qIndex} (Raw ID: ${q.qId}) ---\n`;
    prompt += q.text + '\n\n';

    if (!isPaperII) {
      if (q.qIndex >= 1 && q.qIndex <= 5 && passage1Id && compPassages[passage1Id]) {
        prompt += `[DI Passage Context:\n${compPassages[passage1Id]}]\n\n`;
      }
      if (q.qIndex >= 46 && q.qIndex <= 50 && passage2Id && compPassages[passage2Id]) {
        prompt += `[RC Passage Context:\n${compPassages[passage2Id]}]\n\n`;
      }
    } else {
      if (q.qIndex >= 91 && q.qIndex <= 95 && passage1Id && compPassages[passage1Id]) {
        prompt += `[RC Passage Context:\n${compPassages[passage1Id]}]\n\n`;
      }
      if (q.qIndex >= 96 && q.qIndex <= 100 && passage2Id && compPassages[passage2Id]) {
        prompt += `[RC Passage Context:\n${compPassages[passage2Id]}]\n\n`;
      }
    }
  });

  return prompt;
}

// Main CLI Execution
async function main() {
  console.log('\n======================================================');
  console.log('⚡ OpenRouter Multi-Key High-Speed Text Question Importer');
  console.log('======================================================\n');

  const keyPool = setupOpenRouterKeyPool();
  console.log(`🔑 Loaded ${keyPool.keys.length} OpenRouter API key(s) into round-robin pool.\n`);

  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const cliPdf = getArg('--pdf');
  const cliSetId = getArg('--setId');
  const cliLang = getArg('--lang');
  const cliModel = getArg('--model');
  const cliKey = getArg('--key');

  let selectedModel;
  let PDF_PATH;
  let TARGET_SET_ID;
  let LANGUAGE;
  let ANSWER_KEY_PATH;

  if (cliPdf && cliSetId) {
    selectedModel = cliModel || (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash');
    PDF_PATH = cliPdf;
    TARGET_SET_ID = cliSetId;
    LANGUAGE = cliLang || 'English';
    ANSWER_KEY_PATH = cliKey || null;
    console.log(`Using CLI Args -> Model: "${selectedModel}", Language: "${LANGUAGE}"`);
  } else {
    // Available OpenRouter AI Models
    const availableModels = [
      { name: '🌟 Google Gemini 2.5 Flash [Recommended: Fast, accurate, high-context]', id: 'google/gemini-2.5-flash' },
      { name: '🧠 DeepSeek V3 (deepseek-chat) [High precision]', id: 'deepseek/deepseek-chat' },
      { name: '⚡ Qwen 2.5 72B Instruct [Open weights power]', id: 'qwen/qwen-2.5-72b-instruct' },
      { name: '🦙 Meta Llama 3.3 70B Instruct', id: 'meta-llama/llama-3.3-70b-instruct' },
      { name: '🚀 OpenAI GPT-4o Mini', id: 'openai/gpt-4o-mini' }
    ];

    console.log('Select OpenRouter AI Model:');
    availableModels.forEach((m, idx) => console.log(`  ${idx + 1}. ${m.name} [${m.id}]`));
    const modelChoice = await askQuestion(`\nEnter choice (1-${availableModels.length}) [Default: 1 - Gemini 2.5 Flash]: `);
    const choiceIdx = parseInt(modelChoice, 10) - 1;
    const selected = (choiceIdx >= 0 && choiceIdx < availableModels.length)
      ? availableModels[choiceIdx]
      : availableModels[0];

    selectedModel = selected.id;
    console.log(`Using Model: "${selectedModel}"\n`);

    PDF_PATH = await askQuestion('Enter the absolute path to your Questions PDF file: ');
    TARGET_SET_ID = await askQuestion('Enter the Target PyqSet MongoDB ID: ');
    LANGUAGE = (await askQuestion('Enter Target Language (English/Hindi/Sindhi/Bilingual) [Default: English]: ')) || 'English';
    ANSWER_KEY_PATH = await askQuestion('Enter Answer Key PDF path (optional, press Enter to skip): ');
  }

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Error: PDF file does not exist: "${PDF_PATH}"`);
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(TARGET_SET_ID)) {
    console.error('Error: Invalid MongoDB ObjectId.');
    process.exit(1);
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
      console.warn('⚠️  Warning: PDF text is extremely short or empty.');
      const proceed = await askQuestion('Continue anyway? (y/n): ');
      if (proceed.toLowerCase() !== 'y') process.exit(0);
    }

    // Auto-detect embedded answer key inside the PDF if no external key was provided
    if (!answerKeyMap && text.search(/ANSWER\s*KEY/i) !== -1) {
      console.log('✨ Auto-detected embedded Answer Key table inside PDF document...');
      answerKeyMap = parseAnswerKey(text);
      console.log(`Mapped ${Object.keys(answerKeyMap).length / 2} answers from embedded Answer Key.`);
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
        cleanQuestions.sort((a, b) => (a.pdfQNum || a.qIndex) - (b.pdfQNum || b.qIndex));
        cleanQuestions.forEach((q, idx) => {
          q.qIndex = idx + 1;
        });
      }
    }

    // Comprehension Passages
    const compPassages = {};

    // Format G: Booklet / Sequential Numbered Question Slicer (1. to 50., 1. to 100., 1. to 150.)
    if (matchesList.length === 0 && cleanQuestions.length === 0) {
      console.log('Scanning for Format G: Booklet / Numbered Question Sequences...');
      const ansKeyIdx = text.search(/ANSWER\s*KEY/i);
      const bodyText = (ansKeyIdx !== -1 ? text.substring(0, ansKeyIdx) : text)
        .replace(/To get free NTA NET study materials[^\n]*\n?/gi, '')
        .replace(/www\.aifer\.in\s*\d*\n?/gi, '')
        .replace(/--\s*\d+\s+of\s+\d+\s*--\n?/gi);

      const qNumHeaderRegex = /(?:^|\n)\s*(\d{1,3})\s*[\.:]\s*/g;
      let qMatches = [];
      let qm;
      while ((qm = qNumHeaderRegex.exec(bodyText)) !== null) {
        qMatches.push({ index: qm.index, matchLength: qm[0].length, qNum: parseInt(qm[1], 10) });
      }

      const filteredMatches = [];
      let expectedNext = 1;
      for (const mItem of qMatches) {
        if (mItem.qNum === expectedNext) {
          filteredMatches.push(mItem);
          expectedNext++;
        } else if (mItem.qNum > expectedNext && mItem.qNum <= expectedNext + 2) {
          filteredMatches.push(mItem);
          expectedNext = mItem.qNum + 1;
        }
      }

      if (filteredMatches.length >= 25) {
        console.log(`Detected Format G (Booklet / Numbered Questions): found ${filteredMatches.length} sequential questions.`);
        for (let i = 0; i < filteredMatches.length; i++) {
          const cur = filteredMatches[i];
          const next = i + 1 < filteredMatches.length ? filteredMatches[i + 1] : null;
          let rawBlock = bodyText.substring(cur.index + cur.matchLength, next ? next.index : bodyText.length).trim();

          // Check if this block contains an embedded Comprehension header
          const compMatch = rawBlock.match(/Comprehension\s*:\s*\(\s*(\d+)\s*[-–to\s]+\s*(\d+)\s*\)[\r\n\s]*(?:Read the following passage[^\n]*[\r\n\s]*)?([\s\S]+)$/i);
          if (compMatch) {
            const startQ = parseInt(compMatch[1], 10);
            const endQ = parseInt(compMatch[2], 10);
            const pText = compMatch[3].trim();
            compPassages[`${startQ}_${endQ}`] = pText;
            if (startQ >= 91 && endQ <= 95) compPassages['paper2_rc1'] = pText;
            if (startQ >= 96 && endQ <= 100) compPassages['paper2_rc2'] = pText;
            if (startQ >= 1 && endQ <= 5) compPassages['paper1_di'] = pText;
            if (startQ >= 46 && endQ <= 50) compPassages['paper1_rc'] = pText;
            
            rawBlock = rawBlock.substring(0, compMatch.index).trim();
          }

          cleanQuestions.push({
            qIndex: cur.qNum,
            pdfQNum: cur.qNum,
            qId: String(cur.qNum),
            text: rawBlock
          });
        }
      }
    }

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
      let text = (rawParsed.text || `Question ${targetIndex}`).trim();
      const rawText = rawItem ? rawItem.text : '';

      // Match-column detection
      const hasListItems = (Array.isArray(rawParsed.list1) && rawParsed.list1.length > 0) || (Array.isArray(rawParsed.list2) && rawParsed.list2.length > 0);
      const isMatchPattern = /Match\s+(?:the\s+)?List|सूची\s*I\s*को\s*सूची\s*II/i.test(text) || /Match\s+(?:the\s+)?List|सूची\s*I\s*को\s*सूची\s*II/i.test(rawText);

      if (hasListItems || isMatchPattern) {
        qType = 'match-column';
        if (text.length > 50 && /^Match/i.test(text)) {
          text = LANGUAGE === 'Hindi' ? 'सूची - I को सूची - II से सुमेलित कीजिए।' : 'Match List - I with List - II.';
        }
      } else if ((rawParsed.assertion && rawParsed.reason) || (/(?:Assertion\s*\(?A\)?|अभिकथन\s*\(?A\)?)/i.test(rawText) && /(?:Reason\s*\(?R\)?|कारण\s*\(?R\)?)/i.test(rawText))) {
        qType = 'assertion-reason';
      } else if ((Array.isArray(rawParsed.statements) && rawParsed.statements.length > 0) || /(?:Choose the correct (?:answer|option) from the options given below|नीचे दिए गए विकल्पों में से सही उत्तर चुनिए)/i.test(rawText)) {
        qType = 'multiple-statement';
      } else if (rawParsed.passage || (!isPaperII && targetIndex <= 5)) {
        qType = !isPaperII && targetIndex <= 5 ? 'di' : 'comprehension';
      } else if (isPaperII && targetIndex >= 91 && targetIndex <= 100) {
        qType = 'comprehension';
      } else if (!isPaperII && targetIndex >= 46 && targetIndex <= 50) {
        qType = 'comprehension';
      } else if (!['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di'].includes(qType)) {
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
      options = options.map((opt, i) => String(opt || `Option ${i + 1}`).replace(/^\(?[1-4A-Da-d]\)?[\.:\-–\s]*/, '').trim());

      // Match-column Headers
      let list1Header = rawParsed.list1Header || (LANGUAGE === 'Hindi' ? 'सूची - I' : 'List - I');
      let list2Header = rawParsed.list2Header || (LANGUAGE === 'Hindi' ? 'सूची - II' : 'List - II');

      // Correct Answer Resolution
      let correct = resolveCorrectOption(targetIndex, rawItem, rawParsed, answerKeyMap, isPaperII);

      return {
        setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
        qIndex: targetIndex,
        ntaQuestionId: rawItem ? (rawItem.qId || '') : (rawParsed.ntaQuestionId || ''),
        unit: rawParsed.unit || '',
        type: qType,
        text: text,
        options: options,
        statements: Array.isArray(rawParsed.statements) ? rawParsed.statements : [],
        correct: correct,
        explanation: (rawParsed.explanation || '<p>Detailed explanation.</p>').trim(),
        assertion: rawParsed.assertion || '',
        reason: rawParsed.reason || '',
        list1: Array.isArray(rawParsed.list1) ? rawParsed.list1 : [],
        list2: Array.isArray(rawParsed.list2) ? rawParsed.list2 : [],
        list1Header: qType === 'match-column' ? list1Header : '',
        list2Header: qType === 'match-column' ? list2Header : '',
        passage: passage
      };
    }

    // 3. Batch AI Processing with Checkpoint
    const checkpointFile = path.resolve(`checkpoint_openrouter_${TARGET_SET_ID}.json`);
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

    const batches = [];
    const pendingQuestions = cleanQuestions.filter(q => !processedIndices.has(q.qIndex));

    for (let i = 0; i < pendingQuestions.length; i += 3) {
      batches.push(pendingQuestions.slice(i, i + 3));
    }

    console.log(`\n[3/4] Processing ${batches.length} remaining batches using OpenRouter (${selectedModel})...`);

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      console.log(`Processing Batch ${b + 1}/${batches.length} (Q${batch[0].qIndex} - Q${batch[batch.length - 1].qIndex})...`);

      const prompt = buildPrompt(batch, compPassages, answerKeyMap, isPaperII, LANGUAGE);
      let batchResults = [];

      try {
        batchResults = await callOpenRouterApi(prompt, selectedModel, keyPool);
        if (!Array.isArray(batchResults) || batchResults.length < batch.length) {
          throw new Error(`Incomplete batch: got ${batchResults ? batchResults.length : 0}/${batch.length}`);
        }
      } catch (batchErr) {
        console.warn(`Batch had missing items (${batchErr.message}). Retrying missing items individually...`);
        const returnedIndices = new Set((batchResults || []).map(r => r.qIndex));
        for (const singleQ of batch) {
          if (!returnedIndices.has(singleQ.qIndex)) {
            try {
              const singlePrompt = buildPrompt([singleQ], compPassages, answerKeyMap, isPaperII, LANGUAGE);
              const singleRes = await callOpenRouterApi(singlePrompt, selectedModel, keyPool);
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

      await new Promise(r => setTimeout(r, 600)); // Smooth pacing
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
      console.log(`\n🔍 Found ${missingQuestions.length} missing question(s). Running auto-recovery pass...`);
      for (const misQ of missingQuestions) {
        try {
          console.log(`Auto-recovering Q${misQ.qIndex}...`);
          const singlePrompt = buildPrompt([misQ], compPassages, answerKeyMap, isPaperII, LANGUAGE);
          const singleRes = await callOpenRouterApi(singlePrompt, selectedModel, keyPool);
          if (singleRes && singleRes.length > 0) {
            const structuredQ = sanitizeQuestion(singleRes[0], misQ, misQ.qIndex);
            finalMap.set(misQ.qIndex, structuredQ);
          }
        } catch (recErr) {
          console.error(`Could not auto-recover Q${misQ.qIndex}: ${recErr.message}`);
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

    console.log(`\n[4/4] Committing ${finalQuestions.length} questions to MongoDB...`);

    await Question.deleteMany({ setId: new mongoose.Types.ObjectId(TARGET_SET_ID) });
    await Question.insertMany(finalQuestions);
    await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: finalQuestions.length });

    // Invalidate Redis caches so new questions & sets appear in search/sitemap immediately
    try {
      const { delCachePattern } = require('./config/redis');
      await delCachePattern('questions:*');
      await delCachePattern('pyqsets:*');
    } catch (cErr) {
      // Non-critical cache cleanup
    }

    if (fs.existsSync(checkpointFile)) {
      fs.unlinkSync(checkpointFile);
    }

    // Auto-ping search engines (Google & Bing) for instant SEO crawling
    try {
      const sitemapUrl = 'https://ugcfreepaper.com/sitemap.xml';
      console.log('📡 Notifying search engines of newly imported content...');
      const pings = [
        fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { signal: AbortSignal.timeout(5000) }),
        fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { signal: AbortSignal.timeout(5000) })
      ];
      await Promise.allSettled(pings);
      console.log('✅ Search engines notified for automatic indexing!');
    } catch (pingErr) {
      // Non-blocking ping warning
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

if (require.main === module) {
  main();
}

module.exports = {
  parseAnswerKey,
  resolveCorrectOption,
  extractOptionIdsFromText,
  cleanJsonString
};
