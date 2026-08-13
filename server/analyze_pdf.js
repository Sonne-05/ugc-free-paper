const fs = require('fs');
const path = require('path');
const url = require('url');

import('pdfjs-dist/legacy/build/pdf.mjs').then(async (pdfjs) => {
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;

  const PDF_PATH = 'C:\\Users\\FNULNU\\Downloads\\Sociology PYQs\\P2\\11 Mar 2023 Sociology.pdf';
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdfDoc = await pdfjs.getDocument({ data }).promise;
  const totalPages = pdfDoc.numPages;
  console.log(`Total pages: ${totalPages}`);

  const allSlNums = new Set();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(i => i.str).join(' ');
    // Count English Sl. No. occurrences (each appears twice in bilingual, Set deduplicates)
    const slMatches = Array.from(pageText.matchAll(/Sl\s*\.\s*No[\s\.:]?\s*(\d{1,3})\b/gi));
    slMatches.forEach(m => allSlNums.add(parseInt(m[1], 10)));
  }

  const slArr = Array.from(allSlNums).sort((a, b) => a - b);
  console.log(`\nTotal unique Sl. No. values found: ${slArr.length}`);
  if (slArr.length > 0) {
    console.log(`Range: Sl. No. ${slArr[0]} to Sl. No. ${slArr[slArr.length - 1]}`);
    const missing = [];
    for (let i = slArr[0]; i <= slArr[slArr.length - 1]; i++) {
      if (!allSlNums.has(i)) missing.push(i);
    }
    if (missing.length > 0) console.log(`Missing Sl. Nos: ${missing.join(', ')}`);
    else console.log(`No gaps in sequence ✅`);
    console.log(`\nConclusion: This PDF contains ${slArr.length} questions (Sl. No. ${slArr[0]}–${slArr[slArr.length-1]})`);
  }
}).catch(console.error);
