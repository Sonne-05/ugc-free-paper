/**
 * auto_pdf_solver.js
 * 
 * Node.js wrapper for auto_pdf_solver.py
 * 
 * Usage:
 *   node auto_pdf_solver.js "<path_to_pdf>" [--paper2]
 */

const { spawn } = require('child_process');
const path = require('path');

const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0) {
  console.log('\n❌ Error: Please provide the PDF path.');
  console.log('Usage: node auto_pdf_solver.js "<path_to_pdf>" [--paper2]\n');
  process.exit(1);
}

const pdfPath = rawArgs[0];
const extraArgs = rawArgs.slice(1);
const scriptPath = path.join(__dirname, 'auto_pdf_solver.py');

console.log(`🚀 Launching Auto PDF Solver on: ${pdfPath}`);
if (extraArgs.length > 0) console.log(`   Options: ${extraArgs.join(' ')}`);

const spawnArgs = ['run', '--with', 'pymupdf,requests', 'python', scriptPath, pdfPath, ...extraArgs];

const child = spawn('uv', spawnArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('close', code => {
  if (code !== 0) {
    console.error(`\n❌ Process exited with code ${code}`);
  } else {
    console.log(`\n✨ Done!`);
  }
});
