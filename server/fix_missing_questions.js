/**
 * fix_missing_questions.js
 * Targeted OCR for the 11 missing questions in set 6a7cd369736679814db904cf
 * Uses the same Gemini API key pool as local_ocr_importer.js
 */

const fs = require('fs');
const path = require('path');
const url = require('url');
const mongoose = require('mongoose');
require('dotenv').config();
const { createCanvas } = require('@napi-rs/canvas');

const SET_ID = '6a7cd369736679814db904cf';
const PDF_PATH = 'C:\\Users\\FNULNU\\Downloads\\Sociology PYQs\\P2\\11 Mar 2023 Sociology.pdf';

// API key pool (same as importer)
const apiKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const keyCooldownUntil = apiKeys.map(() => 0);
const keyHistory = apiKeys.map(() => []);
const PER_KEY_RPM = 10;

// Missing questions: { qIndex, pdfPage, note }
// Q4,26,36,49,52,72 = page boundary (question starts on this page, previous page had the text)
// Q92,94,97,99,100 = graph/image pages
const MISSING = [
  { qIndex: 4,   pdfPage: 2,  note: 'page-boundary' },
  { qIndex: 26,  pdfPage: 19, note: 'page-boundary' },
  { qIndex: 36,  pdfPage: 28, note: 'page-boundary' },
  { qIndex: 49,  pdfPage: 38, note: 'page-boundary' },
  { qIndex: 52,  pdfPage: 41, note: 'page-boundary' },
  { qIndex: 72,  pdfPage: 56, note: 'page-boundary' },
  { qIndex: 92,  pdfPage: 71, note: 'graph-page' },
  { qIndex: 94,  pdfPage: 74, note: 'graph-page' },
  { qIndex: 97,  pdfPage: 78, note: 'graph-page' },
  { qIndex: 99,  pdfPage: 81, note: 'graph-page' },
  { qIndex: 100, pdfPage: 82, note: 'graph-page' },
];

function recordRequest(ki) {
  const now = Date.now();
  keyHistory[ki] = keyHistory[ki].filter(t => now - t < 60000);
  keyHistory[ki].push(now);
}

async function getAvailableKey() {
  while (true) {
    const now = Date.now();
    let best = -1, bestTime = Infinity;
    for (let i = 0; i < apiKeys.length; i++) {
      if (keyCooldownUntil[i] > now) continue;
      const recent = keyHistory[i].filter(t => now - t < 60000).length;
      if (recent < PER_KEY_RPM && recent < bestTime) { bestTime = recent; best = i; }
    }
    if (best !== -1) return best;
    const minWait = Math.min(...keyCooldownUntil.map(t => Math.max(0, t - now)));
    const waitMs = Math.max(minWait, 3000);
    console.log(`  ⏳ All keys busy. Waiting ${(waitMs/1000).toFixed(1)}s...`);
    await new Promise(r => setTimeout(r, waitMs));
  }
}

async function ocrPage(base64Image, targetQIndex, retryCount = 0) {
  const ki = await getAvailableKey();
  const apiKey = apiKeys[ki];
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are an expert UGC NET Paper II Sociology exam parser.
This is a page from the UGC NET Paper II Sociology March 2023 exam (bilingual English + Hindi).

YOUR TASK: Extract ONLY question Sl. No. ${targetQIndex} from this page image.

Rules:
- Extract the ENGLISH version only (ignore Hindi text below each question).
- The question may start at the top of this page (continuing from previous page) OR appear mid-page.
- Look for "Sl. No. ${targetQIndex}" or "QBID:${5000 + targetQIndex}" as the identifier.
- Extract: question text, 4 options (as text, not numbers), question type.
- For question type: 'mcq' = normal, 'assertion-reason' = has Assertion(A) and Reason(R), 
  'match-column' = has List I and List II, 'multiple-statement' = has labeled statements A,B,C,D,E with combination options.
- If this page contains a graph/table/figure as the question, describe it briefly in the text field.

Return ONLY valid JSON (no markdown):
{
  "qIndex": ${targetQIndex},
  "text": "question text here",
  "options": ["option 1 text", "option 2 text", "option 3 text", "option 4 text"],
  "type": "mcq",
  "correct": null,
  "ntaQuestionId": "${5000 + targetQIndex}"
}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Image } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 2048 }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    const retryDelay = errText.match(/"retryDelay"\s*:\s*"(\d+)s"/)?.[1];
    const waitMs = retryDelay ? parseInt(retryDelay) * 1000 + 2000 : 5000;
    if ((res.status === 429 || res.status === 503) && retryCount < 30) {
      if (retryDelay && parseInt(retryDelay) > 5) {
        keyCooldownUntil[ki] = Date.now() + waitMs;
        console.warn(`    Key #${ki+1} quota (429). Cooling ${retryDelay}s. Switching...`);
      }
      return ocrPage(base64Image, targetQIndex, retryCount + 1);
    }
    throw new Error(`API ${res.status}: ${errText.substring(0, 200)}`);
  }

  recordRequest(ki);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    if (retryCount < 3) {
      await new Promise(r => setTimeout(r, 2000));
      return ocrPage(base64Image, targetQIndex, retryCount + 1);
    }
    throw new Error('Failed to parse JSON response');
  }
}

