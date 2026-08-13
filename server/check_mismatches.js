require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const url = require('url');

const SET_ID = '6a7cd369736679814db904cf';
const PDF_PATH = 'C:\\Users\\FNULNU\\Downloads\\Sociology PYQs\\P2\\11 Mar 2023 Sociology.pdf';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const setId = new mongoose.Types.ObjectId(SET_ID);
  const dbQuestions = await db.collection('questions').find({ setId }, {
    projection: { qIndex: 1, text: 1, options: 1, type: 1, _id: 0 }
  }).toArray();
  await mongoose.disconnect();

  const dbMap = {};
  dbQuestions.forEach(q => { if (q.qIndex != null) dbMap[q.qIndex] = q; });

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;

  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdfDoc = await pdfjs.getDocument({ data }).promise;

  // Build: pageNum -> list of Sl.No found on that page (after Paper II starts)
  const pageToSlNos = {}; // pageNum -> [slNos]
  const slNoToPage = {};  // slNo -> pageNum (first occurrence)
  let paperIIStarted = false;

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(i => i.str).join(' ');
    if (/Paper\s*II/i.test(pageText)) paperIIStarted = true;
    if (!paperIIStarted) continue;

    const matches = Array.from(pageText.matchAll(/Sl\s*\.\s*No[\s\.:]?\s*(\d{1,3})\b/gi))
      .map(m => parseInt(m[1], 10))
      .filter(n => n >= 1 && n <= 100);
    const unique = Array.from(new Set(matches));
    pageToSlNos[pageNum] = unique;
    unique.forEach(n => { if (!slNoToPage[n]) slNoToPage[n] = pageNum; });
  }

  console.log('=== QUESTION STATUS REPORT ===\n');

  const missing = [];
  const present = [];
  const pageBoundary = []; // questions at top of page (only Sl.No header, no question text)

  for (let i = 1; i <= 100; i++) {
    if (!dbMap[i]) {
      missing.push(i);
    } else {
      present.push(i);
      // Check if this question is at a page boundary
      // (i.e., it appears FIRST on its page with very little surrounding text)
      const pg = slNoToPage[i];
      if (pg) {
        const page = await pdfDoc.getPage(pg);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(j => j.str).join(' ');
        // Boundary = Sl.No appears but page has almost no other text (just QBID and options)
        const isAtBoundary = pageText.length < 150 && /QBID/i.test(pageText);
        if (isAtBoundary) pageBoundary.push(i);
      }
    }
  }

  console.log(`✅ Present in DB : ${present.length}/100`);
  console.log(`❌ Missing in DB : ${missing.length}/100`);
  console.log(`   Missing: [${missing.join(', ')}]\n`);

  // Questions at page boundary are HIGH RISK for wrong content
  // (their text was on the previous page, so the AI may have extracted wrong question)
  const highRisk = pageBoundary.filter(n => dbMap[n]);
  if (highRisk.length > 0) {
    console.log(`⚠️  HIGH RISK (page boundary - may have wrong content): ${highRisk.length}`);
    console.log(`   Questions: [${highRisk.join(', ')}]`);
    console.log(`   Reason: These Sl. Nos appear at the very start of a new page with no question text`);
    console.log(`   in the text layer — the question text was on the previous page. AI may have`);
    console.log(`   assigned the wrong question to this slot.\n`);
    highRisk.forEach(n => {
      const q = dbMap[n];
      console.log(`   Q${n}: "${(q.text || '').substring(0, 80).replace(/\n/g, ' ')}"`);
    });
  } else {
    console.log('✅ No high-risk page-boundary questions detected.');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total questions in DB    : ${dbQuestions.length}`);
  console.log(`Confirmed correct slots  : ${present.length - highRisk.length}`);
  console.log(`High risk (verify these) : ${highRisk.length}`);
  console.log(`Missing (enter manually) : ${missing.length}`);
  console.log(`\n💡 Re-importing with updated local_ocr_importer.js will fix question number mismatches automatically.`);
}

main().catch(console.error);
