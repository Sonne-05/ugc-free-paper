require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ugc_free_paper:Koraput%40%4023@ugcfreepaper.zsgzw1l.mongodb.net/ugcfreepaper?appName=ugcfreepaper";
const TARGET_SET_ID = "6a74c2eb0eb5d5a10d4c0748";
const pdfPath = "E:\\USB Data\\PYQS\\2024\\29-Aug-2024-Morning-Shift-UGC-NET-Paper-1.pdf";

const pyqSetSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  paperType: String,
  year: String,
});

const questionSchema = new mongoose.Schema({
  setId: mongoose.Schema.Types.ObjectId,
  qIndex: Number,
  unit: String,
  type: String,
  text: String,
  options: [String],
  statements: [String],
  correct: Number,
  assertion: String,
  reason: String,
  passage: String,
  explanation: String,
  list1: [String],
  list2: [String],
  list1Header: String,
  list2Header: String
});

const PyqSet = mongoose.model('PyqSet', pyqSetSchema);
const Question = mongoose.model('Question', questionSchema);

const cleanJsonString = (str) => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  
  // Resiliently escape literal newlines inside double-quoted JSON string values
  try {
    cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    });
  } catch (e) {
    console.warn("Resilient newline replacement failed:", e.message);
  }
  
  return cleaned;
};