async function renderPage(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toBuffer('image/png').toString('base64');
}

async function main() {
  console.log('=== Targeted Missing Question Filler ===\n');
  console.log(`Set: ${SET_ID}`);
  console.log(`Missing questions to fill: ${MISSING.map(m => `Q${m.qIndex}`).join(', ')}\n`);

  // Connect DB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  const db = mongoose.connection.db;
  const setId = new mongoose.Types.ObjectId(SET_ID);

  // Load PDF
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;
  const pdfData = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdfDoc = await pdfjs.getDocument({ data: pdfData }).promise;
  console.log(`✅ PDF loaded (${pdfDoc.numPages} pages)\n`);

  // For page-boundary questions, also render the PREVIOUS page (question text may be there)
  // We'll render a combined tall image of prev+current page OR just current page
  const results = [];
  const failed = [];

  for (const { qIndex, pdfPage, note } of MISSING) {
    console.log(`--- Q${qIndex} (PDF page ${pdfPage}, ${note}) ---`);

    try {
      // For page-boundary questions, render current page AND previous page together
      // by sending two separate OCR calls (current page first, then prev page if needed)
      const pagesToTry = note === 'page-boundary'
        ? [pdfPage, pdfPage - 1]  // try current page, then prev page
        : [pdfPage];

      let extracted = null;

      for (const pg of pagesToTry) {
        if (pg < 1) continue;
        console.log(`  Rendering page ${pg}...`);
        const base64 = await renderPage(pdfDoc, pg);
        console.log(`  Sending to Gemini (looking for Q${qIndex})...`);

        const result = await ocrPage(base64, qIndex);
        console.log(`  Result: "${(result.text || '').substring(0, 80)}"`);

        if (result.text && result.text.length > 10 && !result.text.toLowerCase().includes('not found')) {
          extracted = result;
          break;
        } else {
          console.log(`  Q${qIndex} not found on page ${pg}, trying next page...`);
        }
      }

      if (extracted) {
        results.push({ qIndex, data: extracted });
        console.log(`  ✅ Extracted Q${qIndex}: "${(extracted.text || '').substring(0, 60)}..."`);
      } else {
        failed.push(qIndex);
        console.log(`  ❌ Could not extract Q${qIndex} from any page`);
      }
    } catch (err) {
      failed.push(qIndex);
      console.error(`  ❌ Error on Q${qIndex}:`, err.message);
    }

    // Small delay between questions
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n=== Inserting ${results.length} extracted questions into DB ===\n`);

  let inserted = 0;
  for (const { qIndex, data } of results) {
    const doc = {
      setId,
      qIndex,
      pdfQNum: qIndex,
      ntaQuestionId: data.ntaQuestionId || String(5000 + qIndex),
      text: data.text || '',
      options: Array.isArray(data.options) ? data.options : ['', '', '', ''],
      type: data.type || 'mcq',
      correct: data.correct || null,
      explanation: data.explanation || '',
      statements: data.statements || [],
      assertion: data.assertion || '',
      reason: data.reason || '',
      list1: data.list1 || [],
      list2: data.list2 || [],
      list1Header: data.list1Header || '',
      list2Header: data.list2Header || '',
      passage: data.passage || '',
      language: 'English'
    };

    // Upsert (insert if not exists, update if exists)
    await db.collection('questions').updateOne(
      { setId, qIndex },
      { $set: doc },
      { upsert: true }
    );
    console.log(`  ✅ Q${qIndex} saved: "${(doc.text).substring(0, 60)}"`);
    inserted++;
  }

  // Update questionsLoaded count in pyqsets
  const totalNow = await db.collection('questions').countDocuments({ setId });
  await db.collection('pyqsets').updateOne(
    { _id: setId },
    { $set: { questionsLoaded: totalNow } }
  );
  console.log(`\n📊 Total questions in set now: ${totalNow}/100`);

  if (failed.length > 0) {
    console.log(`\n⚠️  Could not extract (enter manually): Q${failed.join(', Q')}`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch(console.error);
