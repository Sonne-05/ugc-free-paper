const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\FNULNU\\.gemini\\antigravity\\brain\\6d208647-adae-42a8-ac01-116684886eb7\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

for (const line of lines) {
  if (line.includes('Bulk Import Questions from Text') && !line.includes('find_bulk.js')) {
    try {
      const obj = JSON.parse(line);
      const content = obj.content || (obj.tool_calls && obj.tool_calls.length > 0 && obj.tool_calls[0].args.CodeContent) || '';
      if (content.includes('Bulk Import Questions from Text')) {
        console.log("FOUND!");
        console.log(content.substring(content.indexOf('Bulk Import Questions from Text') - 500, content.indexOf('Bulk Import Questions from Text') + 1500));
        break;
      }
    } catch (e) {
      // ignore
    }
  }
}
