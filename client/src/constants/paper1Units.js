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

  // Unit 7: Data Interpretation (DI)
  if (
    type === 'di' || 
    /\btable\b/i.test(text) || 
    /\bdi\b/i.test(text) || 
    /\btable\b/i.test(passage)
  ) {
    return 'Unit 7: Data Interpretation';
  }
  
  // Unit 3: Comprehension
  if (
    type === 'comprehension' || 
    /\bpassage\b/i.test(text) || 
    /\bcomprehension\b/i.test(text)
  ) {
    return 'Unit 3: Comprehension';
  }
  
  // Unit 1: Teaching Aptitude
  if (
    /\bteach/i.test(text) || 
    /\bclassroom/i.test(text) || 
    /\bstudent/i.test(text) || 
    /\bevaluat/i.test(text) || 
    /\bpedagog/i.test(text)
  ) {
    return 'Unit 1: Teaching Aptitude';
  }
  
  // Unit 2: Research Aptitude
  if (
    /\bresearch/i.test(text) || 
    /\bhypothes/i.test(text) || 
    /\bthesis\b/i.test(text) || 
    /\btheses\b/i.test(text) || 
    /\bvariable/i.test(text) || 
    /\bsampl/i.test(text)
  ) {
    return 'Unit 2: Research Aptitude';
  }
  
  // Unit 4: Communication
  if (
    /\bcommunicat/i.test(text) || 
    /\bmessage/i.test(text) || 
    /\bbarrier/i.test(text) || 
    /\bmedia\b/i.test(text) || 
    /\bmedium\b/i.test(text) || 
    /\bsender/i.test(text)
  ) {
    return 'Unit 4: Communication';
  }
  
  // Unit 5: Mathematical Reasoning and Aptitude
  if (
    /\bseries\b/i.test(text) || 
    /\bratio(s)?\b/i.test(text) || 
    /\binterest\b/i.test(text) || 
    /\bcoding-decoding/i.test(text) || 
    /\bpercent/i.test(text) || 
    /%/.test(text) ||
    /\bspeed\b/i.test(text)
  ) {
    return 'Unit 5: Mathematical Reasoning and Aptitude';
  }
  
  // Unit 6: Logical Reasoning
  if (
    /\bsyllogis/i.test(text) || 
    /\bargument/i.test(text) || 
    /\bfallac/i.test(text) || 
    /\bpramana/i.test(text) || 
    /\bvyapti\b/i.test(text) || 
    /\bvenn\b/i.test(text)
  ) {
    return 'Unit 6: Logical Reasoning';
  }
  
  // Unit 8: Information and Communication Technology (ICT)
  if (
    /\bict\b/i.test(text) || 
    /\binternet\b/i.test(text) || 
    /\bram\b/i.test(text) || 
    /\brom\b/i.test(text) || 
    /\bemail\b/i.test(text) || 
    /\bcomputer/i.test(text) || 
    /\bsoftware\b/i.test(text)
  ) {
    return 'Unit 8: Information and Communication Technology (ICT)';
  }
  
  // Unit 9: People, Development and Environment
  if (
    /\bpollut/i.test(text) || 
    /\bclimat/i.test(text) || 
    /\benvironment/i.test(text) || 
    /\benerg/i.test(text) || 
    /\bdisaster/i.test(text) || 
    /\bsdg\b/i.test(text)
  ) {
    return 'Unit 9: People, Development and Environment';
  }
  
  // Unit 10: Higher Education System
  if (
    /\buniversity/i.test(text) || 
    /\bhigher education/i.test(text) || 
    /\bgovern/i.test(text) || 
    /\bnep\b/i.test(text) || 
    /\bpolic(y|ies)\b/i.test(text) || 
    /\bugc\b/i.test(text)
  ) {
    return 'Unit 10: Higher Education System';
  }

  return PAPER1_UNITS[index % 10];
};
