/**
 * cross_match_solver.js
 * 
 * Cross-matches an unsolved question paper with a coaching paper that has answers.
 * Transposes answers across shuffled question sequences instantly.
 * 
 * Usage:
 *   node cross_match_solver.js "<target_unsolved.pdf>" "<source_coaching_solved.pdf>" [--paper2]
 */

const { spawn } = require('child_process');
const path = require('path');

const rawArgs = process.argv.slice(2);
if (rawArgs.length < 2) {
  console.log('\n❌ Error: Please provide both PDF paths.');
  console.log('Usage: node cross_match_solver.js "<target_unsolved.pdf>" "<source_coaching_solved.pdf>" [--paper2]\n');
  process.exit(1);
}

const targetPdf = rawArgs[0];
const sourcePdf = rawArgs[1];
const extraArgs = rawArgs.slice(2);
const scriptPath = path.join(__dirname, 'cross_match_solver.py');

console.log(`🔗 Running Cross-Match Sequence Alignment...`);
console.log(`   Target : ${targetPdf}`);
console.log(`   Source : ${sourcePdf}`);
if (extraArgs.length > 0) console.log(`   Options: ${extraArgs.join(' ')}`);

const spawnArgs = ['run', '--with', 'pymupdf', 'python', `"${scriptPath}"`, `"${targetPdf}"`, `"${sourcePdf}"`, ...extraArgs.map(a => `"${a}"`)];

const child = spawn('uv', spawnArgs, {
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
