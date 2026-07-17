const fs = require('fs');

const content = fs.readFileSync('client/src/pages/Profile.jsx', 'utf8');

const getBlock = (startRegex, endRegex) => {
  const lines = content.split('\n');
  let start = -1;
  let end = -1;
  let blockCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (start === -1 && startRegex.test(lines[i])) {
      start = i;
    }
    if (start !== -1) {
      if (lines[i].includes('{')) blockCount += (lines[i].match(/\{/g) || []).length;
      if (lines[i].includes('}')) blockCount -= (lines[i].match(/\}/g) || []).length;
      if (endRegex) {
        if (endRegex.test(lines[i])) end = i;
      } else {
        if (blockCount === 0) {
          end = i;
          break;
        }
      }
    }
  }
  return start !== -1 && end !== -1 ? lines.slice(start, end + 1).join('\n') : '';
};

// Functions to extract
const loadQuestionsFunc = getBlock(/const loadQuestionsForSet =/);
const deleteQuestionFunc = getBlock(/const handleDeleteQuestion =/);
const handleCreateSetFunc = getBlock(/const handleCreateSet =/);
const handleOptChangeFunc = getBlock(/const handleOptChange =/);
const handleList1ChangeFunc = getBlock(/const handleList1Change =/);
const handleList2ChangeFunc = getBlock(/const handleList2Change =/);
const handleCreateQuestionFunc = getBlock(/const handleCreateQuestion =/);
const handleBulkImportFunc = getBlock(/const handleBulkImport =/);

// Extract the JSX block for creator-grid
const startIndex = content.indexOf('<div className="creator-grid">');
let endIndex = startIndex;
let divCount = 0;
let started = false;

for (let i = startIndex; i < content.length; i++) {
  if (content.substr(i, 4) === '<div') {
    divCount++;
    started = true;
  }
  if (content.substr(i, 5) === '</div') {
    divCount--;
  }
  if (started && divCount === 0) {
    endIndex = i + 6;
    break;
  }
}
const creatorGridJsx = content.substring(startIndex, endIndex);

const manageSetContent = `import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import './Profile.css'

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
  
  const [newQType, setNewQType] = useState('mcq')
  const [newQText, setNewQText] = useState('')
  const [newQOpts, setNewQOpts] = useState(['', '', '', ''])
  const [newQCorrect, setNewQCorrect] = useState(1)
  const [newQAssertion, setNewQAssertion] = useState('')
  const [newQReason, setNewQReason] = useState('')
  const [newQList1, setNewQList1] = useState(['', '', '', ''])
  const [newQList2, setNewQList2] = useState(['', '', '', ''])
  const [newQPassage, setNewQPassage] = useState('')

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role !== 'admin') {
      navigate('/profile')
      return
    }
    setIsAdmin(true)
    
    fetch('http://localhost:5000/api/pyqsets')
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

${loadQuestionsFunc}
${deleteQuestionFunc}
${handleCreateSetFunc}
${handleOptChangeFunc}
${handleList1ChangeFunc}
${handleList2ChangeFunc}
${handleCreateQuestionFunc}
${handleBulkImportFunc}

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Manage Exam Set #{setId}</h1>
        <p>Edit set details and manage questions</p>
        <button className="pane-btn" onClick={() => navigate('/profile')} style={{ marginTop: '15px' }}>&larr; Back to Profile</button>
      </div>
      <div className="profile-content">
        ${creatorGridJsx.replace(/<div className="creator-grid">/, '<div className="creator-grid" style={{ display: "block" }}>')}
      </div>
    </div>
  )
}

export default ManageSet
`;

fs.writeFileSync('client/src/pages/ManageSet.jsx', manageSetContent);
console.log('ManageSet.jsx created successfully!');