async function callAIChatForStructure(prompt, apiKey, provider, retryCount = 0, overrideModel = null) {
  if (provider === 'gemini') {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });
    if (!response.ok) {
      if (response.status === 429 && retryCount < 3) {
        const waitTime = 10000 * (retryCount + 1);
        console.warn(`[AI Structuring] Gemini 429 Rate Limited. Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callAIChatForStructure(prompt, apiKey, provider, retryCount + 1);
      }
      const errText = await response.text();
      throw new Error(`Gemini API failed with status ${response.status}: ${errText}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  } else if (provider === 'groq') {
    const groqModel = overrideModel || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: groqModel === 'llama-3.1-8b-instant' ? 1500 : 4096
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        if (errText.includes('tokens per day') && groqModel !== 'llama-3.1-8b-instant') {
          console.warn(`[AI Structuring] Groq TPD Limit hit. Retrying immediately with fallback model llama-3.1-8b-instant...`);
          return callAIChatForStructure(prompt, apiKey, provider, retryCount, 'llama-3.1-8b-instant');
        }
        if (retryCount < 3) {
          const waitTime = 10000 * (retryCount + 1);
          console.warn(`[AI Structuring] Groq 429 Rate Limited. Waiting ${waitTime / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return callAIChatForStructure(prompt, apiKey, provider, retryCount + 1, overrideModel);
        }
      }
      throw new Error(`Groq API failed with status ${response.status}: ${errText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '[]';
  } else if (provider === 'openrouter') {
    const openrouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ugcfreepaper.com',
        'X-Title': 'UGC Free Paper'
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });
    if (!response.ok) {
      if (response.status === 429 && retryCount < 3) {
        const waitTime = 10000 * (retryCount + 1);
        console.warn(`[AI Structuring] OpenRouter 429 Rate Limited. Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callAIChatForStructure(prompt, apiKey, provider, retryCount + 1);
      }
      const errText = await response.text();
      throw new Error(`OpenRouter API failed with status ${response.status}: ${errText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '[]';
  }
  throw new Error('Unsupported AI provider');
}

async function callAIChatToStructureBatch(batch, compPassages) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  let provider = '';
  let apiKey = '';

  if (geminiApiKey) {
    provider = 'gemini';
    apiKey = geminiApiKey;
  } else if (groqApiKey) {
    provider = 'groq';
    apiKey = groqApiKey;
  } else if (openrouterApiKey) {
    provider = 'openrouter';
    apiKey = openrouterApiKey;
  } else {
    throw new Error('No AI provider keys configured in .env');
  }

  let prompt = `You are an expert UGC NET Paper I exam parser.
Analyze the raw text of the following ${batch.length} questions. You must:
1. Extract the clean question text (filtering out headers, footer URLs, page numbers, 'Correct Marks : 2 Wrong Marks : 0', etc.).
2. Extract exactly 4 options.
3. Solve each question to determine the correct option index (1, 2, 3, or 4).
4. Assign the correct 'type' based on these rules:
   - 'mcq': Standard single choice question with 4 options.
   - 'assertion-reason': Question containing "Assertion (A)" and "Reason (R)". You MUST extract and populate the "assertion" and "reason" fields.
   - 'match-column': Question containing matching lists ("List I" and "List II"). You MUST extract and populate "list1", "list2", "list1Header", and "list2Header" fields.
   - 'multiple-statement': Question containing multiple statements (e.g., "Statement I", "Statement II", or statements labeled A, B, C, D, E) followed by option combinations (e.g., "A, B and C only"). You MUST extract and populate the "statements" field.
   - 'di': Forced for Q1-Q5 (Data Interpretation based on a table).
   - 'comprehension': Forced for Q46-Q50 (Reading Comprehension based on a passage).
5. Map them to their syllabus unit based on the question index:
   - Q1-Q5: Unit 7: Data Interpretation
   - Q6-Q10: Unit 1: Teaching Aptitude
   - Q11-Q15: Unit 2: Research Aptitude
   - Q16-Q20: Unit 4: Communication
   - Q21-Q25: Unit 5: Mathematical Reasoning and Aptitude
   - Q26-Q30: Unit 6: Logical Reasoning
   - Q31-Q35: Unit 8: Information and Communication Technology (ICT)
   - Q36-Q40: Unit 9: People, Development and Environment
   - Q41-Q45: Unit 10: Higher Education System
   - Q46-Q50: Unit 3: Comprehension
6. Generate a brief, high-quality, and concise explanation in HTML (maximum 3 sentences or a short step-by-step list, keep it under 150 words per question).
7. CRITICAL: Do NOT use double quotes (") anywhere inside your string properties (like "text", "options", "explanation"). If you need quotes, use single quotes ('). Using double quotes inside string fields will break the JSON parser.
8. CRITICAL: Do NOT output literal newlines inside JSON string values. Use escaped "\n" if you need a newline. All HTML attributes inside explanations MUST use single quotes only (e.g. <p class='highlight'>).

Output ONLY a JSON object with a "questions" key containing an array of objects, containing the following properties:
{
  "questions": [
    {
      "qIndex": number,
      "unit": "Unit Name",
      "type": "mcq" | "assertion-reason" | "match-column" | "comprehension" | "multiple-statement" | "di",
      "text": "Clean question text...",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "statements": ["Statement A", "Statement B", ...],
      "correct": number,
      "assertion": "Assertion text",
      "reason": "Reason text",
      "list1": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "list2": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "list1Header": "Header 1",
      "list2Header": "Header 2",
      "explanation": "Detailed explanation of the concept and why the correct option is right in clean HTML format (<p>, <strong>, <ul>, <ol>, <li>, etc.)"
    }
  ]
}

Do not include any markup other than the JSON block.

Here is the raw text for the questions:\n\n`;

  let addedDiPassage = false;
  let addedRcPassage = false;
  const compKeys = Object.keys(compPassages || {});
  const diId = compKeys[0];
  const rcId = compKeys[1];

  batch.forEach(q => {
    prompt += `--- QUESTION NUMBER ${q.qIndex} (Raw ID: ${q.qId}) ---\n`;
    prompt += q.text + "\n\n";
    if (q.qIndex >= 1 && q.qIndex <= 5 && !addedDiPassage && diId && compPassages[diId]) {
      prompt += `[DI Passage Context:\n${compPassages[diId]}]\n\n`;
      addedDiPassage = true;
    }
    if (q.qIndex >= 46 && q.qIndex <= 50 && !addedRcPassage && rcId && compPassages[rcId]) {
      prompt += `[RC Passage Context:\n${compPassages[rcId]}]\n\n`;
      addedRcPassage = true;
    }
  });

  const getArrayFromParsed = (parsed) => {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) return parsed.questions;
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    }
    return [];
  };

  const providers = [];
  if (geminiApiKey) providers.push({ name: 'gemini', key: geminiApiKey });
  if (groqApiKey) providers.push({ name: 'groq', key: groqApiKey });
  if (openrouterApiKey) providers.push({ name: 'openrouter', key: openrouterApiKey });

  let lastError = null;
  for (const provider of providers) {
    try {
      console.log(`[AI Structuring] Trying provider: ${provider.name}...`);
      const rawResult = await callAIChatForStructure(prompt, provider.key, provider.name);
      const cleaned = cleanJsonString(rawResult);
      const parsed = JSON.parse(cleaned);
      return getArrayFromParsed(parsed);
    } catch (err) {
      console.warn(`[AI Structuring] Provider ${provider.name} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All configured AI providers failed. Last error: ${lastError ? lastError.message : 'No providers'}`);
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB!");

    const fileBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: fileBuffer });
    const parsedPdf = await parser.getText();
    const text = parsedPdf.text;
    console.log("PDF text extracted successfully.");

    const qHeaderRegex = /Question Number\s*:\s*(\d+)\s+Question Id\s*:\s*(\d+)/g;
    let match;
    const questionsMap = new Map();
    const matchesList = [];

    while ((match = qHeaderRegex.exec(text)) !== null) {
      matchesList.push({ index: match.index, qNum: parseInt(match[1]), qId: match[2] });
    }

    const compPassages = {};
    const compRegex = /Question Id\s*:\s*(\d+)\s+Question Type\s*:\s*(COMPREHENSION)/g;
    while ((match = compRegex.exec(text)) !== null) {
      const qId = match[1];
      if (!compPassages[qId]) {
        const nextIdx = text.indexOf('Sub questions', match.index);
        compPassages[qId] = text.substring(match.index, nextIdx > -1 ? nextIdx : match.index + 2000);
      }
    }

    for (let i = 0; i < matchesList.length; i++) {
      const current = matchesList[i];
      if (current.qNum > 50) continue;
      
      const nextIndex = (i + 1 < matchesList.length) ? matchesList[i + 1].index : text.length;
      const questionBlockText = text.substring(current.index, nextIndex);
      
      if (!questionsMap.has(current.qId)) {
        questionsMap.set(current.qId, { qIndex: current.qNum, qId: current.qId, text: questionBlockText });
      }
    }

    const englishQuestions = Array.from(questionsMap.values()).sort((a, b) => a.qIndex - b.qIndex);
    console.log(`Parsed ${englishQuestions.length} unique English questions.`);

    const compKeys = Object.keys(compPassages);
    const diPassageId = compKeys[0];
    const rcPassageId = compKeys[1];

    const parsedQuestions = [];
    for (let i = 0; i < englishQuestions.length; i += 2) {
      const batch = englishQuestions.slice(i, i + 2);
      console.log(`Processing batch Q${batch[0].qIndex} to Q${batch[batch.length - 1].qIndex}...`);
      const batchJson = await callAIChatToStructureBatch(batch, compPassages);
      batchJson.forEach(q => {
        if (q.qIndex >= 1 && q.qIndex <= 5) {
          q.passage = diPassageId ? compPassages[diPassageId] : "";
          q.type = 'di';
        } else if (q.qIndex >= 46 && q.qIndex <= 50) {
          q.passage = rcPassageId ? compPassages[rcPassageId] : "";
          q.type = 'comprehension';
        } else {
          // Heuristic validation layer to ensure accurate type selection
          const textLower = (q.text || '').toLowerCase();
          
          const hasListKeywords = textLower.includes('list i') && textLower.includes('list ii');
          const hasListFields = (q.list1 && q.list1.filter(Boolean).length > 0) || (q.list2 && q.list2.filter(Boolean).length > 0);
          
          const hasAssertionKeywords = (textLower.includes('assertion') || textLower.includes('assertion (a)')) && 
                                      (textLower.includes('reason') || textLower.includes('reason (r)'));
          const hasAssertionFields = (q.assertion && q.assertion.trim().length > 0) || (q.reason && q.reason.trim().length > 0);
          
          const hasStatementKeywords = textLower.includes('statement i') && textLower.includes('statement ii');
          const hasStatementFields = q.statements && q.statements.filter(Boolean).length > 0;
          
          if (hasListKeywords || hasListFields) {
            q.type = 'match-column';
          } else if (hasAssertionKeywords || hasAssertionFields) {
            q.type = 'assertion-reason';
          } else if (hasStatementKeywords || hasStatementFields) {
            q.type = 'multiple-statement';
          } else {
            q.type = q.type || 'mcq';
          }
        }
      });
      parsedQuestions.push(...batchJson);
      
      // Delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    console.log(`Clearing old questions and inserting ${parsedQuestions.length} newly parsed questions...`);
    await Question.deleteMany({ setId: TARGET_SET_ID });
    const inserted = await Question.insertMany(parsedQuestions.map(q => ({ ...q, setId: TARGET_SET_ID })));
    
    console.log(`Successfully loaded ${inserted.length} questions into DB.`);

    const count = await Question.countDocuments({ setId: TARGET_SET_ID });
    await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: count });
    console.log("Database set counts updated successfully.");

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
