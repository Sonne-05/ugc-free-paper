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

// 1. Load your env file manually to avoid framework process.env overrides
const envConfig = dotenv.parse(fs.readFileSync(path.resolve('.env')));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

// 2. Define Mongoose Schemas (matching your backend)
const QuestionSchema = new mongoose.Schema({
  setId: mongoose.Schema.Types.ObjectId,
  qIndex: Number,
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

// 3. Setup key rotation
const geminiKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const keyRotation = {
  geminiIndex: 0,
  getNextKey() {
    return geminiKeys[this.geminiIndex++ % geminiKeys.length];
  }
};

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
  const apiKey = keyRotation.getNextKey();
  const urlEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

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
3. Identify the question number/index (e.g. Q51, Question Number: 51, or Question 51).
4. Map the correct option index (1, 2, 3, or 4) by solving the question or using official key inputs.
5. Determine the question type:
    - 'mcq': Standard single choice question with 4 options.
    - 'assertion-reason': Question containing SPECIFICALLY the words "Assertion (A)" (or "Assertion A") and "Reason (R)" (or "Reason R"). You MUST extract the assertion text into the "assertion" field and the reason text into the "reason" field.
    - 'match-column': Question containing matching lists ("List I" and "List II" or "सूची I" and "सूची II"). You MUST extract and populate "list1", "list2", "list1Header", and "list2Header" fields. The "list1Header" and "list2Header" should be the subtitles/headers of the lists (e.g. 'Concept', 'Description').
    - 'multiple-statement': Question containing multiple statements (e.g., points labeled A, B, C, D, E or (A), (B), (C), (D), (E) or I, II, III, IV, V) followed by a set of option combinations (e.g., "(1) A and C only", "(2) D and E only", "(3) B and C only", "(4) B and D only"). CRITICAL: If a question has a list of items labeled with letters/numbers AND is followed by combination options (labeled 1, 2, 3, 4 or (1), (2), (3), (4)), you MUST classify this as 'multiple-statement' (NOT 'mcq'). You MUST extract the statements (A, B, C, D, E) into the "statements" array, and extract the combination options (1, 2, 3, 4) as the 4 items in the "options" array. Do NOT include the statements (A, B, C, D, E) inside the "text" or "options" fields.
6. Set the 'unit' property to an empty string "".
7. Generate a detailed explanation in standard English.
8. Output ONLY a JSON object matching the following schema:

Schema:
{
  "questions": [
    {
      "qIndex": number,
      "unit": "",
      "type": "mcq" | "assertion-reason" | "match-column" | "comprehension" | "multiple-statement" | "di",
      "text": "Clean question text in target script...",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "statements": ["Statement A", "Statement B", ...],
      "correct": number,
      "assertion": "Assertion text",
      "reason": "Reason text",
      "list1": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "list2": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "list1Header": "Header 1",
      "list2Header": "Header 2",
      "explanation": "Detailed explanation in English..."
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
      if ((response.status === 429 || response.status === 503) && retryCount < 15) {
        const keysCount = geminiKeys.length || 1;
        // If we have cycled through all keys once, wait 60s for full RPM/TPM reset, otherwise wait 15s to check next key
        const isCycleExhausted = retryCount > 0 && retryCount % keysCount === 0;
        const waitTime = isCycleExhausted ? 60000 : 15000;

        console.warn(`[AI OCR] Gemini rate limited (429/503) on Page ${pageNum}. Details: ${errText.substring(0, 250)}. Waiting ${waitTime / 1000}s for reset (Retry ${retryCount + 1}/15) with next key...`);
        await new Promise(r => setTimeout(r, waitTime));
        return callAIChatForOcrPage(base64Image, pageNum, isPaperII, importLanguage, retryCount + 1);
      }
      throw new Error(`API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleaned = cleanJsonString(rawText);
    
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.questions || parsed;
    } catch (jsonErr) {
      if (retryCount < 15) {
        console.warn(`[AI OCR] Malformed JSON on Page ${pageNum}. Retrying (${retryCount + 1}/15)...`);
        await new Promise(r => setTimeout(r, 2000));
        return callAIChatForOcrPage(base64Image, pageNum, isPaperII, importLanguage, retryCount + 1);
      }
      throw jsonErr;
    }
  } catch (err) {
    if (retryCount < 15 && (err.message.includes('fetch') || err.message.includes('timeout') || err.message.includes('API error'))) {
      console.warn(`[AI OCR] Network error on Page ${pageNum} (${err.message}). Retrying (${retryCount + 1}/15)...`);
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
      const hasHeader = /Question\s*Number\s*:\s*\d+/i.test(pageText) || 
                        /Question\s*Id\s*:\s*\d+/i.test(pageText) || 
                        /Q\s*\.\s*\d+/i.test(pageText);
      if (hasHeader) ocrPages.push({ pageNum, page });
    }

    console.log(`Pre-scan found ${ocrPages.length} question-bearing pages.`);
    
    let parsedQuestions = [];
    let completedOcrCount = 0;
    const totalOcrPages = ocrPages.length;

    for (let i = 0; i < ocrPages.length; i++) {
      const { pageNum, page } = ocrPages[i];
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
        console.error(`\n❌ Error: Page ${pageNum} failed to process after all 15 retries:`, err.message);
        console.error("Halting import to prevent saving an incomplete question set to the database.");
        process.exit(1);
      }

      pageQuestions.forEach(q => {
        // Normalize indices (e.g. Q51-150 becomes relative Q1-100)
        const pdfQNum = parseInt(q.qIndex, 10);
        const dbQIndex = (isPaperII && pdfQNum >= 51 && pdfQNum <= 150) ? pdfQNum - 50 : pdfQNum;
        
        let updatedQ = {
          ...q,
          qIndex: dbQIndex,
          setId: new mongoose.Types.ObjectId(TARGET_SET_ID)
        };

        // Handle forced DI/comprehension ranges matching your website logic
        if (!isPaperII) {
          if (dbQIndex >= 1 && dbQIndex <= 5) {
            updatedQ.type = 'di';
          } else if (dbQIndex >= 46 && dbQIndex <= 50) {
            updatedQ.type = 'comprehension';
          }
        } else {
          if (dbQIndex >= 91 && dbQIndex <= 95) {
            updatedQ.type = 'comprehension';
          } else if (dbQIndex >= 96 && dbQIndex <= 100) {
            updatedQ.type = 'comprehension';
          }
        }
        
        parsedQuestions.push(updatedQ);
      });
      
      console.log(`Page ${pageNum} processed successfully. Questions found: ${pageQuestions.length}`);
      completedOcrCount++;
      
      // Cooldown delay between pages to be safe from rate limits
      if (i < ocrPages.length - 1) {
        const cooldownDelay = 12000; // 12 seconds delay
        console.log(`Waiting ${cooldownDelay / 1000} seconds before next page...`);
        await new Promise(resolve => setTimeout(resolve, cooldownDelay));
      }
    }

    if (parsedQuestions.length > 0) {
      console.log(`Cleaning old questions for Set ${TARGET_SET_ID}...`);
      await Question.deleteMany({ setId: new mongoose.Types.ObjectId(TARGET_SET_ID) });
      
      console.log(`Inserting ${parsedQuestions.length} newly parsed questions into database...`);
      await Question.insertMany(parsedQuestions);
      
      await PyqSet.findByIdAndUpdate(TARGET_SET_ID, { questionsLoaded: parsedQuestions.length });
      console.log("Database updated successfully!");
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