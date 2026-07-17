import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './Profile.css'
import './ManageSet.css'

const ManageSet = () => {
  const { setId } = useParams()
  const navigate = useNavigate()
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [pyqSets, setPyqSets] = useState([])
  
  const [newSetPaperType, setNewSetPaperType] = useState('Paper I')
  const [newSetYear, setNewSetYear] = useState('')
  const [newSetSubtitle, setNewSetSubtitle] = useState('')
  const [newSetCount, setNewSetCount] = useState(50)
  
  const [editingSetId, setEditingSetId] = useState(null)
  const [editingSetQuestions, setEditingSetQuestions] = useState([])
  
  const [selectedSetId, setSelectedSetId] = useState('')
  const [importMode, setImportMode] = useState('single')
  const [rawImportText, setRawImportText] = useState('')
  
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [newQType, setNewQType] = useState('mcq')
  const [newQText, setNewQText] = useState('')
  const [newQOpts, setNewQOpts] = useState(['', '', '', ''])
  const [newQCorrect, setNewQCorrect] = useState(1)
  const [newQExplanation, setNewQExplanation] = useState('')
  const [newQAssertion, setNewQAssertion] = useState('')
  const [newQReason, setNewQReason] = useState('')
  const [newQList1, setNewQList1] = useState(['', '', '', ''])
  const [newQList2, setNewQList2] = useState(['', '', '', ''])
  const [newQPassage, setNewQPassage] = useState('')
  const [newQStatements, setNewQStatements] = useState(['', '', '', '', ''])
  const [diMode, setDiMode] = useState('visual')
  const [diTable, setDiTable] = useState([
    ['Year', 'Product A', 'Product B'],
    ['2021', '', ''],
    ['2022', '', '']
  ])

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role !== 'admin') {
      navigate('/profile')
      return
    }
    setIsAdmin(true)
    
    fetch(`${API_BASE_URL}/api/pyqsets`)
      .then(res => res.json())
      .then(data => {
        setPyqSets(Array.isArray(data) ? data : [])
        if (setId) {
          const target = data.find(s => (s.id || s._id) === setId)
          if (target) {
            setEditingSetId(setId)
            setSelectedSetId(setId)
            setNewSetPaperType(target.paperType)
            setNewSetYear(target.year)
            setNewSetSubtitle(target.subtitle)
            setNewSetCount(target.questionsCount)
            loadQuestionsForSet(setId)
          }
        }
      })
      .catch(err => console.error(err))
  }, [setId, navigate])

  const cancelEditSet = () => {
    navigate('/profile')
  }

  const loadQuestionsForSet = async (setId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pyqsets/${setId}/questions`)
      if (res.ok) {
        const data = await res.json()
        setEditingSetQuestions(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load questions:', err)
    }
  }

  const parseRow = (line) => {
    const trimmed = line.trim()
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map(p => p.trim())
      if (parts[0] === '' && parts[parts.length - 1] === '') {
        return parts.slice(1, -1)
      }
      return parts
    }
    const hasTabs = trimmed.includes('\t')
    const separator = hasTabs ? '\t' : /\s{2,}/
    return trimmed.split(separator).map(p => p.trim())
  }

  const parseTableText = (text) => {
    if (!text) return null
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return null
    
    const rows = lines
      .map(line => parseRow(line))
      .filter(row => row.length > 1 && !row.every(cell => cell.startsWith('---') || cell.startsWith('===') || cell.trim() === ''))
      
    if (rows.length < 2) return null
    return rows
  }

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id || q._id)
    setNewQType(q.type)
    setNewQText(q.text || '')
    setNewQOpts(q.options || ['', '', '', ''])
    setNewQCorrect(q.correct || 1)
    setNewQExplanation(q.explanation || '')
    setNewQAssertion(q.assertion || '')
    setNewQReason(q.reason || '')
    setNewQList1(q.list1 || ['', '', '', ''])
    setNewQList2(q.list2 || ['', '', '', ''])
    setNewQPassage(q.passage || '')
    setNewQStatements(q.statements || ['', '', '', '', ''])
    
    if (q.type === 'di' && q.passage) {
      const parsedTable = parseTableText(q.passage)
      if (parsedTable) {
        setDiTable(parsedTable)
        setDiMode('visual')
      } else {
        setDiMode('raw')
      }
    } else {
      setDiMode('visual')
      setDiTable([
        ['Year', 'Product A', 'Product B'],
        ['2021', '', ''],
        ['2022', '', '']
      ])
    }
    
    setImportMode('single') // Ensure single mode is active
  }
  
  const cancelEditQuestion = () => {
    setEditingQuestionId(null)
    setNewQText('')
    setNewQOpts(['', '', '', ''])
    setNewQCorrect(1)
    setNewQExplanation('')
    setNewQAssertion('')
    setNewQReason('')
    setNewQList1(['', '', '', ''])
    setNewQList2(['', '', '', ''])
    setNewQPassage('')
    setNewQStatements(['', '', '', '', ''])
    setDiMode('visual')
    setDiTable([
      ['Year', 'Product A', 'Product B'],
      ['2021', '', ''],
      ['2022', '', '']
    ])
  }

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          const data = await res.json()
          setEditingSetQuestions(prev => prev.filter(q => q.id !== questionId))
          setPyqSets(prev => prev.map(s => {
            if (s.id === editingSetId) {
              return { ...s, questionsLoaded: data.updatedSet.questionsLoaded }
            }
            return s
          }))
        } else {
          alert('Failed to delete question')
        }
      } catch (err) {
        console.error(err)
        alert('Server error while deleting question')
      }
    }
  }
  const handleCreateSet = async (e) => {
    e.preventDefault()
    if (!newSetYear.trim() || !newSetSubtitle.trim()) {
      alert('Please fill in both the Year and Shift/Subtitle fields.')
      return
    }
    
    const title = `UGC NET ${newSetPaperType} ${newSetPaperType === 'Paper II' ? 'Sociology ' : ''}(${newSetYear})`
    
    let finalSubtitle = newSetSubtitle
    if (!finalSubtitle.startsWith('Sociology') && !finalSubtitle.startsWith('General')) {
      finalSubtitle = `${newSetPaperType === 'Paper II' ? 'Sociology' : 'General Paper'} ${newSetYear} ${newSetSubtitle}`
    }

    const setPayload = {
      title,
      subtitle: finalSubtitle,
      paperType: newSetPaperType,
      year: newSetYear,
      questionsCount: Number(newSetCount),
      questionsLoaded: 0
    }

    try {
      if (editingSetId) {
        const res = await fetch(`${API_BASE_URL}/api/pyqsets/${editingSetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setPayload)
        })
        const updatedSet = await res.json()
        setPyqSets(prev => prev.map(s => s.id === editingSetId ? updatedSet : s))
        alert('Successfully updated PYQ Set!')
        cancelEditSet()
        return
      }

      const res = await fetch(`${API_BASE_URL}/api/pyqsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setPayload)
      })
      const newSet = await res.json()
      setPyqSets(prev => [...prev, newSet])
      cancelEditSet()
      alert(`Successfully created PYQ Set:\n"${title}"`)
    } catch (err) {
      console.error(err)
      alert('Failed to save PYQ Set')
    }
  }
  const handleOptChange = (idx, val) => {
    setNewQOpts(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }
  const handleList1Change = (idx, val) => {
    setNewQList1(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }
  const handleList2Change = (idx, val) => {
    setNewQList2(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }
  const handleStatementChange = (idx, val) => {
    setNewQStatements(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }

  const handleCellChange = (rIdx, cIdx, val) => {
    const next = diTable.map((row, r) => {
      if (r !== rIdx) return row
      return row.map((cell, c) => (c === cIdx ? val : cell))
    })
    setDiTable(next)
    const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
    setNewQPassage(serialized)
  }

  const handleAddRow = () => {
    setDiTable(prev => {
      const next = [...prev, Array(prev[0].length).fill('')]
      const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
      setNewQPassage(serialized)
      return next
    })
  }

  const handleAddColumn = () => {
    setDiTable(prev => {
      const next = prev.map(row => [...row, ''])
      const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
      setNewQPassage(serialized)
      return next
    })
  }

  const handleRemoveRow = () => {
    setDiTable(prev => {
      if (prev.length <= 2) return prev
      const next = prev.slice(0, -1)
      const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
      setNewQPassage(serialized)
      return next
    })
  }

  const handleRemoveColumn = () => {
    setDiTable(prev => {
      if (prev[0].length <= 1) return prev
      const next = prev.map(row => row.slice(0, -1))
      const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
      setNewQPassage(serialized)
      return next
    })
  }
  const handleCreateQuestion = async (e) => {
    e.preventDefault()
    
    // Validation based on type
    if (newQType === 'mcq') {
      if (!newQText.trim() || newQOpts.some(o => !o.trim())) {
        alert('Please fill in the question prompt and all 4 options.')
        return
      }
    } else if (newQType === 'assertion-reason') {
      if (!newQAssertion.trim() || !newQReason.trim() || newQOpts.some(o => !o.trim())) {
        alert('Please fill in both Assertion and Reason statements, and all options.')
        return
      }
    } else if (newQType === 'match-column') {
      if (!newQText.trim() || newQList1.some(l => !l.trim()) || newQList2.some(l => !l.trim()) || newQOpts.some(o => !o.trim())) {
        alert('Please fill in List I, List II, and all options combinations.')
        return
      }
    } else if (newQType === 'comprehension' || newQType === 'di') {
      if (!newQPassage.trim() || !newQText.trim() || newQOpts.some(o => !o.trim())) {
        alert('Please fill in the passage/table data, specific question prompt, and options.')
        return
      }
    } else if (newQType === 'multiple-statement') {
      if (!newQText.trim() || newQStatements.some(s => !s.trim()) || newQOpts.some(o => !o.trim())) {
        alert('Please fill in the question text, all statements, and all options.')
        return
      }
    }

    const targetSet = pyqSets.find(s => s.id === selectedSetId)
    if (!targetSet) {
      alert('Error: Please select a valid PYQ Set first.')
      return
    }
    const questionPayload = {
      setId: selectedSetId,
      type: newQType,
      text: newQText,
      options: newQOpts,
      correct: newQCorrect,
      assertion: newQAssertion,
      reason: newQReason,
      passage: newQPassage,
      statements: newQStatements,
      explanation: newQExplanation
    }

    try {
      if (editingQuestionId) {
        const res = await fetch(`${API_BASE_URL}/api/questions/${editingQuestionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionPayload)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)
        
        if (editingSetId === selectedSetId && typeof loadQuestionsForSet === 'function') {
          loadQuestionsForSet(selectedSetId)
        }
        alert('Successfully updated question!')
        cancelEditQuestion()
        return
      }

      const res = await fetch(`${API_BASE_URL}/api/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionPayload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Increment loaded count in target set
      setPyqSets(prev => prev.map(s => {
        if (s.id === selectedSetId) {
          return { ...s, questionsLoaded: data.updatedSet.questionsLoaded }
        }
        return s
      }))
      
      // If we are currently editing this set, reload questions to show new one
      if (editingSetId === selectedSetId && typeof loadQuestionsForSet === 'function') {
        loadQuestionsForSet(selectedSetId)
      }

      alert(`Successfully added question to:\n"${targetSet.title || 'Selected Set'}"!\nTotal loaded now: ${data.updatedSet.questionsLoaded} Qs.`)
    } catch (err) {
      console.error(err)
      alert('Failed to save question to database')
    }

    // Reset Form Fields
    cancelEditQuestion()
  }
  const handleBulkImport = async (e) => {
    e.preventDefault()
    if (!rawImportText.trim()) {
      alert('Please paste some raw text to import.')
      return
    }

    // Raw parser logic
    const lines = rawImportText.split('\n')
    const parsedQuestions = []
    let currentQ = null
    let currentSection = 'text'
    let sharedPassage = ''
    let isReadingPassage = false

    const finalizeQuestion = (q) => {
      if (!q) return
      if (q.options.join('').trim() === '' && q.statements.length === 4) {
         q.options = q.statements.map(s => s.replace(/^[\(\[]?[A-D][\)\]\.\:\-]\s*/i, ''))
         q.statements = []
      }
      if (q.statements.length > 0 && q.type === 'mcq') {
         q.type = 'multiple-statement'
      }
      parsedQuestions.push(q)
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Detect Comprehension Block
      if (/^Question Label\s*\:\s*Comprehension/i.test(line) || /^Study carefully/i.test(line)) {
        isReadingPassage = true
        sharedPassage = line + '\n'
        continue
      }
      if (isReadingPassage) {
        if (/^Sub\s*questions/i.test(line) || /^Question\s+Number\s*\:/i.test(line) || /^Q\s*\d+/i.test(line)) {
          isReadingPassage = false
          // Fall through to parse question start
        } else {
          sharedPassage += line + '\n'
          continue
        }
      }

      // A question is finished if we have parsed its answer, or if we have filled all 4 options
      const isFinished = !currentQ || currentQ.isFinished || currentQ.options.filter(o => o.trim() !== '').length === 4

      // Detect Question prompt start, e.g. "Q1.", "Q20.", "Q 5:" or "Question Number : 1" or "1." or ". The"
      const isQStart = line.match(/^Q\s*\d+[\s\.\:\-](.*)/i) || 
                       line.match(/^Question\s+Number\s*\:\s*\d+/i) || 
                       (isFinished && !sharedPassage && (line.match(/^\d+[\.\)]\s+[A-Z]/i) || line.match(/^\.\s+[A-Z\d'"]/i)))
      if (isQStart) {
        if (currentQ) finalizeQuestion(currentQ)
        
        // Extract initial text if prefixed, otherwise empty to append next lines
        const matchPrefixedText = line.match(/^Q\s*\d+[\s\.\:\-](.*)/i) || line.match(/^\d+[\.\)]\s+(.*)/i) || line.match(/^\.\s+(.*)/)
        const initialText = matchPrefixedText ? matchPrefixedText[1].trim() : ''
        
        const isDI = sharedPassage && (sharedPassage.toLowerCase().includes('table') || sharedPassage.toLowerCase().includes('data interpretation'))
        currentQ = {
          type: isDI ? 'di' : (sharedPassage ? 'comprehension' : 'mcq'),
          text: initialText,
          options: ['', '', '', ''],
          correct: 1,
          list1: [],
          list2: [],
          statements: [],
          passage: sharedPassage || ''
        }
        currentSection = 'text'
        continue
      }

      if (!currentQ) continue

      // Detect section headers
      if (/^list\s*[-–]?\s*i\b/i.test(line) && !/^list\s*[-–]?\s*ii\b/i.test(line)) {
        currentQ.type = 'match-column'
        currentSection = 'list1'
        currentQ.text += (currentQ.text ? '\n' : '') + line
        continue
      }
      if (/^list\s*[-–]?\s*ii\b/i.test(line)) {
        currentQ.type = 'match-column'
        currentSection = 'list2'
        currentQ.text += (currentQ.text ? '\n' : '') + line
        continue
      }
      if (/^assertion\s*\(?A\)?/i.test(line)) {
        currentQ.type = 'assertion-reason'
        currentSection = 'assertion'
        currentQ.assertion = line.replace(/^assertion\s*\(?A\)?[\s\:\-\.]*/i, '')
        continue
      }
      if (/^reason\s*\(?R\)?/i.test(line)) {
        currentQ.type = 'assertion-reason'
        currentSection = 'reason'
        currentQ.reason = line.replace(/^reason\s*\(?R\)?[\s\:\-\.]*/i, '')
        continue
      }
      if (/^choose the correct/i.test(line) || /^options?\s*\:?/i.test(line) && !line.includes('(')) {
        currentSection = 'options'
        continue
      }

      // Parse Correct Answer line
      const ansMatch = line.match(/(?:correct\s+)?answer\s*[\:\-]\s*[\(\[]?([A-D1-4])[\)\]]?/i)
      if (ansMatch) {
        const ansVal = ansMatch[1].toUpperCase()
        if (['A', 'B', 'C', 'D'].includes(ansVal)) {
          currentQ.correct = ansVal.charCodeAt(0) - 64
        } else {
          currentQ.correct = Number(ansVal)
        }
        currentQ.isFinished = true
        continue
      }

      // Parse Options if explicitly in options section
      if (currentSection === 'options') {
        const optMatch = line.match(/^[\(\[]?([A-D1-4])[\)\]]?[\s\.\:\-\,\，\s](.*)/i)
        if (optMatch) {
          const optLetter = optMatch[1].toUpperCase()
          const optText = optMatch[2].trim()
          
          let optIdx = -1
          if (['A', 'B', 'C', 'D'].includes(optLetter)) {
            optIdx = optLetter.charCodeAt(0) - 65
          } else if (['1', '2', '3', '4'].includes(optLetter)) {
            optIdx = Number(optLetter) - 1
          }

          if (optIdx >= 0 && optIdx < 4) {
            currentQ.options[optIdx] = optText
          }
          continue
        }
      }

      // If in text section, watch out for statements (A-E) or options (1-4, A-D)
      if (currentSection === 'text') {
        const stmtMatch = line.match(/^[\(\[]?([A-E])[\)\]\.\:\-\,\，]\s+(.*)/i)
        // Ensure it's not actually a Correct Answer line
        if (stmtMatch && !/^correct\s+answer/i.test(line)) {
          currentQ.statements.push(stmtMatch[0].trim())
          continue
        }

        const optNumMatch = line.match(/^[\(\[]?([1-4])[\)\]]?[\.\:\-\,\，\s]\s*(.*)/i)
        if (optNumMatch) {
           currentSection = 'options'
           currentQ.options[Number(optNumMatch[1]) - 1] = optNumMatch[2].trim()
           continue
         }
      }

      // Escape hatch for Match the Column options if user forgot "Options:"
      if ((currentSection === 'list1' || currentSection === 'list2') && line.match(/^[\(\[]?([1-4])[\)\]]?[\.\:\-\,\，]\s*A-/i)) {
         currentSection = 'options'
         const optNumMatch = line.match(/^[\(\[]?([1-4])[\)\]]?[\.\:\-\,\，]\s*(.*)/i)
         if (optNumMatch) {
           currentQ.options[Number(optNumMatch[1]) - 1] = optNumMatch[2].trim()
           continue
         }
      }

      // Append to current section
      if (currentSection === 'list1') {
        currentQ.list1.push(line)
      } else if (currentSection === 'list2') {
        currentQ.list2.push(line)
      } else if (currentSection === 'assertion') {
        currentQ.assertion += ' ' + line
      } else if (currentSection === 'reason') {
        currentQ.reason += ' ' + line
      } else if (currentSection === 'passage') {
        currentQ.passage = (currentQ.passage || '') + line + '\n'
      } else if (currentSection === 'text') {
        currentQ.text += (currentQ.text ? '\n' : '') + line
      }
    }

    if (currentQ) finalizeQuestion(currentQ)

    if (parsedQuestions.length === 0) {
      alert('Could not parse any valid questions. Please check the expected format guidelines.')
      return
    }

    const targetSet = pyqSets.find(s => s.id === selectedSetId)
    if (!targetSet) {
      alert('Error: Please select a valid PYQ Set first.')
      return
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: selectedSetId, questions: parsedQuestions })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Update loaded count in state
      setPyqSets(prev => prev.map(s => {
        if (s.id === selectedSetId) {
          return { ...s, questionsLoaded: data.updatedSet.questionsLoaded }
        }
        return s
      }))
      
      if (editingSetId === selectedSetId && typeof loadQuestionsForSet === 'function') {
        loadQuestionsForSet(selectedSetId)
      }

      alert(`Successfully parsed and imported ${parsedQuestions.length} questions into:\n"${targetSet.title || 'Selected Set'}"!`)
      setRawImportText('')
    } catch (err) {
      console.error(err)
      alert('Failed to save imported questions to database')
    }
  }

  const renderQuestionForm = (isInline = false) => (
    <form className="ms-add-form-wrapper" onSubmit={handleCreateQuestion}>
{!isInline && <h3>Add Question to PYQ Set</h3>}

{!isInline && (
      <div className="ms-form-field" style={{ marginBottom: '12px' }}>
        <label>Target PYQ Set</label>
  <select 
    className="ms-input"
    value={selectedSetId}
    onChange={(e) => setSelectedSetId(e.target.value)}
  >
    {pyqSets.map(s => (
      <option key={s.id} value={s.id}>{s.title}</option>
    ))}
  </select>
      </div>
    )}

     <div className="ms-form-field" style={{ marginBottom: '12px' }}>
  <label>Question Formatting Type</label>
  <select 
    className="ms-input"
    value={newQType}
    onChange={(e) => setNewQType(e.target.value)}
  >
    <option value="mcq">Normal MCQ</option>
    <option value="assertion-reason">Assertion & Reasoning</option>
    <option value="match-column">Match the Column</option>
    <option value="comprehension">Comprehension / Passage</option>
    <option value="di">Data Interpretation / Table Data</option>
    <option value="multiple-statement">Multiple Statements</option>
  </select>
</div>

{/* DYNAMIC FIELD PANEL: COMPREHENSION PASSAGE / DI TABLE DATA */}
{(newQType === 'comprehension' || newQType === 'di') && (
  <div className="form-field full-width" style={{ marginBottom: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <label style={{ margin: 0 }}>{newQType === 'di' ? 'Table Data / Passage' : 'Comprehension Passage'}</label>
      {newQType === 'di' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className={`pane-btn ${diMode === 'visual' ? 'active' : ''}`} 
            style={{ padding: '2px 8px', fontSize: '0.75rem', background: diMode === 'visual' ? 'var(--primary)' : 'var(--bg-card)', border: '1px solid var(--border)', color: diMode === 'visual' ? '#fff' : 'var(--text-primary)' }}
            onClick={() => setDiMode('visual')}
          >
            Visual Grid
          </button>
          <button 
            type="button" 
            className={`pane-btn ${diMode === 'raw' ? 'active' : ''}`} 
            style={{ padding: '2px 8px', fontSize: '0.75rem', background: diMode === 'raw' ? 'var(--primary)' : 'var(--bg-card)', border: '1px solid var(--border)', color: diMode === 'raw' ? '#fff' : 'var(--text-primary)' }}
            onClick={() => setDiMode('raw')}
          >
            Raw Text
          </button>
        </div>
      )}
    </div>

    {newQType === 'di' && diMode === 'visual' ? (
      <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: 'var(--bg-card)', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', marginBottom: '10px', width: '100%', minWidth: '400px' }}>
          <tbody>
            {diTable.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid var(--border)', padding: '2px' }}>
                    <input 
                      type="text" 
                      style={{ 
                        width: '100%', 
                        border: 'none', 
                        padding: '6px', 
                        fontSize: '0.8rem', 
                        outline: 'none', 
                        background: 'transparent',
                        fontWeight: rIdx === 0 ? '600' : 'normal',
                        textAlign: 'center',
                        color: 'var(--text-primary)'
                      }}
                      placeholder={rIdx === 0 ? `Header ${cIdx + 1}` : `Row ${rIdx}, Col ${cIdx + 1}`}
                      value={cell}
                      onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleAddRow}>+ Add Row</button>
          <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleAddColumn}>+ Add Column</button>
          {diTable.length > 2 && (
            <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff' }} onClick={handleRemoveRow}>Remove Row</button>
          )}
          {diTable[0].length > 2 && (
            <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff' }} onClick={handleRemoveColumn}>Remove Column</button>
          )}
        </div>
      </div>
    ) : (
      <textarea 
        required 
        rows="4" 
        placeholder={newQType === 'di' ? 'Paste table data (space/tab/pipe separated)...' : 'Paste comprehension passage here...'}
        value={newQPassage}
        onChange={(e) => setNewQPassage(e.target.value)}
      ></textarea>
    )}
  </div>
)}

{/* DYNAMIC FIELD PANEL: ASSERTION & REASON */}
{newQType === 'assertion-reason' && (
  <>
    <div className="form-field full-width" style={{ marginBottom: '12px' }}>
      <label>Assertion (A) Statement</label>
      <textarea 
        required 
        rows="2" 
        placeholder="Assertion statement..."
        value={newQAssertion}
        onChange={(e) => setNewQAssertion(e.target.value)}
      ></textarea>
    </div>
    <div className="form-field full-width" style={{ marginBottom: '12px' }}>
      <label>Reason (R) Statement</label>
      <textarea 
        required 
        rows="2" 
        placeholder="Reason statement..."
        value={newQReason}
        onChange={(e) => setNewQReason(e.target.value)}
      ></textarea>
    </div>
  </>
)}

{/* DYNAMIC FIELD PANEL: MATCH THE COLUMN */}
{newQType === 'match-column' && (
  <div style={{ marginBottom: '12px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: 'var(--bg-card)' }}>
    <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>List I & List II Items</strong>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List I (A, B, C, D)</span>
        {newQList1.map((item, idx) => (
          <input 
            key={idx}
            style={{ fontSize: '0.8rem', padding: '6px' }}
            type="text"
            required
            placeholder={`Item ${idx + 1}`}
            value={item}
            onChange={(e) => handleList1Change(idx, e.target.value)}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List II (I, II, III, IV)</span>
        {newQList2.map((item, idx) => (
          <input 
            key={idx}
            style={{ fontSize: '0.8rem', padding: '6px' }}
            type="text"
            required
            placeholder={`Match ${idx + 1}`}
            value={item}
            onChange={(e) => handleList2Change(idx, e.target.value)}
          />
        ))}
      </div>
    </div>
  </div>
)}

{/* DYNAMIC FIELD PANEL: MULTIPLE STATEMENTS */}
{newQType === 'multiple-statement' && (
  <div style={{ marginBottom: '12px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: 'var(--bg-card)' }}>
    <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Statements (A, B, C, D, E)</strong>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {newQStatements.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + idx)}.</span>
          <textarea
            required
            rows="1"
            style={{ flex: 1, padding: '8px' }}
            placeholder={`Statement ${String.fromCharCode(65 + idx)}`}
            value={item}
            onChange={(e) => handleStatementChange(idx, e.target.value)}
          ></textarea>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button type="button" onClick={() => setNewQStatements(prev => [...prev, ''])} style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add Statement</button>
        {newQStatements.length > 2 && (
          <button type="button" onClick={() => setNewQStatements(prev => prev.slice(0, -1))} style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', background: 'var(--danger-hover)' }}>- Remove</button>
        )}
      </div>
    </div>
  </div>
)}

{/* QUESTION TEXT (COMPREHENSION OR MCQ OR MATCH PROMPT) */}
<div className="form-field full-width" style={{ marginBottom: '12px' }}>
  <label>Question Prompt / Text</label>
  <textarea 
    required 
    rows="2" 
    placeholder={newQType === 'match-column' ? 'e.g. Choose the correct matching code from options below:' : 'Type the question text here...'}
    value={newQText}
    onChange={(e) => setNewQText(e.target.value)}
  ></textarea>
</div>

{/* OPTIONS */}
<div className="options-grid" style={{ marginBottom: '12px' }}>
  {newQOpts.map((opt, idx) => (
    <div className="ms-form-field" key={idx}>
      <label>Option {idx + 1}</label>
      <input 
        type="text" 
        required 
        placeholder={newQType === 'match-column' ? 'e.g. A-I, B-II, C-III, D-IV' : `Enter Option ${idx + 1}`}
        value={opt}
        onChange={(e) => handleOptChange(idx, e.target.value)}
      />
    </div>
  ))}
</div>

{/* CORRECT SELECTION */}
<div className="ms-form-field" style={{ maxWidth: '200px', marginBottom: '16px' }}>
  <label>Correct Answer Option</label>
  <select 
    className="ms-input"
    value={newQCorrect}
    onChange={(e) => setNewQCorrect(Number(e.target.value))}
  >
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
    <option value="4">Option 4</option>
  </select>
      </div>
{/* EXPLANATION */}
<div className="ms-form-field" style={{ marginBottom: '16px' }}>
  <label>Detailed Explanation (Optional)</label>
  <textarea 
    rows="3"
    className="ms-input"
    placeholder="Enter detailed explanation of the concept and why this option is correct"
    value={newQExplanation}
    onChange={(e) => setNewQExplanation(e.target.value)}
    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
  />
</div>

<button type="submit" className="ms-btn ms-btn-primary" style={{ width: '100%' }}>
  {editingQuestionId ? 'Update Question' : 'Add Question to Selected Set'}
</button>
{editingQuestionId && (
  <button type="button" className="ms-btn ms-btn-secondary" style={{ width: '100%', marginTop: '10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={cancelEditQuestion}>
    Cancel Edit
  </button>
)}
                      </form>
  )

  return (
    <div className="manage-set-page">
    <div className="manage-set-container">
      <div className="manage-set-header">
        <h1>Manage Exam Set #{setId}</h1>
        <p>Edit set details and manage questions</p>
        <button className="btn-back" onClick={() => navigate('/profile')}>&larr; Back to Profile</button>
      </div>
      <div className="manage-set-layout">
        <div className="manage-set-left">
                  {/* 4.2 CREATE / EDIT PYQ SET FORM */}
                  <form className="ms-card" onSubmit={handleCreateSet}>
                    <h3>{editingSetId ? `Edit PYQ Set #${editingSetId}` : 'Create New PYQ Year-Wise Set'}</h3>
                    <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                      <label>Paper Type</label>
                      <select 
                        className="ms-input"
                        value={newSetPaperType}
                        onChange={(e) => setNewSetPaperType(e.target.value)}
                      >
                        <option value="Paper I">Paper I (General Aptitude)</option>
                        <option value="Paper II">Paper II (Sociology)</option>
                      </select>
                    </div>

                    <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                      <label>Exam Year</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. 2023" 
                        value={newSetYear}
                        onChange={(e) => setNewSetYear(e.target.value)}
                      />
                    </div>

                    <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                      <label>Shift / Subtitle Info</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Shift 1 or June Exam" 
                        value={newSetSubtitle}
                        onChange={(e) => setNewSetSubtitle(e.target.value)}
                      />
                    </div>

                    <div className="ms-form-field" style={{ marginBottom: '16px' }}>
                      <label>Total Questions Count</label>
                      <select 
                        className="ms-input"
                        value={newSetCount}
                        onChange={(e) => setNewSetCount(Number(e.target.value))}
                      >
                        <option value="50">50 Questions (Standard Paper I)</option>
                        <option value="100">100 Questions (Standard Paper II)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="ms-btn ms-btn-primary">
                        {editingSetId ? 'Update Set Details' : 'Create Exam Set'}
                      </button>
                      {editingSetId && (
                        <button type="button" className="ms-btn ms-btn-secondary" style={{ background: '#f1f5f9', color: '#475569' }} onClick={cancelEditSet}>
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                  {editingSetId && (
                    <div className="ms-card">
                      <h3>Manage Questions ({editingSetQuestions?.length || 0})</h3>
                      <div className="ms-questions-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                        {(!editingSetQuestions || editingSetQuestions.length === 0) ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            No questions have been saved to this set yet. Please use the form below to import some!
                          </div>
                        ) : editingSetQuestions.map((q, idx) => (
                          <div key={q.id} className={`ms-q-card ${editingQuestionId === (q.id || q._id) ? 'ms-q-card--editing' : ''}`}>
                            {editingQuestionId === (q.id || q._id) ? (
                              renderQuestionForm(true)
                            ) : (
                              <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <span className="ms-q-title">Q{idx + 1} <span className="ms-q-type">{q.type.replace('-', ' ')}</span></span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  type="button" 
                                  className="ms-action-btn ms-action-btn--edit" 
                                  onClick={() => handleEditQuestion(q)}
                                >
                                  Edit
                                </button>
                                <button 
                                  type="button" 
                                  className="ms-action-btn ms-action-btn--delete" 
                                  onClick={() => handleDeleteQuestion(q.id || q._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            {q.passage && <div style={{ fontSize: '0.85rem', marginBottom: '8px', fontStyle: 'italic', color: 'var(--text-light)' }}>Passage: {q.passage.substring(0, 50)}...</div>}
                            {q.assertion && <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}><strong>A:</strong> {q.assertion}</div>}
                            {q.reason && <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}><strong>R:</strong> {q.reason}</div>}
                            {q.type === 'match-column' && q.list1 && q.list2 && (
                              <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', marginBottom: '8px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '4px' }}>
                                <div>
                                  <strong>List I</strong>
                                  <ol type="A" style={{ margin: '4px 0 0 20px', padding: 0 }}>
                                    {q.list1.map((item, i) => <li key={i}>{item}</li>)}
                                  </ol>
                                </div>
                                <div>
                                  <strong>List II</strong>
                                  <ol type="I" style={{ margin: '4px 0 0 20px', padding: 0 }}>
                                    {q.list2.map((item, i) => <li key={i}>{item}</li>)}
                                  </ol>
                                </div>
                              </div>
                            )}
                            <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}><strong>Q:</strong> {q.text}</div>
                            {q.options && q.options.length > 0 && (
                              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                                {q.options.map((opt, oIdx) => (
                                  <li key={oIdx} style={{ padding: '4px 0', color: q.correct === (oIdx + 1) ? 'var(--success)' : 'inherit', fontWeight: q.correct === (oIdx + 1) ? 'bold' : 'normal' }}>
                                    ({oIdx + 1}) {opt}
                                  </li>
                                ))}
                              </ul>
                            )}
                            </>
                            )}
                          </div>
                        ))}
                      </div>
                      
                    </div>
                  )}
                </div>
                
                {/* RIGHT PANE: form */}
                <div className="manage-set-right">
                  {editingSetId ? renderQuestionForm(false) : (
                    <div className="ms-empty-state">
                      <h4>Select or Create a Set</h4>
                      <p>You need to create or select a set before adding questions.</p>
                    </div>
                  )}
                </div>
        </div>
      </div>
    </div>
  )
}

export default ManageSet
