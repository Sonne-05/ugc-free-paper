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

// Utility function to parse answer key PDF text into a mapping object
function parseAnswerKey(text) {
  const mapping = {};

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

const OPENCODE_FREE_MODELS = [
  'nemotron-3-ultra-free',
  'mimo-v2.5-free',
  'deepseek-v4-flash-free',
  'hy3-free',
  'laguna-s-2.1-free',
  'big-pickle',
  'nemotron-3.5-lightning-free'
];

// Unified API Caller (Supports OmniRoute Local Gateway + Direct OpenCode Zen)
async function callOpenCodeApi(prompt, model, retryCount = 0) {
  let baseUrl = (process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
  if (baseUrl.includes('opencodezen.com')) {
    baseUrl = 'https://opencode.ai/zen/v1';
  }
  
  const isOmniRoute = baseUrl.includes('20128') || model.startsWith('auto') || process.env.USE_OMNIROUTE === 'true';
  let apiKey = (process.env.OPENCODE_API_KEY || '').replace(/\"/g, '').trim();

  if (isOmniRoute && !apiKey) {
    apiKey = 'omniroute';
  } else if (!apiKey) {
    throw new Error('OPENCODE_API_KEY is not set in .env file.');
  }

  const urlEndpoint = `${baseUrl}/chat/completions`;

  // Build model cascade list
  const modelCascade = isOmniRoute 
    ? [model, 'auto/coding', 'auto', 'auto/fast']
    : [model, ...OPENCODE_FREE_MODELS.filter(m => m !== model)];
    
  const currentModel = modelCascade[retryCount % modelCascade.length];

  try {
    const res = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model: currentModel,
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
      if (rawText.trim().startsWith('data:')) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
            try {
              const chunk = JSON.parse(trimmed.replace(/^data:\s*/, ''));
              const chunkContent = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || '';
              rawJson += chunkContent;
            } catch (_) {}
          }
        }
      } else {
        try {
          const data = JSON.parse(rawText);
          rawJson = data.choices?.[0]?.message?.content || (typeof data === 'string' ? data : JSON.stringify(data));
        } catch (_) {
          rawJson = rawText;
        }
      }

      const parsed = JSON.parse(cleanJsonString(rawJson));
      return parsed.questions || (Array.isArray(parsed) ? parsed : []);
    }

    const errText = await res.text();
    if ((res.status === 429 || res.status === 503) && retryCount < 10) {
      const nextModel = modelCascade[(retryCount + 1) % modelCascade.length];
      console.warn(`[AI Gateway ${res.status}] ${currentModel} busy. Switching to "${nextModel}" (Attempt ${retryCount + 1}/10)...`);
      return callOpenCodeApi(prompt, model, retryCount + 1);
    }

    console.warn(`[AI Gateway Error] Status ${res.status} on ${currentModel}: ${errText.substring(0, 150)}`);
  } catch (err) {
    if (isOmniRoute && err.message.includes('ECONNREFUSED')) {
      console.error('\n❌ Could not connect to local OmniRoute on http://localhost:20128.');
      console.error('👉 Please start OmniRoute in a separate terminal: npx omniroute\n');
    } else {
      console.warn(`[AI Gateway Network Error on ${currentModel}]: ${err.message}`);
    }
  }

  if (retryCount < 10) {
    const nextModel = modelCascade[(retryCount + 1) % modelCascade.length];
    console.warn(`[AI Gateway] Switching to backup "${nextModel}" after 2s (Attempt ${retryCount + 1}/10)...`);
    await new Promise(r => setTimeout(r, 2000));
    return callOpenCodeApi(prompt, model, retryCount + 1);
  }

  throw new Error(`All AI Gateway models exhausted after 10 retry cycles.`);
}

