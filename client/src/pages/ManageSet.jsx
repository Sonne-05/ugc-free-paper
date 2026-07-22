import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import RichExplanationEditor from '../components/RichExplanationEditor'
import { PAPER1_UNITS } from '../constants/paper1Units'
import './Profile.css'
import './ManageSet.css'

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

const cleanPassageText = (text) => {
  if (!text) return ''
  let cleaned = text.replace(/\r\n/g, '\n')
  cleaned = cleaned.replace(/([^\n])\n([^\n])/g, '$1 $2').replace(/ +/g, ' ')
  return cleaned.trim()
}

const renderTextHtml = (str) => {
  if (!str) return '';
  const formatted = str
    .replace(/\^([a-zA-Z0-9\-+∞\(\)]+)/g, '<sup>$1</sup>')
    .replace(/_([a-zA-Z0-9\-+∞\(\)]+)/g, '<sub>$1</sub>');
  return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
}

const renderTableData = (tableData, key = 0) => {
  if (!tableData || !tableData.length) return null
  return (
    <div key={key} className="table-responsive" style={{ margin: '15px 0', overflowX: 'auto' }}>
      <table style={{ width: '75%', margin: '0 auto 20px auto', borderCollapse: 'collapse', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
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

const DOUBLE_HEADER_TEMPLATE = `<div class="di-table-wrapper">
  <table class="di-table">
    <thead>
      <tr>
        <th rowspan="2">Year</th>
        <th colspan="5">STUDENTS NAME</th>
      </tr>
      <tr>
        <th>A</th>
        <th>B</th>
        <th>C</th>
        <th>D</th>
        <th>E</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: bold;">2021</td>
        <td>75</td>
        <td>82</td>
        <td>75</td>
        <td>84</td>
        <td>74</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">2022</td>
        <td>90</td>
        <td>93</td>
        <td>85</td>
        <td>86</td>
        <td>79</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">2023</td>
        <td>96</td>
        <td>76</td>
        <td>65</td>
        <td>85</td>
        <td>85</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">2024</td>
        <td>92</td>
        <td>85</td>
        <td>66</td>
        <td>81</td>
        <td>82</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">2025</td>
        <td>86</td>
        <td>82</td>
        <td>73</td>
        <td>80</td>
        <td>83</td>
      </tr>
    </tbody>
  </table>
</div>`;

const SIMPLE_HTML_TEMPLATE = `<div class="di-table-wrapper">
  <table class="di-table">
    <thead>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
        <th>Header 3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Row 1, Col 1</td>
        <td>Row 1, Col 2</td>
        <td>Row 1, Col 3</td>
      </tr>
      <tr>
        <td>Row 2, Col 1</td>
        <td>Row 2, Col 2</td>
        <td>Row 2, Col 3</td>
      </tr>
    </tbody>
  </table>
</div>`;

const MathHelperWidget = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('simple'); // 'simple' or 'equation'
  const [num, setNum] = useState('');
  const [den, setDen] = useState('');
  const [whole, setWhole] = useState('');
  const [equationText, setEquationText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const convertToHtml = (str) => {
    if (!str) return '';
    // Replace [num/den] with the HTML fraction block
    return str.replace(/\[([^\]/]+)\/([^\]]+)\]/g, (match, n, d) => {
      const fractionStyle = `display:inline-block; vertical-align:middle; text-align:center; padding:0 2px;`;
      const numStyle = `display:block; border-bottom:1px solid; padding:0 2px; line-height:1.1;`;
      const denStyle = `display:block; padding:0 2px; line-height:1.1;`;
      return `<span style="${fractionStyle}"><span style="${numStyle}">${n.trim()}</span><span style="${denStyle}">${d.trim()}</span></span>`;
    });
  };

  const generateCode = () => {
    if (activeTab === 'equation') {
      return convertToHtml(equationText);
    }
    if (!num && !den) return '';
    const fractionStyle = `display:inline-block; vertical-align:middle; text-align:center; padding:0 2px;`;
    const numStyle = `display:block; border-bottom:1px solid; padding:0 2px; line-height:1.1;`;
    const denStyle = `display:block; padding:0 2px; line-height:1.1;`;
    
    const fractionPart = `<span style="${fractionStyle}"><span style="${numStyle}">${num || '?' }</span><span style="${denStyle}">${den || '?'}</span></span>`;
    return whole ? `${whole}${fractionPart}` : fractionPart;
  };

  const handleCopy = () => {
    const code = generateCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const hasContent = activeTab === 'equation' ? !!equationText.trim() : (!!num || !!den);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontSize: '0.95rem', fontWeight: 'bold' }}>
          🧮 Math Equation Helper
        </h4>
        <button 
          type="button" 
          onClick={onClose} 
          style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Close Helper"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('simple')}
          style={{
            flex: 1,
            background: activeTab === 'simple' ? '#ffffff' : 'transparent',
            color: activeTab === 'simple' ? '#4f46e5' : '#64748b',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: activeTab === 'simple' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          Single Fraction
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('equation')}
          style={{
            flex: 1,
            background: activeTab === 'equation' ? '#ffffff' : 'transparent',
            color: activeTab === 'equation' ? '#4f46e5' : '#64748b',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: activeTab === 'equation' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          Full Equation
        </button>
      </div>
      
      {activeTab === 'simple' ? (
        <>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.3' }}>
            Enter fraction values to generate a single fraction.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px', marginBottom: '12px' }}>
            <div className="ms-form-field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Whole No.</label>
              <input 
                type="text" 
                placeholder="e.g. 4" 
                value={whole} 
                onChange={(e) => setWhole(e.target.value)} 
                className="ms-input"
                style={{ padding: '6px', fontSize: '0.75rem' }}
              />
            </div>
            <div className="ms-form-field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Numerator</label>
              <input 
                type="text" 
                placeholder="e.g. 2" 
                value={num} 
                onChange={(e) => setNum(e.target.value)} 
                className="ms-input"
                style={{ padding: '6px', fontSize: '0.75rem' }}
              />
            </div>
            <div className="ms-form-field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Denominator</label>
              <input 
                type="text" 
                placeholder="e.g. 3" 
                value={den} 
                onChange={(e) => setDen(e.target.value)} 
                className="ms-input"
                style={{ padding: '6px', fontSize: '0.75rem' }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.3' }}>
            Type your full equation. Wrap fractions in square brackets like <code>[x/y]</code>.
          </p>
          <div className="ms-form-field" style={{ marginBottom: '12px' }}>
            <textarea 
              rows="3" 
              placeholder="e.g. 4[2/3] + 3[1/2] - 1[2/3] = [13/2]"
              value={equationText}
              onChange={(e) => setEquationText(e.target.value)}
              className="ms-input"
              style={{ fontFamily: 'monospace', fontSize: '0.75rem', padding: '6px' }}
            />
          </div>
        </>
      )}

      {hasContent && (
        <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Preview:</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '36px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '4px', fontSize: '0.95rem', padding: '4px', overflowX: 'auto' }}>
            <span dangerouslySetInnerHTML={{ __html: generateCode() }} />
          </div>
        </div>
      )}

      <button 
        type="button" 
        onClick={handleCopy} 
        disabled={!hasContent}
        className="ms-btn" 
        style={{ 
          width: '100%', 
          background: '#4f46e5', 
          color: '#fff', 
          border: 'none', 
          padding: '8px 12px', 
          fontSize: '0.78rem', 
          fontWeight: '600', 
          borderRadius: '6px',
          cursor: hasContent ? 'pointer' : 'not-allowed',
          opacity: hasContent ? 1 : 0.6
        }}
      >
        {copySuccess ? '✓ Code Copied!' : '📋 Copy Equation Code'}
      </button>
    </div>
  );
};


const DataInterpretationGroup = ({
  editingSetQuestions,
  setId,
  API_BASE_URL,
  onSave,
  onDeleteGroup
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [diMode, setDiMode] = useState('visual')
  const [localPassage, setLocalPassage] = useState('')
  const [diTable, setDiTable] = useState([
    ['Year', 'Product A', 'Product B'],
    ['2021', '', ''],
    ['2022', '', '']
  ])

  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' }
  ])

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const existingQs = Array.from({ length: 5 }).map((_, idx) => {
      const qIndex = idx + 1
      return editingSetQuestions.find(q => q.qIndex === qIndex)
    })
    
    const firstQWithPassage = existingQs.find(q => q && q.passage)
    
    if (firstQWithPassage && firstQWithPassage.passage) {
      setLocalPassage(firstQWithPassage.passage)
      
      const parsedTable = parseTableText(firstQWithPassage.passage)
      if (parsedTable) {
        setDiTable(parsedTable)
        setDiMode('visual')
      } else {
        setDiMode('raw')
      }
    } else {
      setLocalPassage('')
      setDiTable([
        ['Year', 'Product A', 'Product B'],
        ['2021', '', ''],
        ['2022', '', '']
      ])
      setDiMode('visual')
    }

    const nextQuestions = Array.from({ length: 5 }).map((_, idx) => {
      const q = existingQs[idx]
      if (q) {
        return {
          id: q.id || q._id,
          text: q.text || '',
          options: q.options && q.options.length >= 4 ? q.options.slice(0, 4) : ['', '', '', ''],
          correct: q.correct || 1,
          explanation: q.explanation || ''
        }
      } else {
        return {
          text: '',
          options: ['', '', '', ''],
          correct: 1,
          explanation: ''
        }
      }
    })
    setQuestions(nextQuestions)
  }, [editingSetQuestions, isOpen])

  const handleCellChangeLocal = (rIdx, cIdx, val) => {
    const next = diTable.map((row, r) => {
      if (r !== rIdx) return row
      return row.map((cell, c) => (c === cIdx ? val : cell))
    })
    setDiTable(next)
    const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
    setLocalPassage(serialized)
  }

  const handleAddRowLocal = () => {
    const next = [...diTable, Array(diTable[0].length).fill('')]
    setDiTable(next)
    const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
    setLocalPassage(serialized)
  }

  const handleAddColumnLocal = () => {
    const next = diTable.map(row => [...row, ''])
    setDiTable(next)
    const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
    setLocalPassage(serialized)
  }

  const handleRemoveRowLocal = () => {
    if (diTable.length <= 2) return
    const next = diTable.slice(0, -1)
    setDiTable(next)
    const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
    setLocalPassage(serialized)
  }

  const handleRemoveColumnLocal = () => {
    if (diTable[0].length <= 1) return
    const next = diTable.map(row => row.slice(0, -1))
    setDiTable(next)
    const serialized = next.map(row => '| ' + row.join(' | ') + ' |').join('\n')
    setLocalPassage(serialized)
  }

  const handleSaveAll = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    if (!localPassage.trim()) {
      alert('Please fill in the Table Data / Passage.')
      setIsSaving(false)
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim() || q.options.some(o => !o.trim())) {
        alert(`Please fill in the Question prompt and all 4 Options for Question ${i + 1}.`)
        setIsSaving(false)
        return
      }
    }

    try {
      const promises = questions.map((q, idx) => {
        const payload = {
          setId,
          type: 'di',
          qIndex: idx + 1,
          passage: localPassage,
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation
        }
        const existing = editingSetQuestions.find(eq => eq.qIndex === idx + 1)
        if (existing && (existing.id || existing._id)) {
          return fetch(`${API_BASE_URL}/api/questions/${existing.id || existing._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(async r => {
            const data = await r.json()
            if (!r.ok) throw new Error(data.message)
            return data
          })
        } else {
          return fetch(`${API_BASE_URL}/api/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(async r => {
            const data = await r.json()
            if (!r.ok) throw new Error(data.message)
            return data
          })
        }
      })

      const results = await Promise.all(promises)
      const lastResult = results[results.length - 1]
      const updatedSet = lastResult.updatedSet
      const savedQs = results.map(r => r.question)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)

      onSave(savedQs, updatedSet)
    } catch (err) {
      console.error(err)
      alert('Failed to save DI questions: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAll = async () => {
    const existingQs = Array.from({ length: 5 }).map((_, idx) => {
      const qIndex = idx + 1
      return editingSetQuestions.find(q => q.qIndex === qIndex)
    }).filter(Boolean)
    if (existingQs.length === 0) return
    if (!window.confirm('Are you sure you want to delete all 5 Data Interpretation questions?')) return

    try {
      const promises = existingQs.map(q => {
        return fetch(`${API_BASE_URL}/api/questions/${q.id || q._id}`, {
          method: 'DELETE'
        }).then(r => r.json())
      })
      const results = await Promise.all(promises)
      const lastResult = results[results.length - 1]
      
      onDeleteGroup(existingQs.map(q => q.id || q._id), lastResult.updatedSet)
    } catch (err) {
      console.error(err)
      alert('Error deleting DI questions')
    }
  }

  const isSaved = editingSetQuestions.some(q => q.qIndex === 1 && q.type === 'di')

  return (
    <div className={`ms-q-slot-card ${isOpen ? 'ms-q-slot-card--open' : ''} ${isSaved ? 'ms-q-slot-card--saved' : 'ms-q-slot-card--empty'}`} style={{ borderLeft: isSaved ? '4px solid #10b981' : '4px solid #94a3b8' }}>
      <div className="ms-q-slot-header" onClick={() => setIsOpen(!isOpen)} style={{ background: '#f0fdf4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="ms-q-slot-number" style={{ color: '#166534' }}>Q1 - Q5</span>
          <span className="ms-q-slot-badge" style={{ background: isSaved ? '#dcfce7' : '#f1f5f9', color: isSaved ? '#166534' : '#64748b' }}>
            {isSaved ? 'Saved (Data Interpretation)' : 'Empty (DI)'}
          </span>
          <span className="ms-q-slot-preview" style={{ color: '#166534', fontWeight: '500' }}>
            {isSaved ? 'Questions 1 to 5 (Shared Table Data)' : 'Click to add shared table data and 5 questions'}
          </span>
        </div>
        <div className="ms-q-slot-toggle-icon">
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {isOpen && (
        <form className="ms-q-slot-body" onSubmit={handleSaveAll} style={{ background: '#fafdfb' }}>
          <div className="ms-form-field" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', color: '#166534' }}>Shared Table Data / Passage (Questions 1 - 5)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className={`pane-btn ${diMode === 'visual' ? 'active' : ''}`} 
                  style={{ padding: '2px 8px', fontSize: '0.75rem', background: diMode === 'visual' ? '#166534' : 'var(--bg-card)', border: '1px solid var(--border)', color: diMode === 'visual' ? '#fff' : 'var(--text-primary)' }}
                  onClick={() => setDiMode('visual')}
                >
                  Visual Grid
                </button>
                <button 
                  type="button" 
                  className={`pane-btn ${diMode === 'raw' ? 'active' : ''}`} 
                  style={{ padding: '2px 8px', fontSize: '0.75rem', background: diMode === 'raw' ? '#166534' : 'var(--bg-card)', border: '1px solid var(--border)', color: diMode === 'raw' ? '#fff' : 'var(--text-primary)' }}
                  onClick={() => setDiMode('raw')}
                >
                  Raw Text
                </button>
              </div>
            </div>

            {diMode === 'visual' ? (
              <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: '#fff', overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', marginBottom: '10px', width: '100%' }}>
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
                              onChange={(e) => handleCellChangeLocal(rIdx, cIdx, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleAddRowLocal}>+ Add Row</button>
                  <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleAddColumnLocal}>+ Add Column</button>
                  {diTable.length > 2 && (
                    <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff' }} onClick={handleRemoveRowLocal}>Remove Row</button>
                  )}
                  {diTable[0].length > 2 && (
                    <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#fff' }} onClick={handleRemoveColumnLocal}>Remove Col</button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Overwrite current text with a complex double header table template?")) {
                        setLocalPassage(DOUBLE_HEADER_TEMPLATE);
                      }
                    }}
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⚡ Insert Double Header Table Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Overwrite current text with a simple HTML table template?")) {
                        setLocalPassage(SIMPLE_HTML_TEMPLATE);
                      }
                    }}
                    style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Insert Simple HTML Table
                  </button>
                </div>
                <textarea 
                  required 
                  rows="8" 
                  placeholder="Paste table data or type/paste HTML table code here..."
                  value={localPassage}
                  onChange={(e) => setLocalPassage(e.target.value)}
                  className="ms-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>
            )}

            {/* Live Preview area */}
            <div style={{ marginTop: '16px', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Table Preview (Student View):
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Renders automatically
                </span>
              </div>
              <div className="passage-live-preview-content" style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflowX: 'auto' }}>
                {localPassage ? renderPassageWithTable(localPassage) : <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Table / Passage content is empty</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
            {questions.map((dq, qIdx) => (
              <div key={qIdx} style={{ border: '1px solid #cbd5e1', padding: '15px', borderRadius: '8px', background: '#fff' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#166534', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', fontSize: '0.90rem', fontWeight: 'bold' }}>
                  Question {qIdx + 1} of 5 (Q{qIdx + 1} Slot)
                </h4>
                
                <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Question Prompt / Text</label>
                  <textarea 
                    required 
                    rows="2" 
                    placeholder={`Type question ${qIdx + 1} text here...`}
                    value={dq.text}
                    onChange={(e) => {
                      const next = [...questions]
                      next[qIdx] = { ...next[qIdx], text: e.target.value }
                      setQuestions(next)
                    }}
                    className="ms-input"
                  />
                </div>

                <div className="options-grid" style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {dq.options.map((opt, oIdx) => (
                    <div className="ms-form-field" key={oIdx}>
                      <label style={{ fontSize: '0.8rem' }}>Option {oIdx + 1}</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={`Enter Option ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...questions]
                          const nextOpts = [...next[qIdx].options]
                          nextOpts[oIdx] = e.target.value
                          next[qIdx] = { ...next[qIdx], options: nextOpts }
                          setQuestions(next)
                        }}
                        className="ms-input"
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="ms-form-field">
                    <label style={{ fontSize: '0.8rem' }}>Correct Answer Option</label>
                    <select 
                      className="ms-input"
                      value={dq.correct}
                      onChange={(e) => {
                        const next = [...questions]
                        next[qIdx] = { ...next[qIdx], correct: Number(e.target.value) }
                        setQuestions(next)
                      }}
                    >
                      <option value="1">Option 1</option>
                      <option value="2">Option 2</option>
                      <option value="3">Option 3</option>
                      <option value="4">Option 4</option>
                    </select>
                  </div>
                  <div className="ms-form-field">
                    <label style={{ fontSize: '0.8rem' }}>Explanation (Optional)</label>
                    <RichExplanationEditor 
                      placeholder="Explanation..."
                      value={dq.explanation || ''}
                      onChange={(val) => {
                        const next = [...questions]
                        next[qIdx] = { ...next[qIdx], explanation: val }
                        setQuestions(next)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="submit" disabled={isSaving} className="ms-btn ms-btn-primary" style={{ flex: 1, background: '#166534' }}>
              {isSaving ? 'Saving...' : (isSaved ? 'Update All 5 DI Questions' : 'Save All 5 DI Questions')}
            </button>
            {isSaved && (
              <button type="button" className="ms-btn ms-btn-secondary" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={handleDeleteAll}>
                Delete DI Set
              </button>
            )}
            {saveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                ✓ Saved!
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

const ReadingComprehensionGroup = ({
  editingSetQuestions,
  setId,
  API_BASE_URL,
  onSave,
  onDeleteGroup
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localPassage, setLocalPassage] = useState('')

  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' }
  ])

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const existingQs = Array.from({ length: 5 }).map((_, idx) => {
      const qIndex = 46 + idx
      return editingSetQuestions.find(q => q.qIndex === qIndex)
    })
    
    const firstQWithPassage = existingQs.find(q => q && q.passage)
    
    if (firstQWithPassage && firstQWithPassage.passage) {
      setLocalPassage(firstQWithPassage.passage)
    } else {
      setLocalPassage('')
    }

    const nextQuestions = Array.from({ length: 5 }).map((_, idx) => {
      const q = existingQs[idx]
      if (q) {
        return {
          id: q.id || q._id,
          text: q.text || '',
          options: q.options && q.options.length >= 4 ? q.options.slice(0, 4) : ['', '', '', ''],
          correct: q.correct || 1,
          explanation: q.explanation || ''
        }
      } else {
        return {
          text: '',
          options: ['', '', '', ''],
          correct: 1,
          explanation: ''
        }
      }
    })
    setQuestions(nextQuestions)
  }, [editingSetQuestions, isOpen])

  const handleSaveAll = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    if (!localPassage.trim()) {
      alert('Please fill in the Comprehension Passage.')
      setIsSaving(false)
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim() || q.options.some(o => !o.trim())) {
        alert(`Please fill in the Question prompt and all 4 Options for Question ${i + 1} (Q${46 + i}).`)
        setIsSaving(false)
        return
      }
    }

    try {
      const promises = questions.map((q, idx) => {
        const payload = {
          setId,
          type: 'comprehension',
          unit: 'Unit 3: Comprehension',
          qIndex: 46 + idx,
          passage: localPassage,
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation
        }
        const existing = editingSetQuestions.find(eq => eq.qIndex === 46 + idx)
        if (existing && (existing.id || existing._id)) {
          return fetch(`${API_BASE_URL}/api/questions/${existing.id || existing._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(async r => {
            const data = await r.json()
            if (!r.ok) throw new Error(data.message)
            return data
          })
        } else {
          return fetch(`${API_BASE_URL}/api/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(async r => {
            const data = await r.json()
            if (!r.ok) throw new Error(data.message)
            return data
          })
        }
      })

      const results = await Promise.all(promises)
      const lastResult = results[results.length - 1]
      const updatedSet = lastResult.updatedSet
      const savedQs = results.map(r => r.question)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)

      onSave(savedQs, updatedSet)
    } catch (err) {
      console.error(err)
      alert('Failed to save Comprehension questions: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAll = async () => {
    const existingQs = Array.from({ length: 5 }).map((_, idx) => {
      const qIndex = 46 + idx
      return editingSetQuestions.find(q => q.qIndex === qIndex)
    }).filter(Boolean)
    if (existingQs.length === 0) return
    if (!window.confirm('Are you sure you want to delete all 5 Comprehension questions (Q46-Q50)?')) return

    try {
      const promises = existingQs.map(q => {
        return fetch(`${API_BASE_URL}/api/questions/${q.id || q._id}`, {
          method: 'DELETE'
        }).then(r => r.json())
      })
      const results = await Promise.all(promises)
      const lastResult = results[results.length - 1]
      
      onDeleteGroup(existingQs.map(q => q.id || q._id), lastResult.updatedSet)
    } catch (err) {
      console.error(err)
      alert('Error deleting Comprehension questions')
    }
  }

  const isSaved = editingSetQuestions.some(q => q.qIndex >= 46 && q.qIndex <= 50 && q.type === 'comprehension')

  return (
    <div className={`ms-q-slot-card ${isOpen ? 'ms-q-slot-card--open' : ''} ${isSaved ? 'ms-q-slot-card--saved' : 'ms-q-slot-card--empty'}`} style={{ borderLeft: isSaved ? '4px solid #10b981' : '4px solid #0284c7' }}>
      <div className="ms-q-slot-header" onClick={() => setIsOpen(!isOpen)} style={{ background: '#f0f9ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="ms-q-slot-number" style={{ color: '#0369a1' }}>Q46 - Q50</span>
          <span className="ms-q-slot-badge" style={{ background: isSaved ? '#e0f2fe' : '#f1f5f9', color: isSaved ? '#0369a1' : '#64748b' }}>
            {isSaved ? 'Saved (Reading Comprehension)' : 'Empty (Comprehension)'}
          </span>
          <span className="ms-q-slot-preview" style={{ color: '#0369a1', fontWeight: '500' }}>
            {isSaved ? 'Questions 46 to 50 (Shared Passage)' : 'Click to add shared comprehension passage and 5 questions'}
          </span>
        </div>
        <div className="ms-q-slot-toggle-icon">
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {isOpen && (
        <form className="ms-q-slot-body" onSubmit={handleSaveAll} style={{ background: '#f8fafc' }}>
          <div className="ms-form-field" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', color: '#0369a1', margin: 0 }}>Comprehension Passage (Questions 46 - 50)</label>
              <button
                type="button"
                onClick={() => setLocalPassage(cleanPassageText(localPassage))}
                style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                title="Clean up broken PDF line breaks into smooth continuous paragraphs"
              >
                ✨ Auto-Fix PDF Line Breaks
              </button>
            </div>
            <textarea
              required
              rows="5"
              placeholder="Paste reading comprehension passage here..."
              value={localPassage}
              onChange={(e) => setLocalPassage(e.target.value)}
              className="ms-input"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {questions.map((q, qIdx) => (
              <div key={qIdx} style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#fff' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', fontSize: '0.88rem', fontWeight: 'bold' }}>
                  Question {qIdx + 1} of 5 (Q{46 + qIdx})
                </h4>

                <div className="ms-form-field" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Question Prompt / Text</label>
                  <textarea
                    required
                    rows="2"
                    className="ms-input"
                    placeholder={`Type question text for Q${46 + qIdx}...`}
                    value={q.text}
                    onChange={(e) => {
                      setQuestions(prev => {
                        const next = [...prev]
                        next[qIdx] = { ...next[qIdx], text: e.target.value }
                        return next
                      })
                    }}
                  />
                </div>

                <div className="ms-options-grid">
                  {q.options.map((opt, oIdx) => (
                    <div className="ms-form-field" key={oIdx}>
                      <label style={{ fontSize: '0.78rem' }}>Option {oIdx + 1}</label>
                      <input
                        type="text"
                        required
                        className="ms-input"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          setQuestions(prev => {
                            const next = [...prev]
                            const nextOpts = [...next[qIdx].options]
                            nextOpts[oIdx] = e.target.value
                            next[qIdx] = { ...next[qIdx], options: nextOpts }
                            return next
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="ms-form-field">
                    <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Correct Answer Option</label>
                    <select
                      className="ms-input"
                      value={q.correct}
                      onChange={(e) => {
                        setQuestions(prev => {
                          const next = [...prev]
                          next[qIdx] = { ...next[qIdx], correct: Number(e.target.value) }
                          return next
                        })
                      }}
                    >
                      <option value="1">Option 1</option>
                      <option value="2">Option 2</option>
                      <option value="3">Option 3</option>
                      <option value="4">Option 4</option>
                    </select>
                  </div>

                  <div className="ms-form-field">
                    <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Detailed Explanation (Optional)</label>
                    <RichExplanationEditor
                      placeholder="Explanation..."
                      value={q.explanation || ''}
                      onChange={(val) => {
                        setQuestions(prev => {
                          const next = [...prev]
                          next[qIdx] = { ...next[qIdx], explanation: val }
                          return next
                        })
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={isSaving} className="ms-btn ms-btn-primary" style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : 'Save All 5 Comprehension Questions'}
            </button>
            {isSaved && (
              <button type="button" className="ms-btn ms-btn-secondary" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={handleDeleteAll}>
                Delete Group
              </button>
            )}
          </div>
          {saveSuccess && (
            <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '8px' }}>
              ✓ Saved all 5 Comprehension questions!
            </div>
          )}
        </form>
      )}
    </div>
  )
}

const QuestionSlot = ({ 
  index, 
  question, 
  setId, 
  onSave, 
  onDelete, 
  API_BASE_URL 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [qType, setQType] = useState('mcq')
  const [qText, setQText] = useState('')
  const [qOpts, setQOpts] = useState(['', '', '', ''])
  const [qCorrect, setQCorrect] = useState(1)
  const [qExplanation, setQExplanation] = useState('')
  const [qAssertion, setQAssertion] = useState('')
  const [qReason, setQReason] = useState('')
  const [qList1, setQList1] = useState(['', '', '', ''])
  const [qList2, setQList2] = useState(['', '', '', ''])
  const [qList1Header, setQList1Header] = useState('')
  const [qList2Header, setQList2Header] = useState('')
  const [qPassage, setQPassage] = useState('')
  const [qStatements, setQStatements] = useState(['', '', '', '', ''])
  const [qSubPrompt, setQSubPrompt] = useState('Choose the correct answer from the options given below:')
  const [qUnit, setQUnit] = useState('Unit 1: Teaching Aptitude')
  const [slotDiQuestions, setSlotDiQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' }
  ])
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [pasteText, setPasteText] = useState('')
 
  // Sync state with question when it changes or opens
  useEffect(() => {
    if (question) {
      setQType(question.type || 'mcq')
      setQText(question.text || '')
      setQOpts(question.options && question.options.length >= 4 ? question.options.slice(0, 4) : ['', '', '', ''])
      setQCorrect(question.correct || 1)
      setQExplanation(question.explanation || '')
      setQAssertion(question.assertion || '')
      setQReason(question.reason || '')
      setQList1(question.list1 && question.list1.length >= 4 ? question.list1.slice(0, 4) : ['', '', '', ''])
      setQList2(question.list2 && question.list2.length >= 4 ? question.list2.slice(0, 4) : ['', '', '', ''])
      setQList1Header(question.list1Header || '')
      setQList2Header(question.list2Header || '')
      setQPassage(question.passage || '')
      setQStatements(question.statements || ['', '', '', '', ''])
      setQSubPrompt(question.subPrompt || 'Choose the correct answer from the options given below:')
      setQUnit(question.unit || 'Unit 1: Teaching Aptitude')
    } else {
      // Clear fields for empty slots
      setQType('mcq')
      setQText('')
      setQOpts(['', '', '', ''])
      setQCorrect(1)
      setQExplanation('')
      setQAssertion('')
      setQReason('')
      setQList1(['', '', '', ''])
      setQList2(['', '', '', ''])
      setQList1Header('')
      setQList2Header('')
      setQPassage('')
      setQStatements(['', '', '', '', ''])
      setQSubPrompt('Choose the correct answer from the options given below:')
      setQUnit('Unit 1: Teaching Aptitude')
    }
  }, [question, isOpen])

  const handlePasteChange = (e) => {
    const text = e.target.value
    setPasteText(text)
    if (!text.trim()) return

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    let parsedText = ''
    let parsedOpts = ['', '', '', '']
    let parsedCorrect = 1
    
    let optIndex = 0
    let promptLines = []
    
    for (let line of lines) {
      const optMatch = line.match(/^[\(\[]?([A-D1-4])[\)\]\.\:\-\s]\s*(.*)/i)
      if (optMatch && optIndex < 4) {
        const optLetter = optMatch[1].toUpperCase()
        const optVal = optMatch[2].trim()
        
        let indexToPut = optIndex
        if (['A', '1'].includes(optLetter)) indexToPut = 0
        else if (['B', '2'].includes(optLetter)) indexToPut = 1
        else if (['C', '3'].includes(optLetter)) indexToPut = 2
        else if (['D', '4'].includes(optLetter)) indexToPut = 3
        else {
          indexToPut = optIndex
        }
        
        parsedOpts[indexToPut] = optVal
        optIndex++
        continue
      }
      
      const ansMatch = line.match(/(?:correct\s+)?ans(?:wer)?\s*[\:\-\s]\s*[\(\[]?([A-D1-4])[\)\]]?/i)
      if (ansMatch) {
        const ansVal = ansMatch[1].toUpperCase()
        if (['A', '1'].includes(ansVal)) parsedCorrect = 1
        else if (['B', '2'].includes(ansVal)) parsedCorrect = 2
        else if (['C', '3'].includes(ansVal)) parsedCorrect = 3
        else if (['D', '4'].includes(ansVal)) parsedCorrect = 4
        continue
      }
      
      promptLines.push(line)
    }

    if (promptLines.length > 0) {
      parsedText = promptLines.join('\n')
    }

    if (parsedText) {
      setQText(parsedText)
    }
    if (parsedOpts.some(o => o !== '')) {
      setQOpts(parsedOpts)
    }
    setQCorrect(parsedCorrect)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    // If empty slot and selecting bulk passage type (comprehension or di)
    if (!question && (qType === 'comprehension' || qType === 'di')) {
      if (!qPassage.trim()) {
        alert(`Please fill in the ${qType === 'di' ? 'table data / passage' : 'comprehension passage'}.`)
        setIsSaving(false)
        return
      }
      for (let i = 0; i < slotDiQuestions.length; i++) {
        const sq = slotDiQuestions[i]
        if (!sq.text.trim() || sq.options.some(o => !o.trim())) {
          alert(`Please fill in question text and all 4 options for Question ${i + 1} of 5.`)
          setIsSaving(false)
          return
        }
      }
      const questions = slotDiQuestions.map(sq => ({
        type: qType,
        unit: qUnit || (qType === 'di' ? 'Unit 7: Data Interpretation' : 'Unit 3: Comprehension'),
        text: sq.text,
        options: sq.options,
        correct: sq.correct,
        passage: qPassage,
        explanation: sq.explanation
      }))
      try {
        const res = await fetch(`${API_BASE_URL}/api/questions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId, questions })
        })
        if (res.ok) {
          setSaveSuccess(true)
          if (typeof onSave === 'function') onSave()
        } else {
          alert('Failed to save passage questions')
        }
      } catch (err) {
        console.error(err)
        alert('Error saving passage questions')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (qType === 'mcq') {
      if (!qText.trim() || qOpts.some(o => !o.trim())) {
        alert('Please fill in the question prompt and all 4 options.')
        setIsSaving(false)
        return
      }
    } else if (qType === 'assertion-reason') {
      if (!qAssertion.trim() || !qReason.trim() || qOpts.some(o => !o.trim())) {
        alert('Please fill in both Assertion and Reason statements, and all options.')
        setIsSaving(false)
        return
      }
    } else if (qType === 'match-column') {
      if (!qText.trim() || qList1.some(l => !l.trim()) || qList2.some(l => !l.trim()) || qOpts.some(o => !o.trim())) {
        alert('Please fill in List I, List II, and all options combinations.')
        setIsSaving(false)
        return
      }
    } else if (qType === 'comprehension' || qType === 'di') {
      if (!qPassage.trim() || !qText.trim() || qOpts.some(o => !o.trim())) {
        alert('Please fill in the passage/table data, specific question prompt, and options.')
        setIsSaving(false)
        return
      }
    } else if (qType === 'multiple-statement') {
      const filledStatements = qStatements.filter(s => s.trim() !== '')
      if (!qText.trim() || filledStatements.length < 2 || qOpts.some(o => !o.trim())) {
        alert('Please fill in the question text, at least 2 statements, and all options.')
        setIsSaving(false)
        return
      }
    }

    const payload = {
      setId,
      type: qType,
      text: qText,
      qIndex: index,
      options: qOpts,
      correct: qCorrect,
      assertion: qAssertion,
      reason: qReason,
      passage: qPassage,
      statements: qStatements.filter(s => s.trim() !== ''),
      subPrompt: qSubPrompt,
      explanation: qExplanation,
      unit: qUnit,
      list1: qList1,
      list2: qList2,
      list1Header: qList1Header,
      list2Header: qList2Header
    }

    try {
      let res
      if (question && (question.id || question._id)) {
        res = await fetch(`${API_BASE_URL}/api/questions/${question.id || question._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch(`${API_BASE_URL}/api/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      
      const savedQ = data.question || (question ? { ...payload, id: question.id || question._id } : null)
      onSave(savedQ, data.updatedSet)
    } catch (err) {
      console.error(err)
      alert('Failed to save question: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!question || !(question.id || question._id)) return
    if (!window.confirm(`Are you sure you want to delete Question ${index}?`)) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${question.id || question._id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        const data = await res.json()
        onDelete(question.id || question._id, data.updatedSet)
      } else {
        alert('Failed to delete question')
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting question')
    }
  }

  const isSaved = !!question

  return (
    <div className={`ms-q-slot-card ${isOpen ? 'ms-q-slot-card--open' : ''} ${isSaved ? 'ms-q-slot-card--saved' : 'ms-q-slot-card--empty'}`}>
      <div className="ms-q-slot-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="ms-q-slot-number">Q{index}</span>
          <span className={`ms-q-slot-badge ${isSaved ? 'ms-q-slot-badge--saved' : 'ms-q-slot-badge--empty'}`}>
            {isSaved ? `Saved (${qType.replace('-', ' ')})` : 'Empty'}
          </span>
          {isSaved && qUnit && (
            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
              {qUnit.split(':')[0]}
            </span>
          )}
          <span className="ms-q-slot-preview" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {qText ? (qText.length > 60 ? qText.substring(0, 60) + '...' : qText) : 'Click to add question content'}
          </span>
        </div>
        <div className="ms-q-slot-toggle-icon">
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {isOpen && (
        <form className="ms-q-slot-body" onSubmit={handleSave}>
          {!isSaved && (
            <div className="ms-form-field" style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <label style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ⚡ Quick Paste / Auto-fill Helper
              </label>
              <textarea
                placeholder="Paste raw question text here (we'll extract Q-text, options A/B/C/D and answer if matches...)"
                rows="2"
                style={{ fontSize: '0.8rem', padding: '6px', background: '#fff', width: '100%', boxSizing: 'border-box' }}
                value={pasteText}
                onChange={handlePasteChange}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Tip: Paste the prompt and options, and the form below will auto-populate!
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="ms-form-field">
              <label>Question Type</label>
              <select className="ms-input" value={qType} onChange={(e) => {
                const type = e.target.value
                setQType(type)
                if (type === 'assertion-reason') {
                  setQSubPrompt('In the light of the above statements, choose the correct answer from the options given below')
                } else if (type === 'match-column' || type === 'multiple-statement') {
                  setQSubPrompt('Choose the correct answer from the options given below:')
                }
                if (type === 'di') setQUnit('Unit 7: Data Interpretation')
                if (type === 'comprehension') setQUnit('Unit 3: Comprehension')
              }}>
                <option value="mcq">Normal MCQ</option>
                <option value="assertion-reason">Assertion & Reasoning</option>
                <option value="match-column">Match the Column</option>
                <option value="comprehension">Comprehension / Passage</option>
                <option value="di">Data Interpretation / Table Data</option>
                <option value="multiple-statement">Multiple Statements</option>
              </select>
            </div>
            <div className="ms-form-field">
              <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Syllabus Unit (Paper I)</label>
              <select className="ms-input" value={qUnit} onChange={(e) => setQUnit(e.target.value)}>
                {PAPER1_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {(qType === 'comprehension' || qType === 'di') && (
            <div className="ms-form-field" style={{ marginBottom: '12px' }}>
              <label>{qType === 'di' ? 'Table Data / Passage' : 'Comprehension Passage'}</label>
              
              {qType === 'di' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Overwrite current text with a complex double header table template?")) {
                        setQPassage(DOUBLE_HEADER_TEMPLATE);
                      }
                    }}
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    ⚡ Insert Double Header Table Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Overwrite current text with a simple HTML table template?")) {
                        setQPassage(SIMPLE_HTML_TEMPLATE);
                      }
                    }}
                    style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Insert Simple HTML Table
                  </button>
                </div>
              )}
              
              <textarea 
                required 
                rows="5" 
                placeholder={qType === 'di' ? 'Paste table data or type/paste HTML table code here...' : 'Paste comprehension passage here...'}
                value={qPassage}
                onChange={(e) => setQPassage(e.target.value)}
                className="ms-input"
                style={qType === 'di' ? { fontFamily: 'monospace', fontSize: '0.8rem' } : {}}
              />

              {/* Live Preview area */}
              <div style={{ marginTop: '12px', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                    Live {qType === 'di' ? 'Table' : 'Passage'} Preview:
                  </span>
                </div>
                <div className="passage-live-preview-content" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflowX: 'auto' }}>
                  {qPassage ? renderPassageWithTable(qPassage) : <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Content is empty</span>}
                </div>
              </div>
            </div>
          )}

          {qType === 'assertion-reason' && (
            <>
              <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                <label>Assertion (A) Statement</label>
                <textarea 
                  required 
                  rows="2" 
                  placeholder="Assertion statement..."
                  value={qAssertion}
                  onChange={(e) => setQAssertion(e.target.value)}
                  className="ms-input"
                />
              </div>
              <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                <label>Reason (R) Statement</label>
                <textarea 
                  required 
                  rows="2" 
                  placeholder="Reason statement..."
                  value={qReason}
                  onChange={(e) => setQReason(e.target.value)}
                  className="ms-input"
                />
              </div>
              <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                <label>Answer Instruction / Sub-prompt</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. In the light of the above statements, choose the correct answer..."
                  value={qSubPrompt}
                  onChange={(e) => setQSubPrompt(e.target.value)}
                  className="ms-input"
                />
              </div>
            </>
          )}

          {qType === 'match-column' && (
            <div style={{ marginBottom: '12px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: '#f8fafc' }}>
              <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>List I & List II Items</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List I Subtitle (Optional)</span>
                  <input 
                    style={{ fontSize: '0.8rem', padding: '6px' }}
                    type="text"
                    placeholder="e.g. Non-probability sampling"
                    value={qList1Header}
                    onChange={(e) => setQList1Header(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List II Subtitle (Optional)</span>
                  <input 
                    style={{ fontSize: '0.8rem', padding: '6px' }}
                    type="text"
                    placeholder="e.g. Characteristic"
                    value={qList2Header}
                    onChange={(e) => setQList2Header(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List I (A, B, C, D)</span>
                  {qList1.map((item, idx) => (
                    <input 
                      key={idx}
                      style={{ fontSize: '0.8rem', padding: '6px' }}
                      type="text"
                      required
                      placeholder={`Item ${idx + 1}`}
                      value={item}
                      onChange={(e) => {
                        const next = [...qList1]
                        next[idx] = e.target.value
                        setQList1(next)
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List II (I, II, III, IV)</span>
                  {qList2.map((item, idx) => (
                    <input 
                      key={idx}
                      style={{ fontSize: '0.8rem', padding: '6px' }}
                      type="text"
                      required
                      placeholder={`Match ${idx + 1}`}
                      value={item}
                      onChange={(e) => {
                        const next = [...qList2]
                        next[idx] = e.target.value
                        setQList2(next)
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="ms-form-field" style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Answer Instruction / Sub-prompt</label>
                <input 
                  type="text" 
                  placeholder="e.g. Choose the correct answer from the options given below:"
                  value={qSubPrompt}
                  onChange={(e) => setQSubPrompt(e.target.value)}
                  className="ms-input"
                />
              </div>
            </div>
          )}

          {qType === 'multiple-statement' && (
            <div style={{ marginBottom: '12px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: '#f8fafc' }}>
              <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Statements (A, B, C, D, E)</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {qStatements.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + idx)}.</span>
                    <textarea
                      required
                      rows="1"
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                      placeholder={`Statement ${String.fromCharCode(65 + idx)}`}
                      value={item}
                      onChange={(e) => {
                        const next = [...qStatements]
                        next[idx] = e.target.value
                        setQStatements(next)
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setQStatements(prev => [...prev, ''])} style={{ padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>+ Add Statement</button>
                  {qStatements.length > 2 && (
                    <button type="button" onClick={() => setQStatements(prev => prev.slice(0, -1))} style={{ padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer', background: '#fee2e2', color: '#ef4444' }}>- Remove</button>
                  )}
                </div>
                <div className="ms-form-field" style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Answer Instruction / Sub-prompt</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Choose the correct answer from the options given below:"
                    value={qSubPrompt}
                    onChange={(e) => setQSubPrompt(e.target.value)}
                    className="ms-input"
                  />
                </div>
              </div>
            </div>
          )}

          {!question && (qType === 'comprehension' || qType === 'di') ? (
            <div className="slot-di-questions-sequence" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
                💡 Fill in the passage above, and enter the 5 questions (Q{index} to Q{index + 4}) below:
              </div>
              {slotDiQuestions.map((sq, qIdx) => (
                <div key={qIdx} style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#f8fafc' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', fontSize: '0.88rem', fontWeight: 'bold' }}>
                    Question {qIdx + 1} of 5 (Q{index + qIdx})
                  </h4>
                  <div className="ms-form-field" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Question Prompt / Text</label>
                    <textarea
                      required
                      rows="2"
                      className="ms-input"
                      placeholder={`Type question text for Q${index + qIdx}...`}
                      value={sq.text}
                      onChange={(e) => {
                        setSlotDiQuestions(prev => {
                          const next = [...prev]
                          next[qIdx] = { ...next[qIdx], text: e.target.value }
                          return next
                        })
                      }}
                    />
                  </div>

                  <div className="ms-options-grid">
                    {sq.options.map((opt, oIdx) => (
                      <div className="ms-form-field" key={oIdx}>
                        <label style={{ fontSize: '0.78rem' }}>Option {oIdx + 1}</label>
                        <input
                          type="text"
                          required
                          className="ms-input"
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            setSlotDiQuestions(prev => {
                              const next = [...prev]
                              const nextOpts = [...next[qIdx].options]
                              nextOpts[oIdx] = e.target.value
                              next[qIdx] = { ...next[qIdx], options: nextOpts }
                              return next
                            })
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="ms-form-field">
                      <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Correct Answer Option</label>
                      <select
                        className="ms-input"
                        value={sq.correct}
                        onChange={(e) => {
                          setSlotDiQuestions(prev => {
                            const next = [...prev]
                            next[qIdx] = { ...next[qIdx], correct: Number(e.target.value) }
                            return next
                          })
                        }}
                      >
                        <option value="1">Option 1</option>
                        <option value="2">Option 2</option>
                        <option value="3">Option 3</option>
                        <option value="4">Option 4</option>
                      </select>
                    </div>

                    <div className="ms-form-field">
                      <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Detailed Explanation (Optional)</label>
                      <RichExplanationEditor
                        placeholder="Explanation..."
                        value={sq.explanation || ''}
                        onChange={(val) => {
                          setSlotDiQuestions(prev => {
                            const next = [...prev]
                            next[qIdx] = { ...next[qIdx], explanation: val }
                            return next
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                <label>Question Prompt / Text</label>
                <textarea 
                  required 
                  rows="2" 
                  placeholder={qType === 'match-column' ? 'e.g. Choose the correct matching code from options below:' : 'Type the question text here...'}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="ms-input"
                />
              </div>

              <div className="options-grid" style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {qOpts.map((opt, idx) => (
                  <div className="ms-form-field" key={idx}>
                    <label>Option {idx + 1}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={qType === 'match-column' ? 'e.g. A-I, B-II, C-III, D-IV' : `Enter Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...qOpts]
                        next[idx] = e.target.value
                        setQOpts(next)
                      }}
                      className="ms-input"
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="ms-form-field">
                  <label>Correct Answer Option</label>
                  <select 
                    className="ms-input"
                    value={qCorrect}
                    onChange={(e) => setQCorrect(Number(e.target.value))}
                  >
                    <option value="1">Option 1</option>
                    <option value="2">Option 2</option>
                    <option value="3">Option 3</option>
                    <option value="4">Option 4</option>
                  </select>
                </div>
                
                {isSaved && (
                  <div className="ms-form-field" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="ms-btn ms-btn-secondary" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={handleDelete}>
                      Delete Question
                    </button>
                  </div>
                )}
              </div>

              <div className="ms-form-field" style={{ marginBottom: '16px' }}>
                <label>Detailed Explanation (Optional)</label>
                <RichExplanationEditor 
                  placeholder="Enter detailed explanation of the concept and why this option is correct"
                  value={qExplanation}
                  onChange={(val) => setQExplanation(val)}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={isSaving} className="ms-btn ms-btn-primary" style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : (!question && (qType === 'comprehension' || qType === 'di') ? `Save 5 ${qType === 'di' ? 'DI' : 'Comprehension'} Questions` : (isSaved ? 'Update Question' : 'Save to Database'))}
            </button>
            {saveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                ✓ Saved!
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

const ManageSet = () => {
  const { setId } = useParams()
  const navigate = useNavigate()
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [pyqSets, setPyqSets] = useState([])
  const [mathHelperOpen, setMathHelperOpen] = useState(false)
  
  const [newSetPaperType, setNewSetPaperType] = useState('Paper I')
  const [newSetYear, setNewSetYear] = useState('')
  const [newSetSubtitle, setNewSetSubtitle] = useState('')
  const [newSetCount, setNewSetCount] = useState(50)
  const [newSetIsPublished, setNewSetIsPublished] = useState(false)
  
  const [editingSetId, setEditingSetId] = useState(null)
  const [editingSetQuestions, setEditingSetQuestions] = useState([])
  
  const [selectedSetId, setSelectedSetId] = useState('')
  const [importMode, setImportMode] = useState('single')
  const [rawImportText, setRawImportText] = useState('')
  
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [newQType, setNewQType] = useState('mcq')
  const [newQUnit, setNewQUnit] = useState('Unit 1: Teaching Aptitude')
  const [newQText, setNewQText] = useState('')
  const [newQOpts, setNewQOpts] = useState(['', '', '', ''])
  const [newQCorrect, setNewQCorrect] = useState(1)
  const [newQExplanation, setNewQExplanation] = useState('')
  const [newQAssertion, setNewQAssertion] = useState('')
  const [newQReason, setNewQReason] = useState('')
  const [newQList1, setNewQList1] = useState(['', '', '', ''])
  const [newQList2, setNewQList2] = useState(['', '', '', ''])
  const [newQList1Header, setNewQList1Header] = useState('')
  const [newQList2Header, setNewQList2Header] = useState('')
  const [newQPassage, setNewQPassage] = useState('')
  const [newQStatements, setNewQStatements] = useState(['', '', '', '', ''])
  const [newQSubPrompt, setNewQSubPrompt] = useState('Choose the correct answer from the options given below:')
  const [diMode, setDiMode] = useState('visual')
  const [diTable, setDiTable] = useState([
    ['Year', 'Product A', 'Product B'],
    ['2021', '', ''],
    ['2022', '', '']
  ])
  const [diQuestions, setDiQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
    { text: '', options: ['', '', '', ''], correct: 1, explanation: '' }
  ])

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role !== 'admin') {
      navigate('/profile')
      return
    }
    setIsAdmin(true)
    
    fetch(`${API_BASE_URL}/api/pyqsets?admin=true`)
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
            setNewSetIsPublished(target.isPublished || false)
            loadQuestionsForSet(setId)
          }
        } else {
          setEditingSetId(null)
          setSelectedSetId('')
          setNewSetPaperType('Paper I')
          setNewSetYear('')
          setNewSetSubtitle('')
          setNewSetCount(50)
          setNewSetIsPublished(false)
          setEditingSetQuestions([])
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
    setNewQList1Header(q.list1Header || '')
    setNewQList2Header(q.list2Header || '')
    setNewQPassage(q.passage || '')
    setNewQStatements(q.statements || ['', '', '', '', ''])
    setNewQSubPrompt(q.subPrompt || 'Choose the correct answer from the options given below:')
    
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
    setNewQList1Header('')
    setNewQList2Header('')
    setNewQPassage('')
    setNewQStatements(['', '', '', '', ''])
    setNewQSubPrompt('Choose the correct answer from the options given below:')
    setDiMode('visual')
    setDiTable([
      ['Year', 'Product A', 'Product B'],
      ['2021', '', ''],
      ['2022', '', '']
    ])
    setDiQuestions([
      { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
      { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
      { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
      { text: '', options: ['', '', '', ''], correct: 1, explanation: '' },
      { text: '', options: ['', '', '', ''], correct: 1, explanation: '' }
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

    try {
      if (editingSetId) {
        const updatePayload = {
          title,
          subtitle: finalSubtitle,
          paperType: newSetPaperType,
          year: newSetYear,
          questionsCount: Number(newSetCount),
          isPublished: newSetIsPublished
        }
        const res = await fetch(`${API_BASE_URL}/api/pyqsets/${editingSetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        })
        const updatedSet = await res.json()
        setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? updatedSet : s))
        alert('Successfully updated PYQ Set details!')
        return
      }

      const createPayload = {
        title,
        subtitle: finalSubtitle,
        paperType: newSetPaperType,
        year: newSetYear,
        questionsCount: Number(newSetCount),
        questionsLoaded: 0,
        isPublished: newSetIsPublished
      }

      const res = await fetch(`${API_BASE_URL}/api/pyqsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload)
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

    // Handle bulk DI & Comprehension question creation
    if ((newQType === 'di' || newQType === 'comprehension') && !editingQuestionId) {
      if (!newQPassage.trim()) {
        alert(`Please fill in the ${newQType === 'di' ? 'table data / passage' : 'comprehension passage'}.`)
        return
      }
      for (let i = 0; i < diQuestions.length; i++) {
        const dq = diQuestions[i]
        if (!dq.text.trim() || dq.options.some(o => !o.trim())) {
          alert(`Please fill in the question text and all 4 options for Question ${i + 1}.`)
          return
        }
      }

      const targetSet = pyqSets.find(s => s.id === selectedSetId)
      if (!targetSet) {
        alert('Error: Please select a valid PYQ Set first.')
        return
      }

      const questions = diQuestions.map(dq => ({
        type: newQType,
        unit: dq.unit || newQUnit || (newQType === 'di' ? 'Unit 7: Data Interpretation' : 'Unit 3: Comprehension'),
        text: dq.text,
        options: dq.options,
        correct: dq.correct,
        passage: newQPassage,
        explanation: dq.explanation
      }))

      try {
        const res = await fetch(`${API_BASE_URL}/api/questions/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId: selectedSetId, questions })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message)

        setPyqSets(prev => prev.map(s => {
          if (s.id === selectedSetId) {
            return { ...s, questionsLoaded: data.updatedSet.questionsLoaded }
          }
          return s
        }))
        
        if (editingSetId === selectedSetId && typeof loadQuestionsForSet === 'function') {
          loadQuestionsForSet(selectedSetId)
        }

        alert(`Successfully added 5 ${newQType === 'di' ? 'Data Interpretation' : 'Comprehension'} questions to:\n"${targetSet.title || 'Selected Set'}"!\nTotal loaded now: ${data.updatedSet.questionsLoaded} Qs.`)
        cancelEditQuestion()
      } catch (err) {
        console.error(err)
        alert('Failed to save questions to database')
      }
      return
    }
    
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
    } else if (newQType === 'comprehension' || (newQType === 'di' && editingQuestionId)) {
      if (!newQPassage.trim() || !newQText.trim() || newQOpts.some(o => !o.trim())) {
        alert('Please fill in the passage/table data, specific question prompt, and options.')
        return
      }
    } else if (newQType === 'multiple-statement') {
      const filledStatements = newQStatements.filter(s => s.trim() !== '')
      if (!newQText.trim() || filledStatements.length < 2 || newQOpts.some(o => !o.trim())) {
        alert('Please fill in the question text, at least 2 statements, and all options.')
        return
      }
    }

    const targetSet = pyqSets.find(s => s.id === selectedSetId)
    if (!targetSet) {
      alert('Error: Please select a valid PYQ Set first.')
      return
    }

    const getFirstEmptySlotIndex = (questions, paperType, maxCount) => {
      const limit = maxCount || (paperType === 'Paper I' ? 50 : 100)
      const existingIndices = new Set(questions.map(q => q.qIndex).filter(Boolean))
      for (let i = 1; i <= limit; i++) {
        if (!existingIndices.has(i)) {
          return i
        }
      }
      return limit + 1
    }

    const qIndex = getFirstEmptySlotIndex(editingSetQuestions, newSetPaperType, newSetCount)

    const questionPayload = {
      setId: selectedSetId,
      type: newQType,
      unit: newQUnit,
      qIndex,
      text: newQText,
      options: newQOpts,
      correct: newQCorrect,
      assertion: newQAssertion,
      reason: newQReason,
      passage: newQPassage,
      statements: newQStatements.filter(s => s.trim() !== ''),
      subPrompt: newQSubPrompt,
      explanation: newQExplanation,
      list1: newQList1,
      list2: newQList2,
      list1Header: newQList1Header,
      list2Header: newQList2Header
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
          list1Header: '',
          list2Header: '',
          statements: [],
          passage: sharedPassage || ''
        }
        currentSection = 'text'
        continue
      }

      if (!currentQ) continue

      // Detect section headers
      const list1Match = line.match(/^list\s*[-–]?\s*i\b[\s\:\-\(\[\]\)]*(.*)/i)
      if (list1Match && !/^list\s*[-–]?\s*ii\b/i.test(line)) {
        currentQ.type = 'match-column'
        currentSection = 'list1'
        currentQ.text += (currentQ.text ? '\n' : '') + line
        const subtitle = list1Match[1].trim().replace(/^[\(\[\]\)]+|[\(\[\]\)]+$/g, '')
        if (subtitle) {
          currentQ.list1Header = subtitle
        }
        continue
      }
      const list2Match = line.match(/^list\s*[-–]?\s*ii\b[\s\:\-\(\[\]\)]*(.*)/i)
      if (list2Match) {
        currentQ.type = 'match-column'
        currentSection = 'list2'
        currentQ.text += (currentQ.text ? '\n' : '') + line
        const subtitle = list2Match[1].trim().replace(/^[\(\[\]\)]+|[\(\[\]\)]+$/g, '')
        if (subtitle) {
          currentQ.list2Header = subtitle
        }
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

      // Escape hatch for Match the Column or Assertion & Reasoning options if user forgot "Options:"
      if (['assertion', 'reason', 'list1', 'list2'].includes(currentSection)) {
        const optNumMatch = line.match(/^[\(\[]?([1-4])[\)\]]?[\.\:\-\,\，\s]\s*(.*)/i)
        if (optNumMatch) {
          currentSection = 'options'
          currentQ.options[Number(optNumMatch[1]) - 1] = optNumMatch[2].trim()
          continue
        }
      }

      // Append to current section
      if (currentSection === 'list1') {
        if (/^[\(\[]?[a-eA-E][\)\]\.\:\-\,\，\s]/i.test(line)) {
          currentQ.list1.push(line)
        } else if (!currentQ.list1Header && currentQ.list1.length === 0) {
          currentQ.list1Header = line
        } else {
          currentQ.list1.push(line)
        }
      } else if (currentSection === 'list2') {
        if (/^[\(\[]?([ivxIVX]+|\d+)[\)\]\.\:\-\,\，\s]/i.test(line)) {
          currentQ.list2.push(line)
        } else if (!currentQ.list2Header && currentQ.list2.length === 0) {
          currentQ.list2Header = line
        } else {
          currentQ.list2.push(line)
        }
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
      const getFirstEmptySlotIndex = (questions, paperType, maxCount) => {
        const limit = maxCount || (paperType === 'Paper I' ? 50 : 100)
        const existingIndices = new Set(questions.map(q => q.qIndex).filter(Boolean))
        for (let i = 1; i <= limit; i++) {
          if (!existingIndices.has(i)) {
            return i
          }
        }
        return limit + 1
      }

      let tempQuestions = [...editingSetQuestions]
      const questionsWithIndex = parsedQuestions.map((q) => {
        const qIndex = getFirstEmptySlotIndex(tempQuestions, targetSet.paperType, targetSet.questionsCount)
        const updatedQ = { ...q, qIndex }
        tempQuestions.push(updatedQ)
        return updatedQ
      })

      const res = await fetch(`${API_BASE_URL}/api/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: selectedSetId, questions: questionsWithIndex })
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
      <option key={s.id} value={s.id}>{s.title} {s.isPublished ? '(Published)' : '(Draft)'}</option>
    ))}
  </select>
      </div>
    )}

     <div className="ms-form-field" style={{ marginBottom: '12px' }}>
  <label>Question Formatting Type</label>
  <select 
    className="ms-input"
    value={newQType}
    onChange={(e) => {
      const type = e.target.value
      setNewQType(type)
      if (type === 'assertion-reason') {
        setNewQSubPrompt('In the light of the above statements, choose the correct answer from the options given below')
      } else if (type === 'match-column' || type === 'multiple-statement') {
        setNewQSubPrompt('Choose the correct answer from the options given below:')
      }
      if (type === 'di') setNewQUnit('Unit 7: Data Interpretation')
      if (type === 'comprehension') setNewQUnit('Unit 3: Comprehension')
    }}
  >
    <option value="mcq">Normal MCQ</option>
    <option value="assertion-reason">Assertion & Reasoning</option>
    <option value="match-column">Match the Column</option>
    <option value="comprehension">Comprehension / Passage</option>
    <option value="di">Data Interpretation / Table Data</option>
    <option value="multiple-statement">Multiple Statements</option>
  </select>
</div>

<div className="ms-form-field" style={{ marginBottom: '12px' }}>
  <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Syllabus Unit (Paper I)</label>
  <select 
    className="ms-input"
    value={newQUnit}
    onChange={(e) => setNewQUnit(e.target.value)}
  >
    {PAPER1_UNITS.map(u => (
      <option key={u} value={u}>{u}</option>
    ))}
  </select>
</div>

{/* DYNAMIC FIELD PANEL: COMPREHENSION PASSAGE / DI TABLE DATA */}
{(newQType === 'comprehension' || newQType === 'di') && (
  <div className="form-field full-width" style={{ marginBottom: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <label style={{ margin: 0 }}>{newQType === 'di' ? 'Table Data / Passage' : 'Comprehension Passage'}</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {newQType === 'comprehension' && (
          <button
            type="button"
            onClick={() => setNewQPassage(cleanPassageText(newQPassage))}
            style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
            title="Clean up broken PDF line breaks into smooth continuous paragraphs"
          >
            ✨ Auto-Fix PDF Line Breaks
          </button>
        )}
        {newQType === 'di' && (
          <>
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
          </>
        )}
      </div>
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
    <div className="form-field full-width" style={{ marginBottom: '12px' }}>
      <label>Answer Instruction / Sub-prompt</label>
      <input 
        type="text" 
        required 
        placeholder="e.g. In the light of the above statements, choose the correct answer..."
        value={newQSubPrompt}
        onChange={(e) => setNewQSubPrompt(e.target.value)}
        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', boxSizing: 'border-box', fontSize: '0.85rem' }}
      />
    </div>
  </>
)}

{/* DYNAMIC FIELD PANEL: MATCH THE COLUMN */}
{newQType === 'match-column' && (
  <div style={{ marginBottom: '12px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: 'var(--bg-card)' }}>
    <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>List I & List II Items</strong>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List I Subtitle (Optional)</span>
        <input 
          style={{ fontSize: '0.8rem', padding: '6px' }}
          type="text"
          placeholder="e.g. Non-probability sampling"
          value={newQList1Header}
          onChange={(e) => setNewQList1Header(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>List II Subtitle (Optional)</span>
        <input 
          style={{ fontSize: '0.8rem', padding: '6px' }}
          type="text"
          placeholder="e.g. Characteristic"
          value={newQList2Header}
          onChange={(e) => setNewQList2Header(e.target.value)}
        />
      </div>
    </div>
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
    <div className="ms-form-field" style={{ marginTop: '12px' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Answer Instruction / Sub-prompt</label>
      <input 
        type="text" 
        placeholder="e.g. Choose the correct answer from the options given below:"
        value={newQSubPrompt}
        onChange={(e) => setNewQSubPrompt(e.target.value)}
        className="ms-input"
      />
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
      <div className="ms-form-field" style={{ marginTop: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Answer Instruction / Sub-prompt</label>
        <input 
          type="text" 
          required 
          placeholder="e.g. Choose the correct answer from the options given below:"
          value={newQSubPrompt}
          onChange={(e) => setNewQSubPrompt(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', boxSizing: 'border-box', fontSize: '0.85rem' }}
        />
      </div>
    </div>
  </div>
)}

{/* 5 DI OR COMPREHENSION QUESTIONS SEQUENCE OR SINGLE QUESTION FIELDS */}
{(newQType === 'di' || newQType === 'comprehension') && !editingQuestionId ? (
  <div className="di-questions-sequence" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
    {diQuestions.map((dq, qIdx) => (
      <div key={qIdx} style={{ border: '1px solid var(--border)', padding: '15px', borderRadius: '8px', background: 'var(--bg-card)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Question {qIdx + 1} of 5
        </h4>
        
        {/* Question Text */}
        <div className="form-field full-width" style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Question Prompt / Text</label>
          <textarea 
            required 
            rows="2" 
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', boxSizing: 'border-box', fontSize: '0.85rem' }}
            placeholder={`Type question ${qIdx + 1} text here...`}
            value={dq.text}
            onChange={(e) => {
              setDiQuestions(prev => {
                const next = [...prev]
                next[qIdx] = { ...next[qIdx], text: e.target.value }
                return next
              })
            }}
          ></textarea>
        </div>

        {/* Options */}
        <div className="options-grid" style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {dq.options.map((opt, oIdx) => (
            <div className="ms-form-field" key={oIdx}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Option {oIdx + 1}</label>
              <input 
                type="text" 
                required 
                placeholder={`Enter Option ${oIdx + 1}`}
                value={opt}
                onChange={(e) => {
                  setDiQuestions(prev => {
                    const next = [...prev]
                    const nextOpts = [...next[qIdx].options]
                    nextOpts[oIdx] = e.target.value
                    next[qIdx] = { ...next[qIdx], options: nextOpts }
                    return next
                  })
                }}
              />
            </div>
          ))}
        </div>

        {/* Correct answer and explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="ms-form-field">
            <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Correct Answer Option</label>
            <select 
              className="ms-input"
              value={dq.correct}
              onChange={(e) => {
                setDiQuestions(prev => {
                  const next = [...prev]
                  next[qIdx] = { ...next[qIdx], correct: Number(e.target.value) }
                  return next
                })
              }}
            >
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
              <option value="4">Option 4</option>
            </select>
          </div>
          <div className="ms-form-field">
            <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Detailed Explanation (Optional)</label>
            <RichExplanationEditor 
              placeholder="Explanation..."
              value={dq.explanation || ''}
              onChange={(val) => {
                setDiQuestions(prev => {
                  const next = [...prev]
                  next[qIdx] = { ...next[qIdx], explanation: val }
                  return next
                })
              }}
            />
          </div>
        </div>
      </div>
    ))}
  </div>
) : (
  <>
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
      <RichExplanationEditor 
        placeholder="Enter detailed explanation of the concept and why this option is correct"
        value={newQExplanation}
        onChange={(val) => setNewQExplanation(val)}
      />
    </div>
  </>
)}

<button type="submit" className="ms-btn ms-btn-primary" style={{ width: '100%' }}>
  {editingQuestionId ? 'Update Question' : ((newQType === 'di' || newQType === 'comprehension') ? `Add 5 ${newQType === 'di' ? 'DI' : 'Comprehension'} Questions to Selected Set` : 'Add Question to Selected Set')}
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
        <h1>{setId ? `Manage Exam Set #${setId}` : 'Manage Exam Sets'}</h1>
        <p>{setId ? 'Edit set details and manage questions' : 'Select or create a set to manage questions'}</p>
        <button className="btn-back" onClick={() => navigate('/profile')}>&larr; Back to Profile</button>
      </div>
      <div className="manage-set-layout">
        <div className="manage-set-left">
                  {/* SET SELECTOR DROPDOWN */}
                  <div className="ms-card" style={{ marginBottom: '12px' }}>
                    <h3>Select PYQ Set to Manage</h3>
                    <div className="ms-form-field">
                      <select
                        className="ms-input"
                        value={selectedSetId}
                        onChange={(e) => {
                          const val = e.target.value
                          setSelectedSetId(val)
                          if (val) {
                            navigate(`/admin/manage-set/${val}`)
                          } else {
                            navigate('/admin/manage-set')
                          }
                        }}
                      >
                        <option value="">-- Create New Set --</option>
                        {pyqSets.map(s => (
                          <option key={s.id || s._id} value={s.id || s._id}>
                            {s.title} ({s.questionsLoaded || 0} / {s.questionsCount || 100} Qs)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 4.2 CREATE / EDIT PYQ SET FORM */}
                  <form className="ms-card" onSubmit={handleCreateSet}>
                    <h3>{editingSetId ? `Edit PYQ Set #${editingSetId}` : 'Create New PYQ Year-Wise Set'}</h3>
                    <div className="ms-form-field" style={{ marginBottom: '12px' }}>
                      <label>Paper Type</label>
                      <select 
                        className="ms-input"
                        value={newSetPaperType}
                        onChange={(e) => {
                          const val = e.target.value
                          setNewSetPaperType(val)
                          setNewSetCount(val === 'Paper I' ? 50 : 100)
                        }}
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

                    <div className="ms-form-field" style={{ marginBottom: '12px' }}>
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

                    <div className="ms-form-field-checkbox" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="publishSetManage"
                        checked={newSetIsPublished}
                        onChange={(e) => setNewSetIsPublished(e.target.checked)}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      <label htmlFor="publishSetManage" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        Publish this set (make it visible to users)
                      </label>
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
                      <h3>
                        Manage Questions ({editingSetQuestions?.length || 0} / {newSetCount || (newSetPaperType === 'Paper I' ? 50 : 100)})
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0284c7', marginLeft: '10px', fontSize: '0.85rem' }}>
                          {newSetPaperType}
                        </span>
                      </h3>
                      
                      <div className="ms-questions-slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                        {newSetPaperType === 'Paper I' ? (
                          <>
                            <DataInterpretationGroup
                              editingSetQuestions={editingSetQuestions}
                              setId={editingSetId}
                              API_BASE_URL={API_BASE_URL}
                              onSave={(savedQs, updatedSet) => {
                                setEditingSetQuestions(prev => {
                                  const next = [...prev]
                                  savedQs.forEach(savedQ => {
                                    const idx = next.findIndex(q => (q.id || q._id) === (savedQ.id || savedQ._id) || q.qIndex === savedQ.qIndex)
                                    if (idx >= 0) {
                                      next[idx] = savedQ
                                    } else {
                                      next.push(savedQ)
                                    }
                                  })
                                  return next
                                })
                                if (updatedSet) {
                                  setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                }
                              }}
                              onDeleteGroup={(deletedIds, updatedSet) => {
                                setEditingSetQuestions(prev => prev.filter(q => !deletedIds.includes(q.id || q._id)))
                                if (updatedSet) {
                                  setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                }
                              }}
                            />
                            {Array.from({ length: 40 }).map((_, idx) => {
                              const qIndex = idx + 6
                              const question = editingSetQuestions.find(q => q.qIndex === qIndex)
                              return (
                                <QuestionSlot
                                  key={qIndex}
                                  index={qIndex}
                                  question={question}
                                  setId={editingSetId}
                                  API_BASE_URL={API_BASE_URL}
                                  onSave={(savedQ, updatedSet) => {
                                    setEditingSetQuestions(prev => {
                                      const exists = prev.some(q => (q.id || q._id) === (savedQ.id || savedQ._id))
                                      if (exists) {
                                        return prev.map(q => (q.id || q._id) === (savedQ.id || savedQ._id) ? savedQ : q)
                                      } else {
                                        return [...prev, savedQ]
                                      }
                                    })
                                    if (updatedSet) {
                                      setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                    }
                                  }}
                                  onDelete={(deletedId, updatedSet) => {
                                    setEditingSetQuestions(prev => prev.filter(q => (q.id || q._id) !== deletedId))
                                    if (updatedSet) {
                                      setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                    }
                                  }}
                                />
                              )
                            })}

                            <ReadingComprehensionGroup
                              editingSetQuestions={editingSetQuestions}
                              setId={editingSetId}
                              API_BASE_URL={API_BASE_URL}
                              onSave={(savedQs, updatedSet) => {
                                setEditingSetQuestions(prev => {
                                  const next = [...prev]
                                  savedQs.forEach(savedQ => {
                                    const idx = next.findIndex(q => (q.id || q._id) === (savedQ.id || savedQ._id) || q.qIndex === savedQ.qIndex)
                                    if (idx >= 0) {
                                      next[idx] = savedQ
                                    } else {
                                      next.push(savedQ)
                                    }
                                  })
                                  return next
                                })
                                if (updatedSet) {
                                  setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                }
                              }}
                              onDeleteGroup={(deletedIds, updatedSet) => {
                                setEditingSetQuestions(prev => prev.filter(q => !deletedIds.includes(q.id || q._id)))
                                if (updatedSet) {
                                  setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                }
                              }}
                            />
                          </>
                        ) : (
                          Array.from({ length: newSetCount || 100 }).map((_, idx) => {
                            const qIndex = idx + 1
                            const question = editingSetQuestions.find(q => q.qIndex === qIndex)
                            return (
                              <QuestionSlot
                                key={qIndex}
                                index={qIndex}
                                question={question}
                                setId={editingSetId}
                                API_BASE_URL={API_BASE_URL}
                                onSave={(savedQ, updatedSet) => {
                                  setEditingSetQuestions(prev => {
                                    const exists = prev.some(q => (q.id || q._id) === (savedQ.id || savedQ._id))
                                    if (exists) {
                                      return prev.map(q => (q.id || q._id) === (savedQ.id || savedQ._id) ? savedQ : q)
                                    } else {
                                      return [...prev, savedQ]
                                    }
                                  })
                                  if (updatedSet) {
                                    setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                  }
                                }}
                                onDelete={(deletedId, updatedSet) => {
                                  setEditingSetQuestions(prev => prev.filter(q => (q.id || q._id) !== deletedId))
                                  if (updatedSet) {
                                    setPyqSets(prev => prev.map(s => (s.id || s._id) === editingSetId ? { ...s, questionsLoaded: updatedSet.questionsLoaded } : s))
                                  }
                                }}
                              />
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
        </div>
      </div>

      {/* Floating Math Fraction Builder Widget */}
      {editingSetId && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000 }}>
          {/* Floating Trigger Button */}
          <button
            type="button"
            onClick={() => setMathHelperOpen(!mathHelperOpen)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '28px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            title="Toggle Math Fraction Helper"
          >
            {mathHelperOpen ? '✕' : '🧮'}
          </button>

          {/* Floating Fraction Helper Box */}
          {mathHelperOpen && (
            <div 
              style={{
                position: 'absolute',
                bottom: '70px',
                right: '0',
                width: '320px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                boxSizing: 'border-box'
              }}
            >
              <MathHelperWidget onClose={() => setMathHelperOpen(false)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ManageSet
