/**
 * cross_match_solver.js
 * 
 * Cross-matches an unsolved question paper with a coaching paper that has answers.
 * Transposes answers across shuffled question sequences instantly.
 * 
 * Usage:
 *   node cross_match_solver.js "<target_unsolved.pdf>" "<source_coaching_solved.pdf>"
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('\n❌ Error: Please provide both PDF paths.');
  console.log('Usage: node cross_match_solver.js "<target_unsolved.pdf>" "<source_coaching_solved.pdf>"\n');
  process.exit(1);
}

const fs = require('fs');
const targetPdf = args[0];
const sourcePdf = args[1];
let scriptPath = path.join(__dirname, 'cross_match_solver.py');
if (!fs.existsSync(scriptPath)) {
  scriptPath = path.join(__dirname, '..', 'cross_match_solver.py');
}

console.log(`🔗 Running Cross-Match Sequence Alignment...`);
console.log(`   Target : ${targetPdf}`);
console.log(`   Source : ${sourcePdf}`);

const cmd = `uv run --with pymupdf python "${scriptPath}" "${targetPdf}" "${sourcePdf}"`;

const child = spawn(cmd, {
  stdio: 'inherit',
  shell: true
});

child.on('close', code => {
  if (code !== 0) {
    console.error(`\n❌ Process exited with code ${code}`);
  } else {
    console.log(`\n✨ Cross-matching complete!`);
  }
});
