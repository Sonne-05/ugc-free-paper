// MockTest.jsx
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import { getQuestionUnit as getUnitFromHelper } from '../constants/paper1Units'
import './MockTest.css'

// 5 Rich sample questions for UGC NET Paper I (General teaching & research aptitude)
const paper1BaseQuestions = [
  {
    id: 1,
    type: "mcq",
    question: "Which of the following is the main objective of teaching?",
    options: [
      "To give information related to the syllabus",
      "To develop thinking power and critical analytical ability in students",
      "To dictate notes to students in classroom sessions",
      "To prepare students to pass the examination with high percentages"
    ],
    correct: 2
  },
  {
    id: 2,
    type: "assertion-reason",
    assertion: "Format and styles of referencing in a thesis are standardized across academic disciplines.",
    reason: "Standardization ensures uniformity, clarity, and ease of cross-referencing for researchers.",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation of (A)",
      "Both (A) and (R) are true but (R) is NOT the correct explanation of (A)",
      "(A) is true but (R) is false",
      "(A) is false but (R) is true"
    ],
    correct: 1
  },
  {
    id: 3,
    type: "match-column",
    question: "Match List I (Evaluation System) with List II (Description):",
    list1: [
      "A. Formative Evaluation",
      "B. Summative Evaluation",
      "C. Criterion-referenced Testing",
      "D. Norm-referenced Testing"
    ],
    list2: [
      "I. Percentile ranks and standard scores are used for comparison.",
      "II. Focuses on feedback during the instructional process.",
      "III. Used for grading, placement, and final certification.",
      "IV. Standards of performance are pre-determined."
    ],
    options: [
      "A-II, B-I, C-IV, D-III",
      "A-II, B-III, C-IV, D-I",
      "A-I, B-II, C-III, D-IV",
      "A-IV, B-III, C-II, D-I"
    ],
    correct: 2
  },
  {
    id: 4,
    type: "comprehension",
    passage: "Digital initiatives of the Government of India are transforming higher education. SWAYAM (Study Webs of Active-Learning for Young Aspiring Minds) provides massive open online courses (MOOCs) for learners. National Digital Library (NDL) hosts millions of academic resources. Virtual Labs offer remote access to laboratories in Science and Engineering. These initiatives collectively aim to increase the Gross Enrolment Ratio (GER) while ensuring equity and quality.",
    question: "Which digital initiative is specifically designed for providing MOOCs?",
    options: [
      "National Digital Library (NDL)",
      "Virtual Labs",
      "SWAYAM",
      "Swayam Prabha"
    ],
    correct: 3
  },
  {
    id: 5,
    type: "comprehension",
    passage: "Digital initiatives of the Government of India are transforming higher education. SWAYAM (Study Webs of Active-Learning for Young Aspiring Minds) provides massive open online courses (MOOCs) for learners. National Digital Library (NDL) hosts millions of academic resources. Virtual Labs offer remote access to laboratories in Science and Engineering. These initiatives collectively aim to increase the Gross Enrolment Ratio (GER) while ensuring equity and quality.",
    question: "What is the primary collective aim of these digital initiatives according to the text?",
    options: [
      "To replace traditional universities completely",
      "To increase Gross Enrolment Ratio (GER) with equity and quality",
      "To reduce the cost of textbook printing and distribution",
      "To train computer science teachers across remote schools"
    ],
    correct: 2
  }
]

// 5 Rich sample questions for UGC NET Paper II Sociology (including screenshot question)
const paper2BaseQuestions = [
  {
    id: 1,
    type: "mcq",
    question: "According to new ideas in the industry:",
    options: [
      "Human work is no longer considered as a pure economic activity",
      "Worker is not supposed to work only for the sake of wages",
      "Both (1) and (2)",
      "None of the above"
    ],
    correct: 3
  },
  {
    id: 2,
    type: "assertion-reason",
    assertion: "According to Emile Durkheim, social facts must be studied as 'things'.",
    reason: "Social facts exist outside individual consciousness and exert external constraints over individuals.",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation of (A)",
      "Both (A) and (R) are true but (R) is NOT the correct explanation of (A)",
      "(A) is true but (R) is false",
      "(A) is false but (R) is true"
    ],
    correct: 1
  },
  {
    id: 3,
    type: "match-column",
    question: "Match the books (List I) with their authors (List II):",
    list1: [
      "A. Rules of Sociological Method",
      "B. Course in Positive Philosophy",
      "C. Economy and Society",
      "D. Principles of Sociology"
    ],
    list2: [
      "I. Max Weber",
      "II. Auguste Comte",
      "III. Herbert Spencer",
      "IV. Emile Durkheim"
    ],
    options: [
      "A-IV, B-II, C-I, D-III",
      "A-II, B-IV, C-I, D-III",
      "A-IV, B-I, C-II, D-III",
      "A-I, B-II, C-III, D-IV"
    ],
    correct: 1
  },
  {
    id: 4,
    type: "comprehension",
    passage: "The concept of 'Dominant Caste' was introduced by M.N. Srinivas to explain rural social structure in India. A caste is dominant when it yields economic and political power and occupies a fairly high position in the ritual hierarchy. Srinivas also introduced the concept of 'Sanskritization' to describe the process by which lower castes attempt to raise their social status by adopting the rituals, customs, and beliefs of twice-born (Dwija) castes.",
    question: "Who introduced the concept of 'Dominant Caste' in Indian Sociology?",
    options: [
      "G.S. Ghurye",
      "M.N. Srinivas",
      "Yogendra Singh",
      "S.C. Dube"
    ],
    correct: 2
  },
  {
    id: 5,
    type: "comprehension",
    passage: "The concept of 'Dominant Caste' was introduced by M.N. Srinivas to explain rural social structure in India. A caste is dominant when it yields economic and political power and occupies a fairly high position in the ritual hierarchy. Srinivas also introduced the concept of 'Sanskritization' to describe the process by which lower castes attempt to raise their social status by adopting the rituals, customs, and beliefs of twice-born (Dwija) castes.",
    question: "According to the text, Sanskritization involves lower castes adopting the customs of:",
    options: [
      "Dominant castes only",
      "Twice-born (Dwija) castes",
      "Westernized elites",
      "All of the above"
    ],
    correct: 2
  }
]

// Steps indicators
const STEP_INSTRUCTIONS_1 = 1
const STEP_INSTRUCTIONS_2 = 2
const STEP_DECLARATION = 3
const STEP_TEST = 4
const STEP_RESULTS = 5

