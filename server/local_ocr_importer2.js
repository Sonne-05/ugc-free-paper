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

// 3. API Call to Colab Server
async function callColabOcrServer(colabUrl, base64Image, pageNum, isPaperII, importLanguage, retryCount = 0) {
  const endpoint = colabUrl.replace(/\/$/, '') + '/ocr';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Remainder': 'true' // Bypass ngrok / localtunnel warning page if needed
      },
      body: JSON.stringify({
        image: base64Image,
        pageNum: pageNum,
        isPaperII: isPaperII,
        language: importLanguage
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Colab Server error (${response.status}): ${errText.substring(0, 150)}`);
    }

    const data = await response.json();
    return data.questions || [];
  } catch (error) {
    if (retryCount < 5) {
      const waitSec = (retryCount + 1) * 3;
      console.warn(`[Colab OCR] Network/Server glitch on Page ${pageNum}. Retrying in ${waitSec}s (${retryCount + 1}/5)... Error: ${error.message}`);
      await new Promise(res => setTimeout(res, waitSec * 1000));
      return callColabOcrServer(colabUrl, base64Image, pageNum, isPaperII, importLanguage, retryCount + 1);
    }
    throw error;
  }
}

// 4. Main Importer Routine
async function main() {
  console.log("=================================================");
  console.log("   UGC NET Local Importer v2 (Google Colab AI)   ");
  console.log("=================================================\n");

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

  let COLAB_URL = process.env.COLAB_API_URL || '';
  if (!COLAB_URL) {
    COLAB_URL = await askQuestion("Enter your Colab Tunnel URL (e.g. https://xxxx.ngrok-free.app or https://xxxx.loca.lt): ");
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
    console.log(`Colab AI Server: ${COLAB_URL}`);

    // Resolve PDF.js and Canvas dependencies
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
      console.log("\n⚠️  No text-bearing pages found. This PDF appears to be a scanned document.");
      const answer = await askQuestion("Would you like to force-process all pages instead? (y/n): ");
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
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
      
      console.log(`Page ${pageNum} rendered. Image size: ${imgBuffer.length} bytes.`);
      console.log(`Sending to Colab AI Server...`);
      
      let pageQuestions = [];
      try {
        pageQuestions = await callColabOcrServer(COLAB_URL, base64Image, pageNum, isPaperII, LANGUAGE);
      } catch (err) {
        console.error(`\n❌ Error: Page ${pageNum} failed to process after all retries:`, err.message);
        console.error(`💾 Progress saved in checkpoint! Run the command again with Set ID ${TARGET_SET_ID} to resume from Page ${pageNum}.`);
        process.exit(1);
      }

      pageQuestions.forEach(q => {
        let rawStr = String(q.qIndex || '').trim();
        let matchDigits = rawStr.match(/\d+/);
        let pdfQNum = matchDigits ? parseInt(matchDigits[0], 10) : NaN;
        
        let dbQIndex = pdfQNum;
        const maxAllowedQuestions = isPaperII ? 100 : 50;

        if (!isNaN(pdfQNum)) {
          if (isPaperII) {
            if (pdfQNum > 100 && pdfQNum <= 150) dbQIndex = pdfQNum - 50;
            else if (pdfQNum > 100 && pdfQNum <= 200) dbQIndex = pdfQNum - 100;
            else dbQIndex = pdfQNum;
          } else {
            if (pdfQNum > 50 && pdfQNum <= 100) dbQIndex = pdfQNum - 50;
            else dbQIndex = pdfQNum;
          }
        }

        let updatedQ = {
          ...q,
          qIndex: dbQIndex,
          pdfQNum: pdfQNum,
          setId: new mongoose.Types.ObjectId(TARGET_SET_ID),
          correct: undefined, // Do not add answer key
          explanation: ""     // Do not add explanation
        };

        if (!isPaperII) {
          if (dbQIndex >= 1 && dbQIndex <= 5) updatedQ.type = 'di';
          else if (dbQIndex >= 46 && dbQIndex <= 50) updatedQ.type = 'comprehension';
        } else {
          if (dbQIndex >= 91 && dbQIndex <= 100) updatedQ.type = 'comprehension';
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Deduplicate and smart fallback index assignment (ensure NO questions are discarded)
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
          
          if (newScore > existingScore) {
            questionMap.set(q.qIndex, q);
          }
        }
      } else {
        unindexedQueue.push(q);
      }
    });

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
