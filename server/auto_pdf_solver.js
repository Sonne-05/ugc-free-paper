/**
 * auto_pdf_solver.js
 * 
 * Node.js wrapper for auto_pdf_solver.py
 * 
 * Usage:
 *   node auto_pdf_solver.js "C:\path\to\question_paper.pdf"
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('\n❌ Error: Please provide the PDF path.');
  console.log('Usage: node auto_pdf_solver.js "<path_to_pdf>"\n');
  process.exit(1);
}

const fs = require('fs');
const pdfPath = args[0];
let scriptPath = path.join(__dirname, 'auto_pdf_solver.py');
if (!fs.existsSync(scriptPath)) {
  scriptPath = path.join(__dirname, '..', 'auto_pdf_solver.py');
}

console.log(`🚀 Launching Auto PDF Solver on: ${pdfPath}`);

const cmd = `uv run --with pymupdf,requests python "${scriptPath}" "${pdfPath}"`;

const child = spawn(cmd, {
  stdio: 'inherit',
  shell: true
});

child.on('close', code => {
  if (code !== 0) {
    console.error(`\n❌ Process exited with code ${code}`);
  } else {
    console.log(`\n✨ Done!`);
  }
});
