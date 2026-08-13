const fs = require('fs');
let code = fs.readFileSync('local_ocr_importer.js', 'utf8');

// Find the Target Language Rule section and strengthen it
const oldLangRule = `Target Language Rule:\r\nYou MUST extract the questions and option texts in the following language/format: "\${importLanguage}".\r\n- If "English" is selected: Extract only the English version of the questions. If the text has both English and Hindi/Sindhi versions, ignore the Hindi/Sindhi text and extract only the English text.\r\n- If "Hindi" is selected: Extract only the Hindi version of the questions (in Devanagari script).`;

const newLangRule = `\${importLanguage === 'English' ? \`⚠️  CRITICAL LANGUAGE ENFORCEMENT — ENGLISH ONLY MODE ACTIVE:
This PDF contains BOTH English (Roman/Latin script) and Hindi (Devanagari script: क, ख, ग...) text.
You MUST extract ONLY the ENGLISH text. Any Devanagari/Hindi characters in your output = TASK FAILURE.
Every single field (text, options, statements, list items, assertion, reason) must be in English only.
\` : ''}
Target Language Rule:
You MUST extract the questions and option texts in the following language/format: "\${importLanguage}".
- If "English" is selected: Extract ONLY the English Roman-script text. Skip/ignore ALL Hindi Devanagari text completely, even if it appears right next to the English text on the same line.
- If "Hindi" is selected: Extract only the Hindi version of the questions (in Devanagari script).`;

if (code.includes(oldLangRule)) {
  code = code.replace(oldLangRule, newLangRule);
  console.log('Language rule replaced successfully.');
} else {
  console.log('Pattern not found. Trying alternate approach...');
  // Try with \n instead of \r\n
  const oldAlt = oldLangRule.replace(/\r\n/g, '\n');
  if (code.includes(oldAlt)) {
    code = code.replace(oldAlt, newLangRule.replace(/\r\n/g, '\n'));
    console.log('Replaced with \\n variant.');
  } else {
    console.log('Still not found. Logging a snippet for debugging:');
    const idx = code.indexOf('Target Language Rule:');
    console.log(JSON.stringify(code.slice(idx, idx + 300)));
  }
}

fs.writeFileSync('local_ocr_importer.js', code, 'utf8');
