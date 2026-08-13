require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const url = require('url');

const SET_ID = '6a7cd369736679814db904cf';
const PDF_PATH = 'C:\\Users\\FNULNU\\Downloads\\Sociology PYQs\\P2\\11 Mar 2023 Sociology.pdf';

async function main() {
  // 1. Connect to DB and fetch all questions
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const setId = new mongoose.Types.ObjectId(SET_ID);
  const dbQuestions = await db.collection('questions').find({ setId }, {
    projection: { qIndex: 1, text: 1, options: 1, correct: 1, _id: 0 }
  }).toArray();
  await mongoose.disconnect();

  // Build map: qIndex -> question
  const dbMap = {};
  dbQuestions.forEach(q => { if (q.qIndex != null) dbMap[q.qIndex] = q; });
  console.log(`DB has ${dbQuestions.length} questions.\n`);

  // 2. Extract PDF Sl. No. → page mapping
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;

  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdfDoc = await pdfjs.getDocument({ data }).promise;
  const totalPages = pdfDoc.numPages;

  // Find which PDF page each Sl. No. appears on (English section only — after "Paper II" header)
  const pdfSlNoPage = {}; // slNo -> pageNum
  const pdfSlNoText = {}; // slNo -> surrounding text snippet

  let paperIIStarted = false;
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(i => i.str).join(' ');

    // Detect Paper II start
    if (/Paper\s*II/i.test(pageText)) paperIIStarted = true;
    if (!paperIIStarted) continue;

    const slMatches = Array.from(pageText.matchAll(/Sl\s*\.\s*No[\s\.:]?\s*(\d{1,3})\b/gi));
    slMatches.forEach(m => {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 100 && !pdfSlNoPage[n]) {
        pdfSlNoPage[n] = pageNum;
        // grab surrounding text
        const idx = m.index;
        pdfSlNoText[n] = pageText.substring(idx, idx + 120).replace(/\s+/g, ' ').trim();
      }
    });
  }

  // 3. Compare
  console.log('=== COMPARISON: PDF Sl. No. vs DB qIndex ===\n');
  console.log('Status | Sl.No | PDF page | DB text (first 60 chars)');
  console.log('-------|-------|----------|-------------------------');

  const missing = [];
  const present = [];

  for (let i = 1; i <= 100; i++) {
    const inPdf = !!pdfSlNoPage[i];
    const inDb = !!dbMap[i];

    if (!inDb) {
      missing.push(i);
      console.log(`❌ MISSING | Q${String(i).padEnd(3)} | Page ${pdfSlNoPage[i] || '??'} | (not in DB)`);
    } else {
      const dbText = (dbMap[i].text || '').substring(0, 60).replace(/\n/g, ' ');
      present.push(i);
      // console.log(`✅ OK      | Q${String(i).padEnd(3)} | Page ${pdfSlNoPage[i] || '??'} | "${dbText}"`);
    }
  }

  console.log(`\n✅ Present in DB: ${present.length}`);
  console.log(`❌ Missing from DB: ${missing.length} → [${missing.join(', ')}]`);

  // Show PDF text snippet for missing questions
  if (missing.length > 0) {
    console.log('\n=== PDF TEXT for MISSING questions ===');
    missing.forEach(n => {
      console.log(`\nQ${n} (PDF page ${pdfSlNoPage[n] || 'NOT FOUND in PDF text'}):`);
      console.log(`  "${pdfSlNoText[n] || '(no text found — likely image/graph page)'}"`);
    });
  }
}

main().catch(console.error);
