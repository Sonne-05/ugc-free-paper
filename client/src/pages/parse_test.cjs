const rawText = `Q3. Match List - I with List - II:
List - I (Method of Teaching)
A. Lecture Method
B. Discussion Method
C. Project Method
D. Seminar Method
List - II (Expected Learning Outcome)
I. Structured and sequential content delivery
II. Democratic participation and brainstorming
III. Pragmatic and hands-on learning experiences
IV. Expert academic presentation and critique
Options:
(A) A-I, B-II, C-III, D-IV
(B) A-II, B-I, C-IV, D-III
(C) A-III, B-IV, C-I, D-II
(D) A-IV, B-III, C-II, D-I
Correct Answer: A`;

const lines = rawText.split('\n');
const parsedQuestions = [];
let currentQ = null;
let currentSection = 'text';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const qMatch = line.match(/^Q\s*\d+[\s\.\:\-](.*)/i) || line.match(/^Question\s+Number\s*\:\s*\d+/i);
  if (qMatch) {
    if (currentQ) parsedQuestions.push(currentQ);
    
    const matchPrefixedText = line.match(/^Q\s*\d+[\s\.\:\-](.*)/i);
    const initialText = matchPrefixedText ? matchPrefixedText[1].trim() : '';
    
    currentQ = {
      type: 'mcq',
      text: initialText,
      options: ['', '', '', ''],
      correct: 1,
      list1: [],
      list2: []
    };
    currentSection = 'text';
    continue;
  }

  if (!currentQ) continue;

  // Detect section headers
  if (/^list\s*[-–]?\s*i\b/i.test(line) && !/list\s*[-–]?\s*ii\b/i.test(line)) {
    currentQ.type = 'match-column';
    currentSection = 'list1';
    currentQ.text += (currentQ.text ? '\n' : '') + line;
    continue;
  }
  if (/^list\s*[-–]?\s*ii\b/i.test(line)) {
    currentQ.type = 'match-column';
    currentSection = 'list2';
    currentQ.text += (currentQ.text ? '\n' : '') + line;
    continue;
  }
  if (/^assertion\s*\(?A\)?/i.test(line)) {
    currentQ.type = 'assertion-reason';
    currentSection = 'assertion';
    currentQ.assertion = line.replace(/^assertion\s*\(?A\)?[\s\:\-\.]*/i, '');
    continue;
  }
  if (/^reason\s*\(?R\)?/i.test(line)) {
    currentQ.type = 'assertion-reason';
    currentSection = 'reason';
    currentQ.reason = line.replace(/^reason\s*\(?R\)?[\s\:\-\.]*/i, '');
    continue;
  }
  if (/^options?\s*\:?/i.test(line) && !line.includes('(')) {
    currentSection = 'options';
    continue;
  }

  // Parse Correct Answer
  const ansMatch = line.match(/(?:correct\s+)?answer\s*[\:\-]\s*[\(\[]?([A-D1-4])[\)\]]?/i);
  if (ansMatch) {
    const ansVal = ansMatch[1].toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(ansVal)) {
      currentQ.correct = ansVal.charCodeAt(0) - 64;
    } else {
      currentQ.correct = Number(ansVal);
    }
    continue;
  }

  // Parse Options ONLY if we are in 'options' section OR 'text' section
  if (currentSection === 'options' || currentSection === 'text') {
    const optMatch = line.match(/^[\(\[]?([A-D1-4])[\)\]]?[\s\.\:\-](.*)/i);
    if (optMatch) {
      const optLetter = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim();
      
      let optIdx = -1;
      if (['A', 'B', 'C', 'D'].includes(optLetter)) optIdx = optLetter.charCodeAt(0) - 65;
      else if (['1', '2', '3', '4'].includes(optLetter)) optIdx = Number(optLetter) - 1;

      if (optIdx >= 0 && optIdx < 4) {
        currentQ.options[optIdx] = optText;
        currentSection = 'options'; // Lock into options
      }
      continue;
    }
  }

  // Append to current section
  if (currentSection === 'list1') {
    currentQ.list1.push(line);
  } else if (currentSection === 'list2') {
    currentQ.list2.push(line);
  } else if (currentSection === 'assertion') {
    currentQ.assertion += ' ' + line;
  } else if (currentSection === 'reason') {
    currentQ.reason += ' ' + line;
  } else if (currentSection === 'passage') {
    currentQ.passage = (currentQ.passage || '') + line + '\n';
  } else if (currentSection === 'text') {
    currentQ.text += (currentQ.text ? '\n' : '') + line;
  }
}

if (currentQ) parsedQuestions.push(currentQ);

console.log(JSON.stringify(parsedQuestions, null, 2));