function buildPrompt(batch, compPassages, answerKeyMap, isPaperII, importLanguage) {
  let prompt = `You are an expert UGC NET ${isPaperII ? 'Paper II' : 'Paper I'} exam parser with deep mastery in English, Hindi (हिन्दी), and Sindhi (सिन्धी - देवनागरी).
Analyze the following ${batch.length} questions from the exam paper.

Target Language & Script Rules (STRICT ENFORCEMENT):
Selected Language: "${importLanguage}".

1. If "${importLanguage}" is "Hindi":
   - Extract the entire question prompt, statements, and all 4 options strictly in HINDI (हिन्दी) using DEVANAGARI script.
   - If the original paper has English + Hindi side-by-side or stacked, isolate and extract ONLY the Hindi Devanagari text.
   - The "explanation" field must be written in Hindi (हिन्दी) (1-2 sentences).

2. If "${importLanguage}" is "Sindhi":
   - In UGC NET Sindhi papers, questions are given in both Devanagari script (देवनागरी) and Perso-Arabic script (سنڌي).
   - You MUST extract ONLY the Sindhi text written in DEVANAGARI (देवनागरी) script.
   - Completely DISCARD and STRIP ALL Perso-Arabic / Urdu script characters and lines.
   - Accurately preserve Sindhi Devanagari phonetic letters (such as ॻ, ॼ, ॾ, ॿ, ङ, ञ, ड़, ढ़, ॴ, ॵ, etc.).
   - The "explanation" field must be written in Sindhi Devanagari (1-2 sentences).

3. If "${importLanguage}" is "English":
   - Extract ONLY the English text for question text, statements, and 4 options.
   - Discard all Hindi, Sindhi, Devanagari, and Perso-Arabic translations or annotations.
   - The "explanation" field must be written in English (1-2 sentences).

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
  console.log('⚡ OpenCode Zen High-Speed Text Question Importer');
  console.log('======================================================\n');

  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const cliOmniroute = args.includes('--omniroute');
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

  if (cliOmniroute) {
    process.env.OPENCODE_BASE_URL = process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1';
    process.env.USE_OMNIROUTE = 'true';
  }

  if (cliPdf && cliSetId) {
    selectedModel = cliModel || (cliOmniroute ? 'auto/coding' : (process.env.OPENCODE_MODEL || 'deepseek-v4-flash-free'));
    PDF_PATH = cliPdf;
    TARGET_SET_ID = cliSetId;
    LANGUAGE = cliLang || 'English';
    ANSWER_KEY_PATH = cliKey || null;
    console.log(`Using CLI Args -> ${cliOmniroute ? '🌐 Gateway: OmniRoute | ' : ''}Model: "${selectedModel}", Language: "${LANGUAGE}"`);
  } else {
    // Available AI Models & Gateways
    const availableModels = [
      { name: '🚀 OmniRoute Local Gateway (Auto-fallback across 90+ free models)', id: 'auto/coding', isOmni: true },
      { name: 'Nemotron 3 Ultra Free', id: 'nemotron-3-ultra-free' },
      { name: 'DeepSeek V4 Flash Free', id: 'deepseek-v4-flash-free' },
      { name: 'MiMo-V2.5 Free', id: 'mimo-v2.5-free' },
      { name: 'Hy3 Free', id: 'hy3-free' },
      { name: 'Laguna S 2.1 Free', id: 'laguna-s-2.1-free' },
      { name: 'Big Pickle', id: 'big-pickle' }
    ];

    console.log('Select AI Provider / Model:');
    availableModels.forEach((m, idx) => console.log(`  ${idx + 1}. ${m.name} [${m.id}]`));
    const modelChoice = await askQuestion(`\nEnter choice (1-${availableModels.length}) [Default: 1 - OmniRoute / auto]: `);
    const choiceIdx = parseInt(modelChoice, 10) - 1;
    const selected = (choiceIdx >= 0 && choiceIdx < availableModels.length)
      ? availableModels[choiceIdx]
      : availableModels[0];

    selectedModel = selected.id;
    if (selected.isOmni) {
      process.env.OPENCODE_BASE_URL = process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1';
      process.env.USE_OMNIROUTE = 'true';
    }

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
    const checkpointFile = path.resolve(`checkpoint_opencode_${TARGET_SET_ID}.json`);
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

    for (let i = 0; i < pendingQuestions.length; i += 5) {
      batches.push(pendingQuestions.slice(i, i + 5));
    }

    console.log(`\n[3/4] Processing ${batches.length} remaining batches using OpenCode Zen (${selectedModel})...`);

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      console.log(`Processing Batch ${b + 1}/${batches.length} (Q${batch[0].qIndex} - Q${batch[batch.length - 1].qIndex})...`);

      const prompt = buildPrompt(batch, compPassages, answerKeyMap, isPaperII, LANGUAGE);
      let batchResults = [];

      try {
        batchResults = await callOpenCodeApi(prompt, selectedModel);
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
              const singleRes = await callOpenCodeApi(singlePrompt, selectedModel);
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

        const structuredQ = {
          setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
          qIndex: qIndex,
          ntaQuestionId: matched ? matched.qId : (q.ntaQuestionId || ''),
          unit: '',
          type: q.type || 'mcq',
          text: (q.text || `Question ${qIndex}`).trim(),
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

      await new Promise(r => setTimeout(r, 600)); // Smooth pacing
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
          const singleRes = await callOpenCodeApi(singlePrompt, selectedModel);
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
    console.log(`🎉 SUCCESS: Imported ${finalQuestions.length} questions into Set "${targetSet.title}" using OpenCode Zen!`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('\n❌ Fatal Import Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
