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
        const waitTime = 15000 * (retryCount + 1);
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

async function callAIChatToStructureBatch(batch, compPassages, keyRotation) {
  let prompt = `You are an expert UGC NET Paper I exam parser.
Analyze the raw text of the following ${batch.length} questions. You must:
1. Extract the clean question text (filtering out headers, footer URLs, page numbers, 'Correct Marks : 2 Wrong Marks : 0', etc.).
2. Extract exactly 4 options.
3. Solve each question to determine the correct option index (1, 2, 3, or 4).
4. Assign the correct 'type' based on these rules:
    - 'mcq': Standard single choice question with 4 options.
    - 'assertion-reason': Question containing SPECIFICALLY the words "Assertion (A)" (or "Assertion A") and "Reason (R)" (or "Reason R"). If the question has labels like (A), (B), (C), (D) representing list items (e.g. "(A) Selection threat"), it is NOT an assertion-reason question; it is a multiple-statement question.
    - 'match-column': Question containing matching lists ("List I" and "List II"). You MUST extract and populate "list1", "list2", "list1Header", and "list2Header" fields. Note that List I and List II often have column subtitles/headers (e.g. 'Concept', 'Description', 'Method'). You MUST set "list1Header" and "list2Header" to these specific subtitles, NOT 'List I' or 'List II'. Do NOT include these subtitles in the "list1" or "list2" arrays; those arrays must contain only the 4 actual items.
    - 'multiple-statement': Question containing multiple statements (e.g., "Statement I", "Statement II", or multiple points labeled A, B, C, D, E) followed by option combinations (e.g., "A, B and C only"). You MUST extract these statements into the "statements" array and NOT populate "assertion" or "reason".
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
      "statements": ["Statement A", "Statement B", ...], // for multiple-statement, otherwise empty array
      "correct": number,
      "assertion": "Assertion text", // for assertion-reason, otherwise empty string
      "reason": "Reason text", // for assertion-reason, otherwise empty string
      "list1": ["Item 1", "Item 2", "Item 3", "Item 4"], // for match-column, must contain ONLY the 4 actual items (do NOT include headers like 'Concept')
      "list2": ["Item 1", "Item 2", "Item 3", "Item 4"], // for match-column, must contain ONLY the 4 actual items (do NOT include headers like 'Description')
      "list1Header": "Header 1", // for match-column: the specific column header/subtitle (e.g. 'Concept'), NOT 'List I' or 'List - I'
      "list2Header": "Header 2", // for match-column: the specific column header/subtitle (e.g. 'Description'), NOT 'List II' or 'List - II'
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
  if (keyRotation.hasKeys('gemini')) providers.push('gemini');
  if (keyRotation.hasKeys('groq')) providers.push('groq');

  const errors = [];
  for (const provider of providers) {
    try {
      const apiKey = keyRotation.getNextKey(provider);
      console.log(`[AI Structuring] Trying provider: ${provider}...`);
      const rawResult = await callAIChatForStructure(prompt, apiKey, provider);
      const cleaned = cleanJsonString(rawResult);
      const parsed = JSON.parse(cleaned);
      return getArrayFromParsed(parsed);
    } catch (err) {
      console.warn(`[AI Structuring] Provider ${provider} failed:`, err.message);
      errors.push(`${provider.toUpperCase()}: ${err.message}`);
    }
  }

  throw new Error(`All configured AI providers failed. Details: ${errors.join(' | ')}`);
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

    // 3. Process concurrently in batches of 5 using API key rotation and parallel async pool
    const keyRotation = {
      geminiIndex: 0,
      groqIndex: 0,
      geminiKeys: (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
      groqKeys: (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
      hasKeys(provider) {
        if (provider === 'gemini') return this.geminiKeys.length > 0;
        if (provider === 'groq') return this.groqKeys.length > 0;
        return false;
      },
      getNextKey(provider) {
        if (provider === 'gemini') {
          return this.geminiKeys[this.geminiIndex++ % this.geminiKeys.length];
        }
        if (provider === 'groq') {
          return this.groqKeys[this.groqIndex++ % this.groqKeys.length];
        }
        return null;
      }
    };

    const batches = [];
    for (let i = 0; i < englishQuestions.length; i += 5) {
      batches.push(englishQuestions.slice(i, i + 5));
    }

    const parsedQuestions = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (Q${batch[0].qIndex} to Q${batch[batch.length - 1].qIndex})...`);
      
      const batchJson = await callAIChatToStructureBatch(batch, compPassages, keyRotation);
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
          
          // Strict assertion check: must have BOTH assertion and reason keywords
          const hasAssertionKeywords = textLower.includes('assertion') && 
                                       (textLower.includes('reason') || textLower.includes('reasoning'));
          
          const hasStatementKeywords = textLower.includes('statement i') || 
                                       textLower.includes('statement ii') ||
                                       (textLower.includes('options given below') && 
                                        textLower.includes('only') && 
                                        (textLower.includes('(a)') || textLower.includes('(b)')));
          const hasStatementFields = q.statements && q.statements.filter(Boolean).length > 0;
          
          if (hasListKeywords || hasListFields) {
            q.type = 'match-column';
          } else if (hasAssertionKeywords) {
            q.type = 'assertion-reason';
          } else if (hasStatementKeywords || hasStatementFields) {
            q.type = 'multiple-statement';
            // If the AI incorrectly populated assertion/reason, migrate them to statements array
            if ((!q.statements || q.statements.length === 0) && (q.assertion || q.reason)) {
              q.statements = [];
              if (q.assertion && q.assertion.trim()) q.statements.push(q.assertion.trim());
              if (q.reason && q.reason.trim()) q.statements.push(q.reason.trim());
              q.assertion = "";
              q.reason = "";
            }
          } else {
            // Fallback check: if AI misclassified standard MCQ or multiple statements as assertion-reason
            if (q.type === 'assertion-reason' && !hasAssertionKeywords) {
              if (q.assertion || q.reason) {
                q.type = 'multiple-statement';
                q.statements = [];
                if (q.assertion && q.assertion.trim()) q.statements.push(q.assertion.trim());
                if (q.reason && q.reason.trim()) q.statements.push(q.reason.trim());
                q.assertion = "";
                q.reason = "";
              } else {
                q.type = 'mcq';
              }
            } else {
              q.type = q.type || 'mcq';
            }
          }
        }

        // Post-processing cleanup for match-column list header overflow
        if (q.type === 'match-column') {
          const isGeneric1 = !q.list1Header || /^list\s*[-–]?\s*i$/i.test(q.list1Header.trim());
          if (isGeneric1 && q.list1 && q.list1.length > 4) {
            const rawHeader = q.list1.shift();
            q.list1Header = rawHeader.trim().replace(/^[\(\[\]\)]+|[\(\[\]\)]+$/g, '');
          }
          const isGeneric2 = !q.list2Header || /^list\s*[-–]?\s*ii$/i.test(q.list2Header.trim());
          if (isGeneric2 && q.list2 && q.list2.length > 4) {
            const rawHeader = q.list2.shift();
            q.list2Header = rawHeader.trim().replace(/^[\(\[\]\)]+|[\(\[\]\)]+$/g, '');
          }
        }
      });

      parsedQuestions.push(...batchJson);
      console.log(`Completed batch ${i + 1}/${batches.length} (Q${batch[0].qIndex} to Q${batch[batch.length - 1].qIndex}).`);
      
      // Safe 5-second delay to guarantee free-tier rate limits (keeps rate at 12 RPM)
      if (i < batches.length - 1) {
        console.log("Waiting 5 seconds before next batch...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
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
