const fs = require('fs');
const path = require('path');
const url = require('url');

import('pdfjs-dist/legacy/build/pdf.mjs').then(async (pdfjs) => {
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;

  const PDF_PATH = 'C:\\Users\\FNULNU\\Downloads\\Sociology PYQs\\P2\\11 Mar 2023 Sociology.pdf';
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdfDoc = await pdfjs.getDocument({ data }).promise;

  // Check the problem pages
  const problemPages = [70, 73, 76, 77, 78, 80, 81, 82, 83];
  for (const pageNum of problemPages) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(i => i.str).join(' ');
    const slMatches = Array.from(pageText.matchAll(/Sl\s*\.\s*No[\s\.:]?\s*(\d{1,3})\b/gi)).map(m => m[1]);
    console.log(`Page ${pageNum}: text length=${pageText.length}, Sl.No matches=[${slMatches.join(',')}]`);
    if (pageText.length < 200) console.log(`  Text: "${pageText.substring(0, 150)}"`);
  }
}).catch(console.error);
