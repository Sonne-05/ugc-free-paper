const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'client', 'src', 'pages', 'ManageSet_old.log');
const outPath = path.join(__dirname, 'client', 'src', 'pages', 'ManageSet.jsx');

const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');
let codeStartIndex = lines.findIndex(line => line.startsWith('import { useEffect'));
let codeEndIndex = lines.findLastIndex(line => line.startsWith('export default ManageSet'));

if (codeStartIndex !== -1 && codeEndIndex !== -1) {
  const code = lines.slice(codeStartIndex, codeEndIndex + 1).join('\n');
  fs.writeFileSync(outPath, code, 'utf-8');
  console.log('Restored ManageSet.jsx successfully.');
} else {
  console.log('Failed to find start/end markers in log.');
}