const MockTest = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const stripPrefix = (str, type) => {
    if (!str) return ''
    let cleaned = str.trim()
    if (type === 'letter') {
      cleaned = cleaned.replace(/^[\(\[]?[a-eA-E][\)\]\.\:\-\,\，\s]\s*/, '')
    } else if (type === 'roman') {
      cleaned = cleaned.replace(/^[\(\[]?[ivxIVX]+[\)\]\.\:\-\,\，\s]\s*/, '')
    } else if (type === 'number') {
      cleaned = cleaned.replace(/^[\(\[]?\d+[\)\]\.\:\-\,\，\s]\s*/, '')
    } else if (type === 'assertion') {
      cleaned = cleaned.replace(/^assertion\s*\(?A\)?[\s\:\-\.\,\，\s]*/i, '')
    } else if (type === 'reason') {
      cleaned = cleaned.replace(/^reason\s*\(?R\)?[\s\:\-\.\,\，\s]*/i, '')
    }
    return cleaned
  }

  const formatOptionLabel = (option, idx) => {
    if (!option) return ''
    const trimmed = option.trim()
    
    const hasNumPrefix = /^\d+[\.\:\-\,\，\s]/.test(trimmed) || /^\(\d+\)/.test(trimmed)
    const hasAlphaPrefix = /^[A-D][\.\:\-\,\，\s]/.test(trimmed) || /^\([A-D]\)/.test(trimmed)
    
    if (hasNumPrefix || hasAlphaPrefix) {
      return option
    }
    return `${idx + 1}. ${option}`
  }

  const renderTextHtml = (str) => {
    if (!str) return '';
    const formatted = str
      .replace(/\^([a-zA-Z0-9\-+∞\(\)]+)/g, '<sup>$1</sup>')
      .replace(/_([a-zA-Z0-9\-+∞\(\)]+)/g, '<sub>$1</sub>')
      .replace(/\[bar\/([^\]]+)\]/g, '<span style="text-decoration: overline;">$1</span>')
      .replace(/!=/g, '≠')
      .replace(/=>/g, '⇒')
      .replace(/->/g, '→');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  }

  const parseRow = (line) => {
    if (!line) return []
    const trimmed = line.trim()
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map(p => p.trim())
      const startIdx = parts[0] === '' ? 1 : 0
      const endIdx = parts[parts.length - 1] === '' ? parts.length - 1 : parts.length
      return parts.slice(startIdx, endIdx)
    }
    const hasTabs = trimmed.includes('\t')
    const separator = hasTabs ? '\t' : /\s{2,}/
    return trimmed.split(separator).map(p => p.trim())
  }

  const parseTableText = (text) => {
    if (!text || typeof text !== 'string') return null
    const trimmedText = text.trim()
    if (!trimmedText) return null

    let rawLines = []
    if (trimmedText.includes('||')) {
      rawLines = trimmedText.split('||').map(l => l.trim()).filter(Boolean)
    } else {
      rawLines = trimmedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    }

    if (rawLines.length < 2) return null

    const rows = rawLines
      .map(line => parseRow(line))
      .filter(row => row.length > 1 && !row.every(cell => cell.startsWith('---') || cell.startsWith('===') || cell.trim() === ''))

    if (rows.length < 2) return null
    return rows
  }

  const renderTableData = (tableData, key = 0) => {
    if (!tableData || !tableData.length) return null
    return (
      <div key={key} className="table-responsive" style={{ margin: '15px 0', overflowX: 'auto' }}>
        <table style={{ width: '70%', margin: '0 auto 20px auto', borderCollapse: 'collapse', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-card)' }}>
              {tableData[0].map((cell, cIdx) => (
                <th key={cIdx} style={{ border: '1px solid var(--border)', padding: '6px 10px', fontWeight: 'bold', textAlign: 'center' }}>
                  {renderTextHtml(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(1).map((row, rIdx) => (
              <tr key={rIdx} style={{ backgroundColor: 'var(--bg-card)' }}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid var(--border)', padding: '6px 10px', textAlign: 'center' }}>
                    {renderTextHtml(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderPassageWithTable = (passage) => {
    if (!passage) return null

    if (typeof passage === 'string' && (passage.includes('<p>') || passage.includes('<div>') || passage.includes('<table>'))) {
      return <div dangerouslySetInnerHTML={{ __html: passage }} />
    }

    let cleaned = String(passage).replace(/\r\n/g, '\n')

    // If passage contains '||', extract pre-table text, table data, and post-table text
    if (cleaned.includes('||')) {
      const firstPipe = cleaned.indexOf('|')
      const lastPipe = cleaned.lastIndexOf('|')
      if (firstPipe !== -1 && lastPipe > firstPipe) {
        const beforeText = cleaned.substring(0, firstPipe).trim()
        const tableStr = cleaned.substring(firstPipe, lastPipe + 1).trim()
        const afterText = cleaned.substring(lastPipe + 1).trim()

        const tableData = parseTableText(tableStr)
        if (tableData) {
          return (
            <div>
              {beforeText && (
                <p style={{ textAlign: 'left', lineHeight: '1.65', marginBottom: '10px', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {renderTextHtml(beforeText)}
                </p>
              )}
              {renderTableData(tableData)}
              {afterText && (
                <p style={{ textAlign: 'left', lineHeight: '1.65', marginTop: '12px', marginBottom: '14px', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {renderTextHtml(afterText)}
                </p>
              )}
            </div>
          )
        }
      }
    }

    // Try parsing entire cleaned text directly as table
    const directTable = parseTableText(cleaned)
    if (directTable) {
      return renderTableData(directTable)
    }

    // Otherwise split by double-newlines
    const paragraphs = cleaned.split(/\n\s*\n/)
    return paragraphs.map((para, pIdx) => {
      const trimmedPara = para.trim()
      if (!trimmedPara) return null

      const tableData = parseTableText(trimmedPara)
      if (tableData) {
        return renderTableData(tableData, pIdx)
      }

      const unwrapped = trimmedPara.replace(/([^\n])\n([^\n])/g, '$1 $2').replace(/ +/g, ' ')
      return (
        <p key={pIdx} style={{ textAlign: 'left', lineHeight: '1.65', marginBottom: '14px', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          {renderTextHtml(unwrapped)}
        </p>
      )
    })
  }
  
  // Get paper details from navigation state (fallback to Sociology 2021 if none provided)
  const paperDetails = location.state || {
    paperId: '1',
    title: 'UGC NET Paper II Sociology (2021)',
    subtitle: 'Sociology 4 Jan 2021 Shift 1',
    questionsCount: 100
  }

  const [step, setStep] = useState(STEP_INSTRUCTIONS_1)
  const [defaultLanguage, setDefaultLanguage] = useState('')
  const [declarationChecked, setDeclarationChecked] = useState(false)
  
  // Test parameters
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [questionsState, setQuestionsState] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(paperDetails.questionsCount === 50 ? 3600 : 7200) // 1hr for 50Qs, 2hrs for 100Qs
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerIntervalRef = useRef(null)
  
  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [showQuestionPaperModal, setShowQuestionPaperModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // For Results
  const [testResult, setTestResult] = useState(null)
  const [isReviewMode, setIsReviewMode] = useState(false)

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const userName = isLoggedIn ? (localStorage.getItem('userName') || 'Aspirant') : 'Aspirant'
  const userInitial = userName.charAt(0).toUpperCase()

  const getQuestionUnit = (q, index) => {
    return getUnitFromHelper(q, index);
  };

  const getOptionClassName = (idx) => {
    if (isReviewMode) {
      const q = questionsState[activeQuestionIndex];
      if (!q) return '';
      const correctOption = q.correct;
      const userOpt = q.userAnswer;
      if (idx + 1 === correctOption) {
        return 'option-item--correct-review';
      }
      if (userOpt === idx + 1) {
        return 'option-item--incorrect-review';
      }
      return '';
    }
    return selectedOption === idx + 1 ? 'option-item--selected' : '';
  };

  const renderReviewExplanationPane = () => {
    if (!isReviewMode) return null;
    const currentQ = questionsState[activeQuestionIndex];
    if (!currentQ) return null;

    return (
      <div className="review-explanation-pane" style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        borderLeft: '4px solid #22c55e',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
          <svg style={{ width: '18px', height: '18px', color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Detailed Explanation & Concept Review
        </h4>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px', fontSize: '0.88rem' }}>
          <div>
            <strong>Your Response:</strong>{' '}
            {currentQ.userAnswer ? (
              <span style={{ 
                color: currentQ.userAnswer === currentQ.correct ? '#16a34a' : '#dc2626',
                fontWeight: 600
              }}>
                Option {currentQ.userAnswer} ({currentQ.userAnswer === currentQ.correct ? 'Correct' : 'Incorrect'})
              </span>
            ) : (
              <span style={{ color: '#64748b', fontWeight: 600 }}>Unattempted</span>
            )}
          </div>
          <div>
            <strong>Correct Answer:</strong>{' '}
            <span style={{ color: '#16a34a', fontWeight: 600 }}>
              Option {currentQ.correct}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>Key Concept:</strong> This question belongs to <strong>{getQuestionUnit(currentQ, activeQuestionIndex)}</strong>.
          </p>
          <p>
            <strong>Explanation:</strong> {renderTextHtml(currentQ.explanation || `Option ${currentQ.correct} is correct. Let's analyze:
            The question tests our understanding of the core concept. By evaluating the given facts, Option ${currentQ.correct} is the logically sound response that matches the question's requirements. The other options do not satisfy the condition or represent incorrect factual claims.`)}
          </p>
        </div>
      </div>
    );
  };

  // Initialize questions
  useEffect(() => {
    if (!paperDetails.paperId) return;
    
    fetch(`${API_BASE_URL}/api/pyqsets/${paperDetails.paperId}/questions`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formattedQuestions = data.map((q, i) => ({
            id: i + 1, // 1-indexed for the UI
            dbId: q.id,
            type: q.type || 'mcq',
            question: q.text,
            options: q.options || [],
            correct: q.correct,
            assertion: q.assertion || null,
            reason: q.reason || null,
            list1: q.list1 || null,
            list2: q.list2 || null,
            list1Header: q.list1Header || null,
            list2Header: q.list2Header || null,
            statements: q.statements || [],
            passage: q.passage || null,
            userAnswer: null,
            status: 'UNVISITED'
          }))
          setQuestionsState(formattedQuestions)
        }
      })
      .catch(err => {
        console.error("Failed to load mocktest questions", err)
      })
  }, [paperDetails])

  // Timer runner
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current)
            setIsTimerRunning(false)
            handleSubmitTest(true) // Auto submit on timer end
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerIntervalRef.current)
    }

    return () => clearInterval(timerIntervalRef.current)
  }, [isTimerRunning, timerSeconds])

  // Synchronize fullscreen state from document changes (e.g. Esc key pressed)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Start the test
  const handleStartTest = () => {
    if (!defaultLanguage) {
      alert("Please select your default language first.")
      return
    }
    if (!declarationChecked) {
      alert("Please check the declaration box to agree to the instructions.")
      return
    }
    
    // Visit first question
    const updatedQs = [...questionsState]
    if (updatedQs.length > 0) {
      updatedQs[0].status = 'UNANSWERED'
    }
    setQuestionsState(updatedQs)
    
    setStep(STEP_TEST)
    setIsTimerRunning(true)
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const element = document.documentElement
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Format timer
  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')} : ${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`
  }

  // Navigate between questions via grid palette
  const handleSelectQuestion = (index) => {
    if (index < 0 || index >= questionsState.length) return
    if (isReviewMode) {
      setActiveQuestionIndex(index)
      setSelectedOption(questionsState[index].userAnswer)
      return
    }
    // Before leaving the current question, update its visited state if it's currently UNVISITED
    // (This shouldn't happen for current since it is visited, but let's make sure target gets updated)
    const updatedQs = [...questionsState]
    if (updatedQs[index].status === 'UNVISITED') {
      updatedQs[index].status = 'UNANSWERED'
    }
    setQuestionsState(updatedQs)
    setActiveQuestionIndex(index)
    setSelectedOption(updatedQs[index].userAnswer)
  }

  // Save & Next question
  const handleSaveAndNext = () => {
    const updatedQs = [...questionsState]
    const currentQ = updatedQs[activeQuestionIndex]

    if (selectedOption !== null) {
      currentQ.userAnswer = selectedOption
      currentQ.status = 'ANSWERED'
    } else {
      currentQ.userAnswer = null
      currentQ.status = 'UNANSWERED'
    }

    // Move to next question if not at the end
    const nextIndex = activeQuestionIndex + 1
    if (nextIndex < updatedQs.length) {
      if (updatedQs[nextIndex].status === 'UNVISITED') {
        updatedQs[nextIndex].status = 'UNANSWERED'
      }
      setActiveQuestionIndex(nextIndex)
      setSelectedOption(updatedQs[nextIndex].userAnswer)
    }
    
    setQuestionsState(updatedQs)
  }

  // Mark for Review & Next
  const handleMarkForReviewAndNext = () => {
    const updatedQs = [...questionsState]
    const currentQ = updatedQs[activeQuestionIndex]

    if (selectedOption !== null) {
      currentQ.userAnswer = selectedOption
      currentQ.status = 'MARKED_ANSWERED'
    } else {
      currentQ.userAnswer = null
      currentQ.status = 'MARKED'
    }

    // Move to next question if not at the end
    const nextIndex = activeQuestionIndex + 1
    if (nextIndex < updatedQs.length) {
      if (updatedQs[nextIndex].status === 'UNVISITED') {
        updatedQs[nextIndex].status = 'UNANSWERED'
      }
      setActiveQuestionIndex(nextIndex)
      setSelectedOption(updatedQs[nextIndex].userAnswer)
    }

    setQuestionsState(updatedQs)
  }

  // Clear current response
  const handleClearResponse = () => {
    setSelectedOption(null)
    const updatedQs = [...questionsState]
    const currentQ = updatedQs[activeQuestionIndex]
    
    currentQ.userAnswer = null
    if (currentQ.status === 'ANSWERED') {
      currentQ.status = 'UNANSWERED'
    } else if (currentQ.status === 'MARKED_ANSWERED') {
      currentQ.status = 'MARKED'
    }
    
    setQuestionsState(updatedQs)
  }

  // Submit test calculation
  const handleSubmitTest = (isAutoSubmit = false) => {
    setIsTimerRunning(false)
    setShowSubmitModal(false)

    // Calculate score
    let answeredCount = 0
    let markedCount = 0
    let markedAnsweredCount = 0
    let unvisitedCount = 0
    let unansweredCount = 0
    let correctCount = 0
    let incorrectCount = 0

    questionsState.forEach((q) => {
      if (q.status === 'ANSWERED') {
        answeredCount++
        if (q.userAnswer === q.correct) correctCount++
        else incorrectCount++
      } else if (q.status === 'MARKED_ANSWERED') {
        markedAnsweredCount++
        if (q.userAnswer === q.correct) correctCount++
        else incorrectCount++
      } else if (q.status === 'MARKED') {
        markedCount++
      } else if (q.status === 'UNANSWERED') {
        unansweredCount++
      } else if (q.status === 'UNVISITED') {
        unvisitedCount++
      }
    })

    const score = correctCount * 2 // 2 marks per question, no negative marks

    setTestResult({
      totalQuestions: questionsState.length,
      answered: answeredCount,
      marked: markedCount,
      markedAnswered: markedAnsweredCount,
      unvisited: unvisitedCount + unansweredCount, // Combining unvisited and visited-but-unanswered for simple result view if needed
      correct: correctCount,
      incorrect: incorrectCount,
      score: score,
      maxScore: questionsState.length * 2
    })

    // Save attempt to database in real-time
    const userId = localStorage.getItem('userId')
    if (userId && paperDetails.paperId) {
      const breakdown = {}
      questionsState.forEach((q, qIndex) => {
        const unitName = getQuestionUnit(q, qIndex)
        const unitMatch = unitName.match(/Unit\s+(\d+)/i)
        const unitKey = unitMatch ? `Unit ${unitMatch[1]}` : 'General'
        
        if (!breakdown[unitKey]) {
          breakdown[unitKey] = { correct: 0, total: 0 }
        }
        
        breakdown[unitKey].total += 1
        if (q.status === 'ANSWERED' || q.status === 'MARKED_ANSWERED') {
          if (q.userAnswer === q.correct) {
            breakdown[unitKey].correct += 1
          }
        }
      })

      const timeSpentMins = Math.round(((paperDetails.questionsCount === 50 ? 3600 : 7200) - timerSeconds) / 60)
      fetch(`${API_BASE_URL}/api/users/${userId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: paperDetails.paperId,
          title: paperDetails.title,
          score: `${correctCount}/${questionsState.length}`,
          timeSpent: `${timeSpentMins} mins`,
          status: 'Completed',
          breakdown
        })
      })
      .then(res => res.json())
      .then(data => console.log('Attempt logged:', data))
      .catch(err => console.error('Failed to log attempt:', err))
    }

    setStep(STEP_RESULTS)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  // Render stats
  const getStats = () => {
    let answered = 0
    let marked = 0
    let unvisited = 0
    let markedAnswered = 0
    let unanswered = 0

    questionsState.forEach((q) => {
      if (q.status === 'ANSWERED') answered++
      else if (q.status === 'MARKED') marked++
      else if (q.status === 'UNVISITED') unvisited++
      else if (q.status === 'MARKED_ANSWERED') markedAnswered++
      else if (q.status === 'UNANSWERED') unanswered++
    })

    return { answered, marked, unvisited, markedAnswered, unanswered }
  }

  const stats = getStats()

  // Exit mock test
  const handleExitTest = () => {
    if (window.confirm("Are you sure you want to exit the mock test? Your progress will be lost.")) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      navigate(-1)
    }
  }

  return (
    <div className="mocktest-container">
      {/* HEADER: Present on all steps except results */}
      {step !== STEP_RESULTS && (
        <header className="mt-header">
          <div className="mt-header__left">
            <Link to="/" className="mt-header__logo" style={{ textDecoration: 'none' }}>
              <div className="navbar__logo-icon" style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.svg" alt="UGC Free Paper Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="mt-header__logo-text-dark" style={{ marginLeft: '-5px' }}>GC Free Paper</span>
            </Link>
            <div className="mt-header__title">
              {paperDetails.title} {paperDetails.subtitle && `- ${paperDetails.subtitle}`}
            </div>
          </div>
          <div className="mt-header__right">
            {step === STEP_TEST && (
              <>
                <div className="mt-timer">
                  <span className="mt-timer__label">Time Left:</span>
                  <span>{formatTimer(timerSeconds)}</span>
                </div>
                <button className="mt-header__btn" onClick={toggleFullscreen}>
                  {isFullscreen ? "Exit Full Screen" : "Switch Full Screen"}
                </button>
                <button className="mt-header__btn" onClick={() => {
                  setIsTimerRunning(false)
                  setShowPauseModal(true)
                }}>
                  Pause
                </button>
              </>
            )}
            {step !== STEP_TEST && (
              <button className="mt-header__btn" onClick={() => navigate(-1)}>
                Close
              </button>
            )}
          </div>
        </header>
      )}

      {/* STEP 1: GENERAL INSTRUCTIONS */}
      {step === STEP_INSTRUCTIONS_1 && (
        <div className="mt-main">
          <div className="mt-left-column">
            <div className="mt-content">
              <div className="mt-instructions">
                <h2>General Instructions</h2>
                <div className="mt-instructions__body">
                  <p><strong>Please read the instructions carefully:</strong></p>
                  <ol>
                    <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You need not terminate the examination or submit your paper.</li>
                    <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                      <div className="palette-guide">
                        <div className="palette-guide__item">
                          <span className="palette-icon palette-icon--unvisited">1</span>
                          <span>You have not visited the question yet.</span>
                        </div>
                        <div className="palette-guide__item">
                          <span className="palette-icon palette-icon--unanswered">2</span>
                          <span>You have not answered the question.</span>
                        </div>
                        <div className="palette-guide__item">
                          <span className="palette-icon palette-icon--answered">3</span>
                          <span>You have answered the question.</span>
                        </div>
                        <div className="palette-guide__item">
                          <span className="palette-icon palette-icon--marked">4</span>
                          <span>You have NOT answered the question, but have marked the question for review.</span>
                        </div>
                        <div className="palette-guide__item">
                          <span className="palette-icon palette-icon--marked-answered">5</span>
                          <span>You have answered the question, but marked it for review.</span>
                        </div>
                      </div>
                    </li>
                    <li>The <strong>Mark For Review</strong> status for a question simply indicates that you would like to look at that question again. If a question is answered, but marked for review, then the answer will be considered for evaluation unless the status is modified by the candidate.</li>
                  </ol>

                  <p><strong>Navigating to a Question:</strong></p>
                  <ol start="4">
                    <li>To answer a question, do the following:
                      <ol type="a">
                        <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                        <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                        <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question and also mark it for review, and then go to the next question.</li>
                      </ol>
                    </li>
                    <li>Note that your answer for the current question will not be saved, if you navigate to another question directly by clicking on a question number without saving the answer to the previous question.</li>
                    <li>You can view all the questions by clicking on the <strong>Question Paper</strong> button. This feature is provided, so that if you want you can just see the entire question paper at a glance.</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <footer className="mt-footer">
              <div className="mt-footer__left">
                <button className="footer-btn--link" onClick={handleExitTest}>
                  &larr; Go to Tests
                </button>
              </div>
              <div className="mt-footer__right">
                <button className="footer-btn footer-btn--next" onClick={() => setStep(STEP_INSTRUCTIONS_2)}>
                  Next
                </button>
              </div>
            </footer>
          </div>
          
          <aside className="mt-sidebar">
            <div className="mt-sidebar__user">
              <div className="mt-sidebar__avatar">{userInitial}</div>
              <div>
                <div className="mt-sidebar__username">{userName}</div>
                <div style={{fontSize: '0.8rem', color: '#64748b'}}>Student</div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* STEP 2: ANSWERING INSTRUCTIONS */}
      {step === STEP_INSTRUCTIONS_2 && (
        <div className="mt-main">
          <div className="mt-left-column">
            <div className="mt-content">
              <div className="mt-instructions">
                <h2>Answering a Question</h2>
                <div className="mt-instructions__body">
                  <ol start="7">
                    <li><strong>Procedure for answering a multiple choice (MCQ) type question:</strong>
                      <ol type="a">
                        <li>Choose one answer from the 4 options (A, B, C, D) given below the question, click on the bubble placed before the chosen option.</li>
                        <li>To deselect your chosen answer, click on the bubble of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                        <li>To change your chosen answer, click on the bubble of another option.</li>
                        <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
                      </ol>
                    </li>
                    <li><strong>Procedure for answering a numerical answer type question:</strong>
                      <ol type="a">
                        <li>To enter a number as your answer, use the virtual numerical keypad.</li>
                        <li>A fraction (e.g. -0.3 or -.3) can be entered as an answer with or without "0" before the decimal point. As many as four decimal points, e.g. 12.5435 or 0.003 or -932.6711 or 12.82 can be entered.</li>
                        <li>To clear your answer, click on the <strong>Clear Response</strong> button.</li>
                        <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
                      </ol>
                    </li>
                    <li>To mark a question for review, click on the <strong>Mark for Review & Next</strong> button. If an answer is selected for a question that is Marked for Review, that answer will be considered in the evaluation unless the status is modified by the candidate.</li>
                    <li>To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</li>
                    <li>Note that ONLY Questions for which answers are saved or marked for review after answering will be considered for evaluation.</li>
                    <li>Sections in this question paper are displayed on the top bar of the screen. Questions in a Section can be viewed by clicking on the name of that Section. The Section you are currently viewing will be highlighted.</li>
                    <li>After clicking the <strong>Save & Next</strong> button for the last question in a Section, you will automatically be taken to the first question of the next Section in sequence.</li>
                    <li>You can move the mouse cursor over the name of a Section to view the answering status for that Section.</li>
                  </ol>
                </div>
              </div>
            </div>

            <footer className="mt-footer">
              <div className="mt-footer__left">
                <button className="footer-btn--link" onClick={handleExitTest}>
                  &larr; Go to Tests
                </button>
              </div>
              <div className="mt-footer__right">
                <button className="footer-btn footer-btn--next" onClick={() => setStep(STEP_DECLARATION)}>
                  Next
                </button>
              </div>
            </footer>
          </div>

          <aside className="mt-sidebar">
            <div className="mt-sidebar__user">
              <div className="mt-sidebar__avatar">{userInitial}</div>
              <div>
                <div className="mt-sidebar__username">{userName}</div>
                <div style={{fontSize: '0.8rem', color: '#64748b'}}>Student</div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* STEP 3: DECLARATION & LANGUAGE SELECTOR */}
      {step === STEP_DECLARATION && (
        <div className="mt-main">
          <div className="mt-left-column">
            <div className="mt-content">
              <div className="mt-instructions">
                <h2>{paperDetails.title}</h2>
                <div className="mt-instructions__body">
                  <table className="declaration-table">
                    <tbody>
                      <tr>
                        <td colSpan="2">UGC NET Paper Analysis & Details</td>
                      </tr>
                      <tr>
                        <td><strong>Duration:</strong></td>
                        <td>{paperDetails.questionsCount === 50 ? "60 Minutes" : "120 Minutes"}</td>
                      </tr>
                      <tr>
                        <td><strong>Maximum Marks:</strong></td>
                        <td>{paperDetails.questionsCount * 2} Marks</td>
                      </tr>
                    </tbody>
                  </table>

                  <p><strong>Read the following instructions carefully:</strong></p>
                  <ol>
                    <li>The Test contains a total of {paperDetails.questionsCount} questions.</li>
                    <li>Each question has 4 options out of which only one is correct.</li>
                    <li>You have to finish the test in {paperDetails.questionsCount === 50 ? "60" : "120"} minutes.</li>
                    <li>There is no negative marking in this test.</li>
                    <li>You will be awarded 2 marks for each correct answer.</li>
                    <li>Once you start the test, you will not be allowed to reattempt it. Make sure that you complete the test before you submit the test and/or close the browser.</li>
                  </ol>

                  <div className="lang-selector-container">
                    <label htmlFor="lang-select">Choose your default language:</label>
                    <select 
                      id="lang-select" 
                      className="lang-select" 
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                    <p style={{color: '#ef4444', fontSize: '0.8rem', marginTop: '10px'}}>
                      Please note all questions will appear in your default language. This language can be changed for a particular question later on.
                    </p>
                  </div>

                  <div className="declaration-checkbox-container">
                    <input 
                      type="checkbox" 
                      id="declaration-cb"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                    />
                    <label htmlFor="declaration-cb">
                      I have read all the instructions carefully and have understood them. I agree not to cheat or use unfair means in this examination. I understand that using unfair means of any sort for my own or someone else's advantage will lead to my immediate disqualification. The decision of UGC Free Paper will be final in these matters and cannot be appealed.
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-footer">
              <div className="mt-footer__left">
                <button className="footer-btn footer-btn--prev" onClick={() => setStep(STEP_INSTRUCTIONS_2)}>
                  Previous
                </button>
              </div>
              <div className="mt-footer__right">
                <button 
                  className={`footer-btn ${(!defaultLanguage || !declarationChecked || questionsState.length === 0) ? 'footer-btn--disabled' : 'footer-btn--next'}`}
                  disabled={!defaultLanguage || !declarationChecked || questionsState.length === 0}
                  onClick={handleStartTest}
                >
                  {questionsState.length === 0 ? 'No Questions Added to Set' : 'I am ready to begin'}
                </button>
              </div>
            </footer>
          </div>

          <aside className="mt-sidebar">
            <div className="mt-sidebar__user">
              <div className="mt-sidebar__avatar">{userInitial}</div>
              <div>
                <div className="mt-sidebar__username">{userName}</div>
                <div style={{fontSize: '0.8rem', color: '#64748b'}}>Student</div>
              </div>
            </div>
          </aside>
        </div>
      )}


      {/* STEP 4: ACTIVE TEST WORKSPACE */}
      {step === STEP_TEST && questionsState.length > 0 && (
        <div className="mt-main">
          {/* Main workspace */}
          <div className="mt-left-column">
            {/* Section tab bar */}
            <div className="test-section-bar">
              <div className="test-section-tab">Test Section</div>
            </div>

            {/* Question window */}
            <div className={`mt-content ${questionsState[activeQuestionIndex].type === 'comprehension' ? 'mt-content--comprehension' : ''}`}>
              {/* 1. COMPREHENSION TYPE */}
              {questionsState[activeQuestionIndex].type === 'comprehension' && (
                <div className="comprehension-layout">
                  <div className="passage-pane">
                    <div className="passage-header">
                      Comprehension / Reading Passage
                    </div>
                    <div className="passage-content">
                      {renderPassageWithTable(questionsState[activeQuestionIndex].passage)}
                    </div>
                  </div>
                  <div className="question-pane">
                    <div className="question-header">
                      <div className="question-num">Question No. {activeQuestionIndex + 1}</div>
                      <div className="question-meta">
                        <span className="meta-badge meta-badge--positive">Marks +2</span>
                        <span className="meta-badge meta-badge--negative">-0</span>
                      </div>
                    </div>
                    
                    <div className="question-body">
                      {renderTextHtml(questionsState[activeQuestionIndex].question)}
                    </div>

                    <div className="options-list">
                      {questionsState[activeQuestionIndex].options.map((option, idx) => (
                        <div 
                          key={idx}
                          className={`option-item ${getOptionClassName(idx)}`}
                          onClick={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                        >
                          <input 
                            type="radio" 
                            name={`question-${activeQuestionIndex}`}
                            checked={isReviewMode ? questionsState[activeQuestionIndex].userAnswer === idx + 1 : selectedOption === idx + 1}
                            onChange={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                            disabled={isReviewMode}
                          />
                          <span className="option-text">{renderTextHtml(formatOptionLabel(option, idx))}</span>
                        </div>
                      ))}
                    </div>
                    {renderReviewExplanationPane()}
                  </div>
                </div>
              )}

              {/* 1b. DATA INTERPRETATION TYPE (rendered inline, like normal, not split screen) */}
              {questionsState[activeQuestionIndex].type === 'di' && (
                <div className="question-area">
                  <div className="question-header">
                    <div className="question-num">Question No. {activeQuestionIndex + 1}</div>
                    <div className="question-meta">
                      <span className="meta-badge meta-badge--positive">Marks +2</span>
                      <span className="meta-badge meta-badge--negative">-0</span>
                    </div>
                  </div>

                  <div className="question-body">
                    {/* Render the DI passage/table inline first */}
                    {questionsState[activeQuestionIndex].passage && (
                      <div className="di-passage-inline" style={{ marginBottom: '20px', background: '#fff', border: 'none', padding: 0 }}>
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.7', color: '#334155' }}>
                          {renderPassageWithTable(questionsState[activeQuestionIndex].passage)}
                        </div>
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-line', marginTop: '15px', fontWeight: '500' }}>
                      {renderTextHtml(questionsState[activeQuestionIndex].question)}
                    </div>
                  </div>

                  <div className="options-list">
                    {questionsState[activeQuestionIndex].options.map((option, idx) => (
                      <div 
                        key={idx}
                        className={`option-item ${getOptionClassName(idx)}`}
                        onClick={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                      >
                        <input 
                          type="radio" 
                          name={`question-${activeQuestionIndex}`}
                          checked={isReviewMode ? questionsState[activeQuestionIndex].userAnswer === idx + 1 : selectedOption === idx + 1}
                          onChange={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                          disabled={isReviewMode}
                        />
                        <span className="option-text">{renderTextHtml(formatOptionLabel(option, idx))}</span>
                      </div>
                    ))}
                  </div>
                  {renderReviewExplanationPane()}
                </div>
              )}

              {/* 2. ASSERTION-REASON TYPE */}
              {questionsState[activeQuestionIndex].type === 'assertion-reason' && (
                <div className="question-area">
                  <div className="question-header">
                    <div className="question-num">Question No. {activeQuestionIndex + 1}</div>
                    <div className="question-meta">
                      <span className="meta-badge meta-badge--positive">Marks +2</span>
                      <span className="meta-badge meta-badge--negative">-0</span>
                    </div>
                  </div>
                  
                  <div className="question-body">
                    <p style={{ marginBottom: '15px', whiteSpace: 'pre-line' }}>
                      {renderTextHtml(questionsState[activeQuestionIndex].question || "Given below are two statements: one is labelled as Assertion (A) and the other is labelled as Reason (R):")}
                    </p>
                    <p style={{ marginBottom: '10px' }}>
                      <strong>Assertion (A):</strong> {renderTextHtml(stripPrefix(questionsState[activeQuestionIndex].assertion, 'assertion'))}
                    </p>
                    <p style={{ marginBottom: '20px' }}>
                      <strong>Reason (R):</strong> {renderTextHtml(stripPrefix(questionsState[activeQuestionIndex].reason, 'reason'))}
                    </p>
                    <p style={{ fontWeight: '600', marginBottom: '15px' }}>
                      {renderTextHtml(questionsState[activeQuestionIndex].subPrompt || "In the light of the above statements, choose the most appropriate answer from the options given below:")}
                    </p>
                  </div>

                  <div className="options-list">
                    {questionsState[activeQuestionIndex].options.map((option, idx) => (
                      <div 
                        key={idx}
                        className={`option-item ${getOptionClassName(idx)}`}
                        onClick={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                      >
                        <input 
                          type="radio" 
                          name={`question-${activeQuestionIndex}`}
                          checked={isReviewMode ? questionsState[activeQuestionIndex].userAnswer === idx + 1 : selectedOption === idx + 1}
                          onChange={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                          disabled={isReviewMode}
                        />
                        <span className="option-text">{renderTextHtml(formatOptionLabel(option, idx))}</span>
                      </div>
                    ))}
                  </div>
                  {renderReviewExplanationPane()}
                </div>
              )}

              {/* 3. MATCH COLUMN TYPE */}
              {questionsState[activeQuestionIndex].type === 'match-column' && (
                <div className="question-area">
                  <div className="question-header">
                    <div className="question-num">Question No. {activeQuestionIndex + 1}</div>
                    <div className="question-meta">
                      <span className="meta-badge meta-badge--positive">Marks +2</span>
                      <span className="meta-badge meta-badge--negative">-0</span>
                    </div>
                  </div>

                  <div className="question-body">
                    <p style={{ whiteSpace: 'pre-line', marginBottom: '15px' }}>{renderTextHtml(questionsState[activeQuestionIndex].question)}</p>
                    
                    <table style={{ width: '70%', borderCollapse: 'collapse', margin: '0 auto 20px auto', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid var(--border)', padding: '6px 10px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
                            <div style={{ fontWeight: 'bold' }}>LIST-I</div>
                            {questionsState[activeQuestionIndex].list1Header && (
                              <div style={{ fontWeight: '500', fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                                {renderTextHtml(questionsState[activeQuestionIndex].list1Header)}
                              </div>
                            )}
                          </th>
                          <th style={{ border: '1px solid var(--border)', padding: '6px 10px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
                            <div style={{ fontWeight: 'bold' }}>LIST-II</div>
                            {questionsState[activeQuestionIndex].list2Header && (
                              <div style={{ fontWeight: '500', fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                                {renderTextHtml(questionsState[activeQuestionIndex].list2Header)}
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.max((questionsState[activeQuestionIndex].list1 || []).length, (questionsState[activeQuestionIndex].list2 || []).length) }).map((_, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid var(--border)', padding: '6px 10px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <strong>{String.fromCharCode(65 + idx)}.</strong>
                                <span>{renderTextHtml(stripPrefix((questionsState[activeQuestionIndex].list1 || [])[idx] || '', 'letter'))}</span>
                              </div>
                            </td>
                            <td style={{ border: '1px solid var(--border)', padding: '6px 10px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <strong>{['I', 'II', 'III', 'IV', 'V'][idx] || (idx+1)}.</strong>
                                <span>{renderTextHtml(stripPrefix((questionsState[activeQuestionIndex].list2 || [])[idx] || '', 'roman').replace(/^[\(\[]?\d+[\)\]\.\s]*/, ''))}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <p style={{ fontWeight: '600', marginBottom: '15px' }}>
                      {renderTextHtml(questionsState[activeQuestionIndex].subPrompt || 'Choose the correct answer from the options given below:')}
                    </p>
                  </div>

                  <div className="options-list">
                    {questionsState[activeQuestionIndex].options.map((option, idx) => (
                      <div 
                        key={idx}
                        className={`option-item ${getOptionClassName(idx)}`}
                        onClick={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                      >
                        <input 
                          type="radio" 
                          name={`question-${activeQuestionIndex}`}
                          checked={isReviewMode ? questionsState[activeQuestionIndex].userAnswer === idx + 1 : selectedOption === idx + 1}
                          onChange={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                          disabled={isReviewMode}
                        />
                        <span className="option-text">{renderTextHtml(formatOptionLabel(option, idx))}</span>
                      </div>
                    ))}
                  </div>
                  {renderReviewExplanationPane()}
                </div>
              )}

              {/* 4. MULTIPLE STATEMENT TYPE */}
              {questionsState[activeQuestionIndex].type === 'multiple-statement' && (
                <div className="question-area">
                  <div className="question-header">
                    <div className="question-num">Question No. {activeQuestionIndex + 1}</div>
                    <div className="question-meta">
                      <span className="meta-badge meta-badge--positive">Marks +2</span>
                      <span className="meta-badge meta-badge--negative">-0</span>
                    </div>
                  </div>

                  <div className="question-body">
                    <div style={{ whiteSpace: 'pre-line', marginBottom: '15px' }}>
                      {renderTextHtml(questionsState[activeQuestionIndex].question)}
                    </div>
                    
                    <div style={{ marginLeft: '10px', marginBottom: '20px' }}>
                      {(questionsState[activeQuestionIndex].statements || []).map((item, idx) => (
                        <div key={idx} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + idx)}.</span>
                          <span>{renderTextHtml(stripPrefix(item, 'letter'))}</span>
                        </div>
                      ))}
                    </div>

                    <p style={{ fontWeight: '600', marginBottom: '15px' }}>
                      {renderTextHtml(questionsState[activeQuestionIndex].subPrompt || 'Choose the correct answer from the options given below:')}
                    </p>
                  </div>

                  <div className="options-list">
                    {questionsState[activeQuestionIndex].options.map((option, idx) => (
                      <div 
                        key={idx}
                        className={`option-item ${getOptionClassName(idx)}`}
                        onClick={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                      >
                        <input 
                          type="radio" 
                          name={`question-${activeQuestionIndex}`}
                          checked={isReviewMode ? questionsState[activeQuestionIndex].userAnswer === idx + 1 : selectedOption === idx + 1}
                          onChange={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                          disabled={isReviewMode}
                        />
                        <span className="option-text">{renderTextHtml(formatOptionLabel(option, idx))}</span>
                      </div>
                    ))}
                  </div>
                  {renderReviewExplanationPane()}
                </div>
              )}

              {/* 5. DEFAULT MCQ TYPE */}
              {(!questionsState[activeQuestionIndex].type || questionsState[activeQuestionIndex].type === 'mcq') && (
                <div className="question-area">
                  <div className="question-header">
                    <div className="question-num">Question No. {activeQuestionIndex + 1}</div>
                    <div className="question-meta">
                      <span className="meta-badge meta-badge--positive">Marks +2</span>
                      <span className="meta-badge meta-badge--negative">-0</span>
                    </div>
                  </div>

                  <div className="question-body" style={{ whiteSpace: 'pre-line' }}>
                    {renderTextHtml(questionsState[activeQuestionIndex].question)}
                  </div>

                  <div className="options-list">
                    {questionsState[activeQuestionIndex].options.map((option, idx) => (
                      <div 
                        key={idx}
                        className={`option-item ${getOptionClassName(idx)}`}
                        onClick={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                      >
                        <input 
                          type="radio" 
                          name={`question-${activeQuestionIndex}`}
                          checked={isReviewMode ? questionsState[activeQuestionIndex].userAnswer === idx + 1 : selectedOption === idx + 1}
                          onChange={() => { if (!isReviewMode) setSelectedOption(idx + 1) }}
                          disabled={isReviewMode}
                        />
                        <span className="option-text">{renderTextHtml(formatOptionLabel(option, idx))}</span>
                      </div>
                    ))}
                  </div>
                  {renderReviewExplanationPane()}
                </div>
              )}
            </div>

            {/* Bottom action bar */}
            <footer className="mt-footer">
              {isReviewMode ? (
                <>
                  <div className="mt-footer__left">
                    <button 
                      className="footer-btn footer-btn--prev" 
                      disabled={activeQuestionIndex === 0}
                      onClick={() => handleSelectQuestion(activeQuestionIndex - 1)}
                    >
                      Previous Question
                    </button>
                  </div>
                  <div className="mt-footer__right">
                    <button 
                      className="footer-btn footer-btn--next" 
                      disabled={activeQuestionIndex === questionsState.length - 1}
                      onClick={() => handleSelectQuestion(activeQuestionIndex + 1)}
                    >
                      Next Question
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-footer__left">
                    <button className="footer-btn footer-btn--mark" onClick={handleMarkForReviewAndNext}>
                      Mark for Review & Next
                    </button>
                    <button className="footer-btn footer-btn--clear" onClick={handleClearResponse}>
                      Clear Response
                    </button>
                  </div>
                  <div className="mt-footer__right">
                    <button className="footer-btn footer-btn--save" onClick={handleSaveAndNext}>
                      Save & Next
                    </button>
                  </div>
                </>
              )}
            </footer>
          </div>

          {/* Sidebar */}
          <aside className="mt-sidebar">
            <div className="mt-sidebar__user">
              <div className="mt-sidebar__avatar">{userInitial}</div>
              <div>
                <div className="mt-sidebar__username">{userName}</div>
                <div style={{fontSize: '0.8rem', color: '#64748b'}}>Student</div>
              </div>
            </div>

            {/* Palette Stats Counts */}
            <div className="palette-stats">
              <div className="stat-item">
                <span className="palette-icon palette-icon--answered">{stats.answered}</span>
                <span>Answered</span>
              </div>
              <div className="stat-item">
                <span className="palette-icon palette-icon--unanswered">{stats.unanswered}</span>
                <span>Not Answered</span>
              </div>
              <div className="stat-item">
                <span className="palette-icon palette-icon--unvisited">{stats.unvisited}</span>
                <span>Not Visited</span>
              </div>
              <div className="stat-item">
                <span className="palette-icon palette-icon--marked">{stats.marked}</span>
                <span>Marked for Review</span>
              </div>
              <div className="stat-item" style={{gridColumn: 'span 2'}}>
                <span className="palette-icon palette-icon--marked-answered">{stats.markedAnswered}</span>
                <span>Answered & Marked for Review (will be evaluated)</span>
              </div>
            </div>

            <div className="palette-section-title">Section: Test</div>

            {/* 100 Questions grid */}
            <div className="palette-grid-container">
              <div className="palette-grid">
                {questionsState.map((q, idx) => {
                  let statusClass = "palette-icon--unvisited"
                  if (isReviewMode) {
                    const isAttempted = q.status === 'ANSWERED' || q.status === 'MARKED_ANSWERED';
                    if (!isAttempted) {
                      statusClass = "palette-icon--unvisited";
                    } else if (q.userAnswer === q.correct) {
                      statusClass = "palette-icon--answered"; // green
                    } else {
                      statusClass = "palette-icon--unanswered"; // red
                    }
                  } else {
                    if (q.status === 'UNANSWERED') statusClass = "palette-icon--unanswered"
                    else if (q.status === 'ANSWERED') statusClass = "palette-icon--answered"
                    else if (q.status === 'MARKED') statusClass = "palette-icon--marked"
                    else if (q.status === 'MARKED_ANSWERED') statusClass = "palette-icon--marked-answered"
                  }

                  return (
                    <button 
                      key={q.id}
                      className={`palette-btn palette-icon ${statusClass} ${activeQuestionIndex === idx ? 'palette-btn--active' : ''}`}
                      onClick={() => handleSelectQuestion(idx)}
                    >
                      {q.id}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sidebar Actions */}
            <div className="sidebar-actions">
              <div className="sidebar-actions__row">
                <button className="sidebar-btn sidebar-btn--secondary" onClick={() => setShowQuestionPaperModal(true)}>
                  Question Paper
                </button>
                <button className="sidebar-btn sidebar-btn--secondary" onClick={() => setShowInstructionsModal(true)}>
                  Instructions
                </button>
              </div>
              {isReviewMode ? (
                <button 
                  className="sidebar-btn sidebar-btn--primary" 
                  style={{backgroundColor: '#4f46e5'}} 
                  onClick={() => {
                    setIsReviewMode(false)
                    setStep(STEP_RESULTS)
                  }}
                >
                  Exit Review & Results
                </button>
              ) : (
                <button className="sidebar-btn sidebar-btn--primary" style={{backgroundColor: '#06b6d4'}} onClick={() => setShowSubmitModal(true)}>
                  Submit Test
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* STEP 5: RESULTS SCREEN */}
      {step === STEP_RESULTS && testResult && (
        <div style={{
          height: 'calc(100vh - 70px)', 
          backgroundColor: '#f8fafc',
          padding: '20px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1100px',
            height: '100%',
            maxHeight: '620px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header Banner - Sleeker, thinner */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              padding: '15px 30px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 2px 0', color: '#ffffff' }}>Test Submission Report</h2>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0 }}>{paperDetails.title}</p>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                borderRadius: '99px',
                fontSize: '0.72rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                Practice Report
              </div>
            </div>

            {/* Split Content Pane */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '360px 1fr',
              gap: '24px',
              padding: '24px',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>
              {/* Left Pane: Stats, Score, Actions */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRight: '1px solid #f1f5f9',
                paddingRight: '24px',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}>
                {/* Score circle & Stats Row */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  {/* Circular Score */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '15px',
                    width: '120px',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '75px',
                      height: '75px',
                      borderRadius: '50%',
                      background: '#e0e7ff',
                      border: '4px solid #4f46e5',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: '850', color: '#312e81', lineHeight: '1' }}>{testResult.score}</span>
                      <span style={{ fontSize: '0.62rem', color: '#4f46e5', fontWeight: '700', marginTop: '2px' }}>Marks</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                      Out of {testResult.maxScore}
                    </div>
                  </div>

                  {/* Core Stats Grid */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#166534', fontWeight: '600' }}>Correct</span>
                      <strong style={{ color: '#166534' }}>{testResult.correct}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#fef2f2', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#991b1b', fontWeight: '600' }}>Incorrect</span>
                      <strong style={{ color: '#991b1b' }}>{testResult.incorrect}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#475569', fontWeight: '600' }}>Unattempted</span>
                      <strong style={{ color: '#475569' }}>{testResult.totalQuestions - testResult.answered - testResult.markedAnswered}</strong>
                    </div>
                  </div>
                </div>

                {/* Extra Insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                      <svg style={{ width: '16px', height: '16px', color: '#0284c7' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    </div>
                    <div style={{ textAlign: 'left', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Accuracy Rate</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                        {testResult.correct + testResult.incorrect > 0 
                          ? Math.round((testResult.correct / (testResult.correct + testResult.incorrect)) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#f5f3ff', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                      <svg style={{ width: '16px', height: '16px', color: '#7c3aed' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div style={{ textAlign: 'left', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Attempt Rate</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                        {Math.round(((testResult.correct + testResult.incorrect) / testResult.totalQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                  <button 
                    style={{
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
                      width: '100%',
                      outline: 'none'
                    }}
                    onClick={() => {
                      setIsReviewMode(true)
                      setStep(STEP_TEST)
                      setActiveQuestionIndex(0)
                      if (questionsState.length > 0) {
                        setSelectedOption(questionsState[0].userAnswer)
                      }
                    }}
                  >
                    Detailed Explanation & Review
                  </button>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                      onClick={() => {
                        setStep(STEP_INSTRUCTIONS_1)
                        setDeclarationChecked(false)
                        setDefaultLanguage('')
                        setTimerSeconds(paperDetails.questionsCount === 50 ? 3600 : 7200)
                      }}
                    >
                      Re-take Test
                    </button>
                    <button 
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                      onClick={() => navigate(-1)}
                    >
                      Back to PYQs
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Pane: Unit breakdown */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 15px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <svg style={{ width: '16px', height: '16px', color: '#4f46e5' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  Unit Performance Breakdown
                </h3>
                
                {/* Scrollable list inside the pane */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '6px',
                  boxSizing: 'border-box'
                }}>
                  {(() => {
                    const unitsData = {};
                    questionsState.forEach((q, index) => {
                      const unitName = getQuestionUnit(q, index);
                      if (!unitsData[unitName]) {
                        unitsData[unitName] = { total: 0, correct: 0, incorrect: 0, unattempted: 0 };
                      }
                      unitsData[unitName].total++;
                      
                      const isAttempted = q.status === 'ANSWERED' || q.status === 'MARKED_ANSWERED';
                      if (!isAttempted) {
                        unitsData[unitName].unattempted++;
                      } else if (q.userAnswer === q.correct) {
                        unitsData[unitName].correct++;
                      } else {
                        unitsData[unitName].incorrect++;
                      }
                    });
                    return Object.entries(unitsData).map(([name, data]) => {
                      const successRate = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                      return (
                        <div key={name} style={{ 
                          background: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          padding: '10px 14px', 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '15px',
                          boxSizing: 'border-box'
                        }}>
                          {/* Unit name */}
                          <div style={{ flex: '0 0 160px', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '750', color: '#334155', lineHeight: '1.2' }}>{name}</div>
                          </div>
                          
                          {/* Progress bar */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${(data.correct / data.total) * 100}%`, background: '#22c55e', height: '100%' }}></div>
                              <div style={{ width: `${(data.incorrect / data.total) * 100}%`, background: '#ef4444', height: '100%' }}></div>
                              <div style={{ width: `${(data.unattempted / data.total) * 100}%`, background: '#94a3b8', height: '100%' }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                              <span>Correct: <strong style={{color: '#16a34a'}}>{data.correct}</strong></span>
                              <span>Incorrect: <strong style={{color: '#dc2626'}}>{data.incorrect}</strong></span>
                              <span>Total: <strong>{data.total}</strong></span>
                            </div>
                          </div>

                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '800', 
                            color: successRate >= 50 ? '#16a34a' : '#ea580c', 
                            background: successRate >= 50 ? '#f0fdf4' : '#fff7ed', 
                            padding: '3px 8px', 
                            borderRadius: '99px',
                            minWidth: '60px',
                            textAlign: 'center',
                            flexShrink: 0
                          }}>
                            {successRate}% Score
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pause Confirmation */}
      {showPauseModal && (
        <div className="mt-modal-overlay">
          <div className="mt-modal">
            <h3>Test Paused</h3>
            <p>Your mock test has been paused. The timer is currently frozen. Click Resume to continue your test.</p>
            <div className="mt-modal__buttons">
              <button className="modal-btn modal-btn--confirm" onClick={() => {
                setShowPauseModal(false)
                setIsTimerRunning(true)
              }}>
                Resume Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Submit Confirmation */}
      {showSubmitModal && (
        <div className="mt-modal-overlay">
          <div className="mt-modal">
            <h3>Submit Test Confirmation</h3>
            <p>
              Are you sure you want to submit your test? 
              Once submitted, you will not be able to change your answers or resume.
            </p>
            <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.85rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                <span>Total Questions:</span>
                <strong>{questionsState.length}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                <span>Answered:</span>
                <strong style={{color: '#22c55e'}}>{stats.answered + stats.markedAnswered}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Unanswered / Unvisited:</span>
                <strong style={{color: '#ef4444'}}>{questionsState.length - (stats.answered + stats.markedAnswered)}</strong>
              </div>
            </div>
            <div className="mt-modal__buttons">
              <button className="modal-btn modal-btn--cancel" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>
              <button className="modal-btn modal-btn--confirm" onClick={() => handleSubmitTest(false)}>
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Instructions View */}
      {showInstructionsModal && (
        <div className="mt-modal-overlay" onClick={() => setShowInstructionsModal(false)}>
          <div className="mt-modal" style={{width: '700px', maxHeight: '80%', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <h3>Test Instructions</h3>
            <div style={{fontSize: '0.85rem', lineHeight: '1.6', color: '#475569'}}>
              <p><strong>Answering a Question:</strong></p>
              <ol>
                <li>Choose one answer from the 4 options given below the question, click on the bubble placed before the chosen option.</li>
                <li>To deselect your chosen answer, click on the bubble of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                <li>To change your chosen answer, click on the bubble of another option.</li>
                <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
                <li>To mark a question for review, click on the <strong>Mark for Review & Next</strong> button. If an answer is selected for a question that is Marked for Review, that answer will be considered in the evaluation unless the status is modified by the candidate.</li>
              </ol>
            </div>
            <div className="mt-modal__buttons" style={{marginTop: '20px'}}>
              <button className="modal-btn modal-btn--cancel" onClick={() => setShowInstructionsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Question Paper View */}
      {showQuestionPaperModal && (
        <div className="mt-modal-overlay" onClick={() => setShowQuestionPaperModal(false)}>
          <div className="mt-modal" style={{width: '800px', maxHeight: '80%', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <h3>Question Paper Overview</h3>
            <div style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '10px'}}>
              {questionsState.map((q, idx) => (
                <div key={q.id} style={{padding: '12px 0', borderBottom: '1px solid #e2e8f0'}}>
                  <div style={{fontWeight: '600', marginBottom: '8px'}}>
                    Question {q.id}:
                  </div>
                  <div style={{ paddingLeft: '15px', marginBottom: '8px' }}>
                    {/* Render prompt based on type */}
                    {q.type === 'assertion-reason' && (
                      <div>
                        <p style={{ marginBottom: '5px' }}><strong>Assertion (A):</strong> {renderTextHtml(stripPrefix(q.assertion, 'assertion'))}</p>
                        <p style={{ marginBottom: '5px' }}><strong>Reason (R):</strong> {renderTextHtml(stripPrefix(q.reason, 'reason'))}</p>
                      </div>
                    )}
                    {(q.type === 'comprehension' || q.type === 'di') && (
                      <div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderLeft: '3px solid #3b82f6', marginBottom: '8px', fontSize: '0.85rem' }}>
                          {renderPassageWithTable(q.passage)}
                        </div>
                        <p>{renderTextHtml(q.question)}</p>
                      </div>
                    )}
                    {q.type === 'match-column' && (
                      <div>
                        <p style={{ marginBottom: '8px' }}>{renderTextHtml(q.question)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px', fontSize: '0.85rem' }}>
                          <div>
                            <strong>LIST I</strong>
                            {q.list1Header && (
                              <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {renderTextHtml(q.list1Header)}
                              </div>
                            )}
                            {(q.list1 || []).map((l1, lIdx) => (
                              <div key={lIdx}>{String.fromCharCode(65 + lIdx)}. {renderTextHtml(stripPrefix(l1, 'letter'))}</div>
                            ))}
                          </div>
                          <div>
                            <strong>LIST II</strong>
                            {q.list2Header && (
                              <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {renderTextHtml(q.list2Header)}
                              </div>
                            )}
                            {(q.list2 || []).map((l2, lIdx) => (
                              <div key={lIdx}>{['I', 'II', 'III', 'IV', 'V'][lIdx] || (lIdx+1)}. {renderTextHtml(stripPrefix(l2, 'roman').replace(/^[\(\[]?\d+[\)\]\.\s]*/, ''))}</div>
                            ))}
                          </div>
                        </div>
                        <p style={{ fontWeight: '600', fontSize: '0.85rem', margin: '4px 0 8px 0' }}>
                          {renderTextHtml(q.subPrompt || 'Choose the correct answer from the options given below:')}
                        </p>
                      </div>
                    )}
                    {q.type === 'multiple-statement' && (
                      <div>
                        <p style={{ marginBottom: '8px' }}>{renderTextHtml(q.question)}</p>
                        <div style={{ marginBottom: '8px', fontSize: '0.85rem', paddingLeft: '10px' }}>
                          {(q.statements || []).map((stmt, sIdx) => (
                            <div key={sIdx}><strong>{String.fromCharCode(65 + sIdx)}.</strong> {renderTextHtml(stripPrefix(stmt, 'letter'))}</div>
                          ))}
                        </div>
                        <p style={{ fontWeight: '600', fontSize: '0.85rem', margin: '4px 0 8px 0' }}>
                          {renderTextHtml(q.subPrompt || 'Choose the correct answer from the options given below:')}
                        </p>
                      </div>
                    )}
                    {(!q.type || q.type === 'mcq') && (
                      <p>{renderTextHtml(q.question)}</p>
                    )}
                  </div>
                  
                  {/* Options */}
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '15px'}}>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} style={{fontSize: '0.85rem', color: '#475569'}}>
                        {renderTextHtml(formatOptionLabel(opt, oIdx))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-modal__buttons" style={{marginTop: '20px'}}>
              <button className="modal-btn modal-btn--cancel" onClick={() => setShowQuestionPaperModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MockTest
