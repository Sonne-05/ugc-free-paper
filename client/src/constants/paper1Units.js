export const PAPER1_UNITS = [
  'Unit 1: Teaching Aptitude',
  'Unit 2: Research Aptitude',
  'Unit 3: Comprehension',
  'Unit 4: Communication',
  'Unit 5: Mathematical Reasoning and Aptitude',
  'Unit 6: Logical Reasoning',
  'Unit 7: Data Interpretation',
  'Unit 8: Information and Communication Technology (ICT)',
  'Unit 9: People, Development and Environment',
  'Unit 10: Higher Education System'
];

export const getQuestionUnit = (question, index = 0) => {
  if (question?.unit) return question.unit;
  
  const text = (question?.question || question?.text || '').toLowerCase();
  const passage = (question?.passage || '').toLowerCase();
  const type = question?.type;

  if (type === 'di' || text.includes('table') || text.includes('di') || passage.includes('table')) {
    return 'Unit 7: Data Interpretation';
  }
  if (type === 'comprehension' || text.includes('passage') || text.includes('comprehension')) {
    return 'Unit 3: Comprehension';
  }
  if (text.includes('teach') || text.includes('classroom') || text.includes('student') || text.includes('evaluation') || text.includes('pedagogy')) {
    return 'Unit 1: Teaching Aptitude';
  }
  if (text.includes('research') || text.includes('hypothesis') || text.includes('thesis') || text.includes('variables') || text.includes('sampling')) {
    return 'Unit 2: Research Aptitude';
  }
  if (text.includes('communicat') || text.includes('message') || text.includes('barrier') || text.includes('media') || text.includes('sender')) {
    return 'Unit 4: Communication';
  }
  if (text.includes('series') || text.includes('ratio') || text.includes('interest') || text.includes('coding-decoding') || text.includes('percentage') || text.includes('speed')) {
    return 'Unit 5: Mathematical Reasoning and Aptitude';
  }
  if (text.includes('syllogism') || text.includes('argument') || text.includes('fallacy') || text.includes('pramana') || text.includes('vyapti') || text.includes('venn')) {
    return 'Unit 6: Logical Reasoning';
  }
  if (text.includes('ict') || text.includes('internet') || text.includes('ram') || text.includes('rom') || text.includes('email') || text.includes('computer') || text.includes('software')) {
    return 'Unit 8: Information and Communication Technology (ICT)';
  }
  if (text.includes('pollution') || text.includes('climate') || text.includes('environment') || text.includes('energy') || text.includes('disaster') || text.includes('sdg')) {
    return 'Unit 9: People, Development and Environment';
  }
  if (text.includes('university') || text.includes('higher education') || text.includes('governance') || text.includes('nep') || text.includes('policy') || text.includes('ugc')) {
    return 'Unit 10: Higher Education System';
  }

  return PAPER1_UNITS[index % 10];
};
