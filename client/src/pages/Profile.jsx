import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './Profile.css'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'

const Profile = () => {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('aspirant@ugcfreepaper.com')
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    const validTabs = ['settings', 'notes', 'users', 'pyq', 'traffic', 'messages']
    return validTabs.includes(hash) ? hash : 'settings'
  })

  // Databases in state (loaded from MongoDB)
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    adsenseEnabled: true,
    passPercentage: 40,
    timerDuration: 120 // minutes
  })

  const [notes, setNotes] = useState([])

  const [users, setUsers] = useState([])

  const [pyqSets, setPyqSets] = useState([])
  const [messages, setMessages] = useState([])

  // Blog states
  const [adminPosts, setAdminPosts] = useState([])
  const [blogId, setBlogId] = useState(null)
  const [blogTitle, setBlogTitle] = useState('')
  const [blogCategory, setBlogCategory] = useState('Strategy')
  const [blogAuthor, setBlogAuthor] = useState('')
  const [blogReadTime, setBlogReadTime] = useState('5 min read')
  const [blogExcerpt, setBlogExcerpt] = useState('')
  const [blogContent, setBlogContent] = useState('')
  const [blogIsFeatured, setBlogIsFeatured] = useState(false)
  const [isBlogFormOpen, setIsBlogFormOpen] = useState(false)

  // Form states
  const [newNoteTitle, setNewNoteTitle] = useState('')

  // New PYQ Set Form states
  const [newSetPaperType, setNewSetPaperType] = useState('Paper I')
  const [newSetYear, setNewSetYear] = useState('')
  const [newSetSubtitle, setNewSetSubtitle] = useState('')
  const [newSetCount, setNewSetCount] = useState(100)
  const [newSetIsPublished, setNewSetIsPublished] = useState(false)
  const [editingSetId, setEditingSetId] = useState(null)
  const [editingSetQuestions, setEditingSetQuestions] = useState([])

  useEffect(() => {
    window.location.hash = activeTab
  }, [activeTab])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      const validTabs = ['settings', 'notes', 'users', 'pyq', 'messages', 'blogs']
      if (validTabs.includes(hash)) {
        setActiveTab(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    const url = role === 'admin'
      ? `${API_BASE_URL}/api/pyqsets?admin=true`
      : `${API_BASE_URL}/api/pyqsets`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPyqSets(data)
      })
      .catch(err => console.error('Failed to fetch pyq sets:', err))
  }, [])

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role === 'admin') {
      // 1. Fetch settings
      fetch(`${API_BASE_URL}/api/settings`)
        .then(res => res.json())
        .then(data => {
          if (data) setSettings(data);
        })
        .catch(err => console.error('Failed to fetch settings:', err));

      // 2. Fetch notes
      fetch(`${API_BASE_URL}/api/notes`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setNotes(data);
        })
        .catch(err => console.error('Failed to fetch notes:', err));

      // 3. Fetch users
      fetch(`${API_BASE_URL}/api/users`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch(err => console.error('Failed to fetch users:', err));

      // 5. Fetch contact messages
      fetch(`${API_BASE_URL}/api/contact`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(err => console.error('Failed to fetch contact messages:', err));

      // 6. Fetch blog posts
      fetch(`${API_BASE_URL}/api/posts`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAdminPosts(data);
        })
        .catch(err => console.error('Failed to fetch admin blog posts:', err));
    }
  }, [isAdmin])



  // New Question Form states
  const [selectedSetId, setSelectedSetId] = useState('')
  const [importMode, setImportMode] = useState('single') // 'single', 'bulk'

  useEffect(() => {
    if (pyqSets.length > 0 && !pyqSets.find(s => s.id === selectedSetId)) {
      setSelectedSetId(pyqSets[0].id)
    }
  }, [pyqSets, selectedSetId])
  const [rawImportText, setRawImportText] = useState('')
  const [newQType, setNewQType] = useState('mcq') // 'mcq', 'assertion-reason', 'match-column', 'comprehension'
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
  const [newQStatements, setNewQStatements] = useState(['', '', ''])
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

  // Student Dashboard states
  const [studentTab, setStudentTab] = useState('overview') // 'overview', 'syllabus', 'practice', 'analytics'
  const [studentStats, setStudentStats] = useState({
    prepScore: 0,
    streak: 0,
    hoursStudied: 0,
    testsAttempted: 0,
    testsPassed: 0,
    testsFailed: 0
  })
  const [analyticsData, setAnalyticsData] = useState({
    unitAccuracies: [
      { key: 'Unit 1', name: 'Teaching Aptitude', accuracy: 0, color: '#16a34a', advice: 'reviewing pedagogical theories and active learning models' },
      { key: 'Unit 2', name: 'Research Aptitude', accuracy: 0, color: '#2563eb', advice: 'understanding research design variables and referencing styles' },
      { key: 'Unit 3', name: 'Comprehension', accuracy: 0, color: '#8b5cf6', advice: 'practicing speed reading and context vocabulary drills' },
      { key: 'Unit 4', name: 'Communication', accuracy: 0, color: '#ec4899', advice: 'studying barrier types and models of interpersonal communication' },
      { key: 'Unit 5', name: 'Mathematical Reasoning', accuracy: 0, color: '#06b6d4', advice: 'working on percentage equations, coding series, and speed math' },
      { key: 'Unit 6', name: 'Logical Reasoning', accuracy: 0, color: '#d97706', advice: 'practicing Indian logic (Pramanas) and syllogism diagrams' },
      { key: 'Unit 7', name: 'Data Interpretation', accuracy: 0, color: '#dc2626', advice: 'reviewing visual chart notes and practicing shift-wise DI worksheets' },
      { key: 'Unit 8', name: 'Information & Communication Tech (ICT)', accuracy: 0, color: '#14b8a6', advice: 'reviewing computer networks, storage types, and internet abbreviations' },
      { key: 'Unit 9', name: 'People & Environment', accuracy: 0, color: '#84cc16', advice: 'reading environmental protocols, pollutants, and energy resource quotas' },
      { key: 'Unit 10', name: 'Higher Education System', accuracy: 0, color: '#6b7280', advice: 'reviewing ancient learning institutions and modern regulatory policies (NEP)' }
    ],
    lowestUnitName: 'Data Interpretation',
    lowestUnitAcc: 0,
    lowestUnitAdvice: 'reviewing visual chart notes and practicing shift-wise DI worksheets',
    hasAttempts: false
  })

  const [studentUnits, setStudentUnits] = useState([
    { id: 1, title: 'Unit 1: Teaching Aptitude Notes', progress: 90 },
    { id: 2, title: 'Unit 2: Research Aptitude Notes', progress: 60 },
    { id: 3, title: 'Unit 3: Comprehension Notes', progress: 0 },
    { id: 4, title: 'Unit 4: Communication Notes', progress: 80 },
    { id: 5, title: 'Unit 5: Mathematical Reasoning and Aptitude Notes', progress: 30 },
    { id: 6, title: 'Unit 6: Logical Reasoning Notes', progress: 50 },
    { id: 7, title: 'Unit 7: Data Interpretation Notes', progress: 20 },
    { id: 8, title: 'Unit 8: Information and Communication Technology (ICT) Notes', progress: 100 },
    { id: 9, title: 'Unit 9: People, Development and Environment Notes', progress: 10 },
    { id: 10, title: 'Unit 10: Higher Education System Notes', progress: 0 }
  ])

  const [studentPYQs, setStudentPYQs] = useState([
    { id: '1', title: 'UGC NET Paper I General (2023 Shift 1)', status: 'Completed', score: '42/50', timeSpent: '48 mins' },
    { id: '2', title: 'UGC NET Paper II Sociology (2022 June)', status: 'Completed', score: '78/100', timeSpent: '84 mins' },
    { id: '3', title: 'UGC NET Paper I General (2022 Shift 2)', status: 'In Progress', progress: '18/50 Qs', timeLeft: '32 mins' },
    { id: '4', title: 'UGC NET Paper II Sociology (2021)', status: 'Not Started' },
    { id: '5', title: 'UGC NET Paper I General (2021)', status: 'Not Started' }
  ])



  const handleToggleUnitProgress = async (id) => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: id })
      })
      const user = await res.json()
      if (user) {
        const dbProgress = user.progress || []
        setStudentUnits(prev => prev.map(unit => ({
          ...unit,
          progress: dbProgress.includes(unit.id) ? 100 : 0
        })))
      }
    } catch (err) {
      console.error('Failed to toggle unit progress:', err)
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    if (!loggedIn) {
      navigate('/signin')
      return
    }
    
    const role = localStorage.getItem('userRole')
    const admin = role === 'admin'
    setIsAdmin(admin)
    
    // Redirect non-admins trying to access /admin directly
    if (window.location.pathname.startsWith('/admin') && !admin) {
      navigate('/profile')
      return
    }
    
    const email = localStorage.getItem('userEmail')
    const id = localStorage.getItem('userId')
    if (email) setUserEmail(email)

    if (id) {
      fetch(`${API_BASE_URL}/api/users/${id}`)
        .then(res => res.json())
        .then(user => {
          if (user) {
            const dbAttempts = user.attempts || []
            const dbProgress = user.progress || []
            const attemptedCount = dbAttempts.length

            let averageScore = 0
            if (attemptedCount > 0) {
              let totalPercent = 0
              dbAttempts.forEach(att => {
                const parts = att.score.split('/')
                if (parts.length === 2) {
                  totalPercent += (Number(parts[0]) / Number(parts[1])) * 100
                }
              })
              averageScore = Math.round(totalPercent / attemptedCount)
            }

            setStudentStats({
              prepScore: averageScore || 0,
              streak: user.streak || 0,
              hoursStudied: user.hoursStudied || 0,
              testsAttempted: attemptedCount,
              testsPassed: dbAttempts.filter(att => {
                const parts = att.score.split('/')
                if (parts.length === 2) {
                  return (Number(parts[0]) / Number(parts[1])) >= 0.4
                }
                return false
              }).length,
              testsFailed: dbAttempts.filter(att => {
                const parts = att.score.split('/')
                if (parts.length === 2) {
                  return (Number(parts[0]) / Number(parts[1])) < 0.4
                }
                return false
              }).length
            })

            // Aggregate subject-wise breakdown
            const unitStats = {
              'Unit 1': { correct: 0, total: 0 },
              'Unit 2': { correct: 0, total: 0 },
              'Unit 3': { correct: 0, total: 0 },
              'Unit 4': { correct: 0, total: 0 },
              'Unit 5': { correct: 0, total: 0 },
              'Unit 6': { correct: 0, total: 0 },
              'Unit 7': { correct: 0, total: 0 },
              'Unit 8': { correct: 0, total: 0 },
              'Unit 9': { correct: 0, total: 0 },
              'Unit 10': { correct: 0, total: 0 },
            };

            dbAttempts.forEach(att => {
              if (att.breakdown) {
                Object.keys(att.breakdown).forEach(unitKey => {
                  if (unitStats[unitKey]) {
                    unitStats[unitKey].correct += att.breakdown[unitKey].correct || 0;
                    unitStats[unitKey].total += att.breakdown[unitKey].total || 0;
                  }
                });
              }
            });

            const getAccuracy = (unitKey) => {
              const stats = unitStats[unitKey];
              if (!stats || stats.total === 0) return 0;
              return Math.round((stats.correct / stats.total) * 100);
            };

            const defaultUnits = [
              { key: 'Unit 1', name: 'Teaching Aptitude', accuracy: 0, color: '#16a34a', advice: 'reviewing pedagogical theories and active learning models' },
              { key: 'Unit 2', name: 'Research Aptitude', accuracy: 0, color: '#2563eb', advice: 'understanding research design variables and referencing styles' },
              { key: 'Unit 3', name: 'Comprehension', accuracy: 0, color: '#8b5cf6', advice: 'practicing speed reading and context vocabulary drills' },
              { key: 'Unit 4', name: 'Communication', accuracy: 0, color: '#ec4899', advice: 'studying barrier types and models of interpersonal communication' },
              { key: 'Unit 5', name: 'Mathematical Reasoning', accuracy: 0, color: '#06b6d4', advice: 'working on percentage equations, coding series, and speed math' },
              { key: 'Unit 6', name: 'Logical Reasoning', accuracy: 0, color: '#d97706', advice: 'practicing Indian logic (Pramanas) and syllogism diagrams' },
              { key: 'Unit 7', name: 'Data Interpretation', accuracy: 0, color: '#dc2626', advice: 'reviewing visual chart notes and practicing shift-wise DI worksheets' },
              { key: 'Unit 8', name: 'Information & Communication Tech (ICT)', accuracy: 0, color: '#14b8a6', advice: 'reviewing computer networks, storage types, and internet abbreviations' },
              { key: 'Unit 9', name: 'People & Environment', accuracy: 0, color: '#84cc16', advice: 'reading environmental protocols, pollutants, and energy resource quotas' },
              { key: 'Unit 10', name: 'Higher Education System', accuracy: 0, color: '#6b7280', advice: 'reviewing ancient learning institutions and modern regulatory policies (NEP)' }
            ];

            const updatedUnits = defaultUnits.map(u => ({
              ...u,
              accuracy: getAccuracy(u.key)
            }));

            let lowestUnit = updatedUnits[6]; // default to DI
            let minAcc = 101;
            let hasAnyAttempts = false;

            updatedUnits.forEach(u => {
              if (unitStats[u.key] && unitStats[u.key].total > 0) {
                hasAnyAttempts = true;
                if (u.accuracy < minAcc) {
                  minAcc = u.accuracy;
                  lowestUnit = u;
                }
              }
            });

            setAnalyticsData({
              unitAccuracies: updatedUnits,
              lowestUnitName: lowestUnit.name,
              lowestUnitAcc: hasAnyAttempts ? lowestUnit.accuracy : 0,
              lowestUnitAdvice: lowestUnit.advice,
              hasAttempts: hasAnyAttempts
            });

            fetch(`${API_BASE_URL}/api/notes`)
              .then(res => res.json())
              .then(notesData => {
                if (Array.isArray(notesData)) {
                  setStudentUnits(prev => prev.map(unit => {
                    const matchedNote = notesData.find(n => String(n.id) === String(unit.id));
                    return {
                      ...unit,
                      progress: dbProgress.includes(unit.id) ? 100 : 0,
                      isAvailable: matchedNote ? matchedNote.isAvailable !== false : true
                    };
                  }));
                }
              })
              .catch(err => {
                console.error('Failed to fetch notes availability:', err);
                setStudentUnits(prev => prev.map(unit => ({
                  ...unit,
                  progress: dbProgress.includes(unit.id) ? 100 : 0,
                  isAvailable: true
                })));
              });

            fetch(`${API_BASE_URL}/api/pyqsets`)
              .then(res => res.json())
              .then(sets => {
                if (Array.isArray(sets)) {
                  const mappedPyqs = sets.map(set => {
                    const userAttempt = dbAttempts.find(att => att.setId === set.id)
                    return {
                      id: set.id,
                      title: set.title,
                      status: userAttempt ? 'Completed' : 'Not Started',
                      score: userAttempt ? userAttempt.score : undefined,
                      timeSpent: userAttempt ? userAttempt.timeSpent : undefined
                    }
                  })
                  setStudentPYQs(mappedPyqs)
                }
              })
          }
        })
        .catch(err => console.error('Failed to fetch user profile:', err))
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    // Trigger navbar updates by refreshing page context redirect
    navigate('/')
    window.location.reload()
  }

  // Admin Actions
  const handleToggleMessageStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'unread' ? 'read' : 'unread';
    try {
      const res = await fetch(`${API_BASE_URL}/api/contact/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages(prev => prev.map(m => m.id === id ? updated : m));
      }
    } catch (err) {
      console.error('Failed to update message status:', err);
    }
  }

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/contact/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }

  const handleToggleMaintenance = async () => {
    const updatedValue = !settings.maintenanceMode;
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: updatedValue })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to save maintenance mode:', err);
    }
  }

  const handleToggleAdsense = async () => {
    const updatedValue = !settings.adsenseEnabled;
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsenseEnabled: updatedValue })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to save adsense status:', err);
    }
  }

  const handleSettingsChange = async (field, val) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to change setting:', err);
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNoteTitle.trim()) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNoteTitle })
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes(prev => [...prev, newNote]);
        setNewNoteTitle('');
        alert('Study Note added successfully!');
      } else {
        alert('Failed to add note.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while adding note.');
    }
  }

  const handleDeleteNote = async (id) => {
    if (window.confirm('Are you sure you want to delete this study note?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setNotes(prev => prev.filter(n => n.id !== id));
        } else {
          alert('Failed to delete note.');
        }
      } catch (err) {
        console.error(err);
        alert('Network error while deleting note.');
      }
    }
  }

  const handleHtmlUpload = (id, e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setNotes(prev => prev.map(note => {
      if (note.id === id) {
        return { ...note, fileName: file.name }
      }
      return note
    }))
    
    alert(`Successfully uploaded "${file.name}" for Unit #${id}!`)
  }

  const handleToggleAvailability = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${id}/toggle-availability`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => prev.map(note => {
          if (note.id === id) {
            return { ...note, isAvailable: data.isAvailable };
          }
          return note;
        }));
      } else {
        alert('Failed to update availability.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating availability.');
    }
  }

  const handleResetBlogForm = () => {
    setBlogId(null)
    setBlogTitle('')
    setBlogCategory('Strategy')
    setBlogAuthor('')
    setBlogReadTime('5 min read')
    setBlogExcerpt('')
    setBlogContent('')
    setBlogIsFeatured(false)
    setIsBlogFormOpen(false)
  }

  const handleSaveBlogPost = async (e) => {
    e.preventDefault()
    const postData = {
      title: blogTitle,
      category: blogCategory,
      author: blogAuthor,
      readTime: blogReadTime,
      excerpt: blogExcerpt,
      content: blogContent,
      isFeatured: blogIsFeatured
    }

    try {
      if (blogId) {
        const res = await fetch(`${API_BASE_URL}/api/posts/${blogId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        })
        if (res.ok) {
          const updated = await res.json()
          setAdminPosts(prev => prev.map(p => p._id === blogId ? updated : p))
          alert('Blog post updated successfully!')
          handleResetBlogForm()
        } else {
          alert('Failed to update blog post.')
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        })
        if (res.ok) {
          const created = await res.json()
          setAdminPosts(prev => [created, ...prev])
          alert('Blog post created successfully!')
          handleResetBlogForm()
        } else {
          alert('Failed to create blog post.')
        }
      }
    } catch (err) {
      console.error(err)
      alert('Network error while saving blog post.')
    }
  }

  const handleEditBlogPost = (post) => {
    setBlogId(post._id)
    setBlogTitle(post.title)
    setBlogCategory(post.category)
    setBlogAuthor(post.author)
    setBlogReadTime(post.readTime)
    setBlogExcerpt(post.excerpt)
    setBlogContent(post.content)
    setBlogIsFeatured(post.isFeatured || false)
    setIsBlogFormOpen(true)
  }

  const handleDeleteBlogPost = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          setAdminPosts(prev => prev.filter(p => p._id !== id))
          alert('Blog post deleted successfully!')
        } else {
          alert('Failed to delete blog post.')
        }
      } catch (err) {
        console.error(err)
        alert('Network error while deleting blog post.')
      }
    }
  }

  const handleToggleUserRole = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}/role`, {
        method: 'PUT'
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      } else {
        alert('Failed to update user role');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating user role');
    }
  }

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to remove this user account?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setUsers(prev => prev.filter(u => u.id !== id));
        } else {
          alert('Failed to delete user');
        }
      } catch (err) {
        console.error(err);
        alert('Network error while deleting user');
      }
    }
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

  const handleEditSet = (id) => {
    const set = pyqSets.find(s => (s.id || s._id) === id)
    if (set) {
      navigate('/admin/manage-set/' + id)
    }
  }

  const cancelEditSet = () => {
    setEditingSetId(null)
    setEditingSetQuestions([])
    setNewSetPaperType('Paper I')
    setNewSetYear('')
    setNewSetSubtitle('')
    setNewSetCount(50)
    setNewSetIsPublished(false)
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
      questionsLoaded: 0,
      isPublished: newSetIsPublished
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

  const handleDeleteSet = async (id) => {
    if (window.confirm('Are you sure you want to delete this year-wise PYQ set?')) {
      try {
        await fetch(`${API_BASE_URL}/api/pyqsets/${id}`, { method: 'DELETE' })
        setPyqSets(prev => prev.filter(s => s.id !== id))
      } catch (err) {
        console.error(err)
        alert('Failed to delete PYQ Set')
      }
    }
  }

  const handleTogglePublish = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pyqsets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: newStatus })
      })
      if (res.ok) {
        const updated = await res.json()
        setPyqSets(prev => prev.map(s => (s.id === id || s._id === id) ? updated : s))
      } else {
        alert('Failed to update publish status')
      }
    } catch (err) {
      console.error(err)
      alert('Error updating publish status')
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

    // Handle bulk DI question creation
    if (newQType === 'di') {
      if (!newQPassage.trim()) {
        alert('Please fill in the table data / passage.')
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
        type: 'di',
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

        alert(`Successfully added 5 Data Interpretation questions to:\n"${targetSet.title || 'Selected Set'}"!\nTotal loaded now: ${data.updatedSet.questionsLoaded} Qs.`)
        
        // Reset Form Fields
        setNewQText('')
        setNewQOpts(['', '', '', ''])
        setNewQCorrect(1)
        setNewQExplanation('')
        setNewQAssertion('')
        setNewQReason('')
        setNewQList1(['', '', '', ''])
        setNewQList2(['', '', '', ''])
        setNewQPassage('')
        setNewQStatements(['', '', ''])
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
    } else if (newQType === 'comprehension') {
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

    const qIndex = getFirstEmptySlotIndex(editingSetQuestions, targetSet.paperType, targetSet.questionsCount)

    const questionPayload = {
      setId: selectedSetId,
      type: newQType,
      qIndex,
      text: newQText,
      options: newQOpts,
      correct: newQCorrect,
      assertion: newQAssertion,
      reason: newQReason,
      passage: newQPassage,
      list1: newQList1,
      list2: newQList2,
      list1Header: newQList1Header,
      list2Header: newQList2Header,
      statements: newQStatements.filter(s => s.trim() !== ''),
      subPrompt: newQSubPrompt,
      explanation: newQExplanation
    }

    try {
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
    setNewQStatements(['', '', ''])
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

  // RENDER STUDENT DASHBOARD
  if (!isAdmin) {
    return (
      <div className="profile-page">
        <div className="student-dashboard-wrapper">
          <div className="profile-page__container" style={{ flex: 1 }}>
            <div className="student-layout">
              {/* Sidebar Navigation */}
            <div className="student-tabs-bar">
              <button 
                className={`student-tab-btn ${studentTab === 'overview' ? 'student-tab-btn--active' : ''}`}
                onClick={() => setStudentTab('overview')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="12 8 8 12 12 16 16 12 12 8"></polygon></svg>
                <span>Prep Overview</span>
              </button>
              <button 
                className={`student-tab-btn ${studentTab === 'syllabus' ? 'student-tab-btn--active' : ''}`}
                onClick={() => setStudentTab('syllabus')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>Study Material</span>
              </button>
              <button 
                className={`student-tab-btn ${studentTab === 'practice' ? 'student-tab-btn--active' : ''}`}
                onClick={() => setStudentTab('practice')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Practice PYQs</span>
              </button>
              <button 
                className={`student-tab-btn ${studentTab === 'analytics' ? 'student-tab-btn--active' : ''}`}
                onClick={() => setStudentTab('analytics')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span>Performance Analytics</span>
              </button>
            </div>

            {/* Tab Panel Content */}
            <main className="student-panel-content">
              {/* 1. OVERVIEW HOME */}
              {studentTab === 'overview' && (
                <div className="student-pane">
                  <h2 className="pane-title">Preparation Overview</h2>
                  <p className="pane-desc">Monitor your overall exam readiness, study habits, and recent mock attempts.</p>

                  {/* Sleek Metric Cards Grid */}
                  <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="stat-box" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="stat-val" style={{ color: 'var(--primary)' }}>{studentStats.prepScore}%</span>
                      <span className="stat-lbl">Prep Score</span>
                    </div>
                    <div className="stat-box" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="stat-val" style={{ color: '#ea580c' }}>🔥 {studentStats.streak} Days</span>
                      <span className="stat-lbl">Daily Streak</span>
                    </div>
                    <div className="stat-box" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="stat-val" style={{ color: '#16a34a' }}>{studentStats.hoursStudied} Hrs</span>
                      <span className="stat-lbl">Time Studied</span>
                    </div>
                    <div className="stat-box" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="stat-val" style={{ color: 'var(--text)' }}>{studentStats.testsAttempted} Completed</span>
                      <span className="stat-lbl">Tests Attempted</span>
                    </div>
                  </div>



                  {/* Recent Activities list */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>Recent Mock Test Attempts</h3>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>PYQ Exam Module</th>
                          <th>Score</th>
                          <th>Time Spent</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPYQs.filter(q => q.status === 'Completed').map(set => (
                          <tr key={set.id}>
                            <td style={{ fontWeight: 600 }}>{set.title}</td>
                            <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{set.score}</td>
                            <td>{set.timeSpent}</td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="role-badge role-badge--admin" style={{ background: '#dcfce7', color: '#15803d' }}>Reviewed</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. SYLLABUS STUDY MATERIAL */}
              {studentTab === 'syllabus' && (
                <div className="student-pane">
                  <h2 className="pane-title">Syllabus Study Material</h2>
                  <p className="pane-desc">Track reading progress across syllabus units. Click complete to toggle read status.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {studentUnits.map(unit => (
                      <div key={unit.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>UNIT 0{unit.id}</span>
                          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginTop: '2px', height: '36px', overflow: 'hidden' }}>{unit.title}</h4>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>Read Progress</span>
                            <strong>{unit.progress}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${unit.progress}%`, height: '100%', background: unit.progress === 100 ? '#16a34a' : 'var(--primary)', borderRadius: '99px', transition: 'width 0.3s ease' }}></div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {unit.isAvailable !== false ? (
                            <Link to={`/paper1-notes/${unit.id}`} className="table-btn table-btn--role" style={{ flex: 1, textAlign: 'center', display: 'block', textDecoration: 'none', margin: 0 }}>
                              Study Notes
                            </Link>
                          ) : (
                            <button 
                              className="table-btn" 
                              disabled 
                              style={{ 
                                flex: 1, 
                                margin: 0, 
                                background: '#f3f4f6', 
                                color: '#9ca3af', 
                                border: '1px solid #e5e7eb', 
                                fontWeight: 700,
                                cursor: 'not-allowed'
                              }}
                            >
                              Coming Soon
                            </button>
                          )}
                          <button 
                            className="table-btn" 
                            style={{ 
                              flex: 1, 
                              margin: 0, 
                              background: unit.progress === 100 ? '#fee2e2' : '#e8f5e9', 
                              color: unit.progress === 100 ? '#ef4444' : '#2e7d32',
                              border: unit.progress === 100 ? '1px solid #fca5a5' : '1px solid #c8e6c9',
                              fontWeight: 700
                            }}
                            onClick={() => handleToggleUnitProgress(unit.id)}
                          >
                            {unit.progress === 100 ? 'Mark Unread' : 'Mark Read'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. PRACTICE PYQ SETS */}
              {studentTab === 'practice' && (
                <div className="student-pane">
                  <h2 className="pane-title">Practice year-wise PYQ Sets</h2>
                  <p className="pane-desc">Test your preparation with official previous year questions in a simulated console environment.</p>

                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Exam Set Title</th>
                        <th>Status</th>
                        <th>Progress / Score</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPYQs.map(set => (
                        <tr key={set.id}>
                          <td>
                            <strong style={{ display: 'block' }}>{set.title}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {set.timeLeft ? `Time Remaining: ${set.timeLeft}` : set.timeSpent ? `Time Spent: ${set.timeSpent}` : 'Standard 3-hour exam limit'}
                            </span>
                          </td>
                          <td>
                            <span 
                              className="role-badge" 
                              style={{ 
                                background: set.status === 'Completed' ? '#dcfce7' : set.status === 'In Progress' ? '#fef9c3' : '#f3f4f6',
                                color: set.status === 'Completed' ? '#15803d' : set.status === 'In Progress' ? '#854d0e' : '#4b5563'
                              }}
                            >
                              {set.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {set.status === 'Completed' ? `Score: ${set.score}` : set.status === 'In Progress' ? set.progress : 'Not Started'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {set.status === 'Completed' ? (
                              <button className="table-btn table-btn--role" onClick={() => alert('Opening test analysis and correct option reviews...')}>Review Answers</button>
                            ) : (
                              <Link 
                                to="/mocktest" 
                                state={{
                                  paperId: set.id,
                                  title: set.title,
                                  subtitle: 'Official Simulated Mock Test',
                                  questionsCount: 50
                                }}
                                className="table-btn table-btn--upload" 
                                style={{ display: 'inline-block', textDecoration: 'none', margin: 0 }}
                              >
                                {set.status === 'In Progress' ? 'Resume Test' : 'Start Test'}
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. PERFORMANCE ANALYTICS */}
              {studentTab === 'analytics' && (
                <div className="student-pane">
                  <h2 className="pane-title">Performance Analytics</h2>
                  <p className="pane-desc">Review your syllabus strengths, conceptual correctness, and weak areas.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {/* Topic Accuracy Breakdown */}
                    <div className="pane-form">
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Subject-wise Accuracy breakdown</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {analyticsData.unitAccuracies.map(u => (
                          <div key={u.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                              <span>{u.name} ({u.key})</span>
                              <span style={{ color: u.color }}>{u.accuracy}% Accuracy</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ width: `${u.accuracy}%`, height: '100%', background: u.color, borderRadius: '99px' }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation Feed */}
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '16px' }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#991b1b', marginBottom: '6px' }}>Recommended Study Focus</h3>
                      <p style={{ fontSize: '0.8rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                        {analyticsData.hasAttempts ? (
                          <>
                            Your lowest-scoring unit is <strong>{analyticsData.lowestUnitName}</strong> ({analyticsData.lowestUnitAcc}%). We suggest {analyticsData.lowestUnitAdvice} to raise your score above the general cutoff threshold (70%+).
                          </>
                        ) : (
                          <>
                            Complete a mock test to generate personalized study recommendations and analyze your syllabus strengths!
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
          </div>
        </div>
      </div>
    )
  }

  // RENDER ADMIN DASHBOARD (WITHOUT STUDY PROGRESS CARD)
  return (
    <div className="profile-page">
      <div className="profile-page__container profile-page__container--admin">


        <div className="admin-layout">
          {/* Sidebar Navigation */}
          <aside className="admin-tabs-sidebar">
            <button 
              className={`admin-tab-link ${activeTab === 'settings' ? 'admin-tab-link--active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Platform Settings</span>
            </button>
            <button 
              className={`admin-tab-link ${activeTab === 'notes' ? 'admin-tab-link--active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>Manage Notes</span>
            </button>
            <button 
              className={`admin-tab-link ${activeTab === 'users' ? 'admin-tab-link--active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Manage Users</span>
            </button>
            <button 
              className={`admin-tab-link ${activeTab === 'pyq' ? 'admin-tab-link--active' : ''}`}
              onClick={() => setActiveTab('pyq')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>PYQ / Quiz Creator</span>
            </button>
            <button 
              className={`admin-tab-link ${activeTab === 'messages' ? 'admin-tab-link--active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <span>Contact Messages</span>
              {messages.filter(m => m.status === 'unread').length > 0 && (
                <span className="unread-count-badge" style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '99px',
                  fontWeight: 'bold',
                  lineHeight: '1'
                }}>
                  {messages.filter(m => m.status === 'unread').length}
                </span>
              )}
            </button>
            <button 
              className={`admin-tab-link ${activeTab === 'blogs' ? 'admin-tab-link--active' : ''}`}
              onClick={() => setActiveTab('blogs')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Manage Blogs</span>
            </button>
          </aside>

          {/* Active Tab Panel Content */}
          <main className="admin-panel-content">


            {/* 1. PLATFORM SETTINGS */}
            {activeTab === 'settings' && (
              <div className="admin-pane">
                <h2 className="pane-title">Global Platform Settings</h2>
                <p className="pane-desc">Manage site status, advertising parameters, and exam properties.</p>
                
                <div className="settings-list">
                  <div className="setting-row">
                    <div className="setting-info">
                      <strong className="setting-name">Maintenance Mode</strong>
                      <span className="setting-help">Lock public access to the platform and show a construction screen.</span>
                    </div>
                    <button 
                      className={`toggle-switch ${settings.maintenanceMode ? 'toggle-switch--active' : ''}`}
                      onClick={handleToggleMaintenance}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="setting-row">
                    <div className="setting-info">
                      <strong className="setting-name">AdSense Placeholders</strong>
                      <span className="setting-help">Enable or disable banner/responsive monetization units across study note headers.</span>
                    </div>
                    <button 
                      className={`toggle-switch ${settings.adsenseEnabled ? 'toggle-switch--active' : ''}`}
                      onClick={handleToggleAdsense}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>


                  <div className="setting-row">
                    <div className="setting-info">
                      <strong className="setting-name">Practice Test Timer Limit</strong>
                      <span className="setting-help">Change default countdown limit for 100 questions mock tests.</span>
                    </div>
                    <select 
                      className="pane-select"
                      value={settings.timerDuration} 
                      onChange={(e) => handleSettingsChange('timerDuration', Number(e.target.value))}
                    >
                      <option value="90">90 Minutes (1.5 hours)</option>
                      <option value="120">120 Minutes (2 hours - standard)</option>
                      <option value="150">150 Minutes (2.5 hours)</option>
                      <option value="180">180 Minutes (3 hours)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MANAGE STUDY NOTES */}
            {activeTab === 'notes' && (
              <div className="admin-pane">
                <h2 className="pane-title">Manage Study Notes</h2>
                <p className="pane-desc">Create and remove high-yield syllabus units visible to student accounts.</p>

                {/* Notes List Table */}
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Note Unit Title</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map(note => (
                      <tr key={note.id}>
                        <td>#{note.id}</td>
                        <td style={{ fontWeight: 600 }}>
                          {note.title}
                          {note.fileName && (
                            <span style={{ 
                              marginLeft: '10px', 
                              fontSize: '0.72rem', 
                              backgroundColor: '#e8f5e9', 
                              color: '#2e7d32', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontWeight: 'normal',
                              border: '1px solid #c8e6c9'
                            }}>
                              File: {note.fileName}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className={`table-btn ${note.isAvailable !== false ? 'table-btn--status-available' : 'table-btn--status-comingsoon'}`} 
                            style={{ marginRight: '8px', minWidth: '110px' }}
                            onClick={() => handleToggleAvailability(note.id)}
                          >
                            {note.isAvailable !== false ? 'Available' : 'Coming Soon'}
                          </button>
                          <button 
                            className="table-btn table-btn--upload" 
                            style={{ marginRight: '8px' }}
                            onClick={() => navigate('/admin/edit-note/' + note.id)}
                          >
                            Edit Content
                          </button>
                          <button className="table-btn table-btn--delete" onClick={() => handleDeleteNote(note.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add Note Form */}
                <form className="pane-form" onSubmit={handleAddNote}>
                  <h3>Add New Study Note</h3>
                  <div className="form-fields" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="form-field">
                      <label>Note Title</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Unit 5: Mathematical Reasoning" 
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="pane-submit-btn">Add Note to Website</button>
                </form>
              </div>
            )}

            {/* 3. MANAGE USERS */}
            {activeTab === 'users' && (
              <div className="admin-pane">
                <h2 className="pane-title">User Accounts Database</h2>
                <p className="pane-desc">Review active users, promote access rights, or remove spam accounts.</p>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email Address</th>
                      <th>Platform Role</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge role-badge--${u.role}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className="status-indicator"></span> {u.status}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="table-btn table-btn--role" onClick={() => handleToggleUserRole(u.id)}>
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                          <button className="table-btn table-btn--delete" onClick={() => handleDeleteUser(u.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. PYQ / QUIZ CREATOR */}
            {activeTab === 'pyq' && (
              <div className="admin-pane">
                <h2 className="pane-title">PYQ & Test Creator</h2>
                <p className="pane-desc">Create year-wise Paper I/II PYQ sets and author questions with dynamic formats.</p>

                {/* 4.1 ACTIVE PYQ SETS SECTION */}
                <div className="creator-section" style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                    Active PYQ Sets Database
                  </h3>

                  {/* PAPER I TABLE */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></span>
                      Paper I (General Aptitude) Sets ({pyqSets.filter(s => s.paperType === 'Paper I').length})
                    </h4>
                    {pyqSets.filter(s => s.paperType === 'Paper I').length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                        No active Paper I sets.
                      </p>
                    ) : (
                      <table className="admin-table" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>ID</th>
                            <th>Exam Set Title</th>
                            <th>Year</th>
                            <th>Status / Questions</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pyqSets.filter(s => s.paperType === 'Paper I').map(set => (
                            <tr key={set.id}>
                              <td>#{set.id}</td>
                              <td>
                                <strong style={{ display: 'block' }}>{set.title}</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{set.subtitle}</span>
                              </td>
                              <td>{set.year}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                    {set.questionsLoaded} / {set.questionsCount} Qs
                                  </span>
                                  <div>
                                    {set.isPublished ? (
                                      <span className="status-badge status-badge--published" onClick={() => handleTogglePublish(set.id || set._id, false)} style={{ cursor: 'pointer' }} title="Click to Unpublish (make Draft)">Published</span>
                                    ) : (
                                      <span className="status-badge status-badge--draft" onClick={() => handleTogglePublish(set.id || set._id, true)} style={{ cursor: 'pointer' }} title="Click to Publish">Draft</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="table-btn table-btn--edit" onClick={() => handleEditSet(set.id || set._id)}>Manage Questions</button>
                                <button className="table-btn table-btn--delete" onClick={() => handleDeleteSet(set.id || set._id)}>Delete Set</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* PAPER II TABLE */}
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#dc2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#dc2626', borderRadius: '50%' }}></span>
                      Paper II (Sociology) Sets ({pyqSets.filter(s => s.paperType === 'Paper II').length})
                    </h4>
                    {pyqSets.filter(s => s.paperType === 'Paper II').length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                        No active Paper II Sociology sets.
                      </p>
                    ) : (
                      <table className="admin-table" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>ID</th>
                            <th>Exam Set Title</th>
                            <th>Year</th>
                            <th>Status / Questions</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pyqSets.filter(s => s.paperType === 'Paper II').map(set => (
                            <tr key={set.id}>
                              <td>#{set.id}</td>
                              <td>
                                <strong style={{ display: 'block' }}>{set.title}</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{set.subtitle}</span>
                              </td>
                              <td>{set.year}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                    {set.questionsLoaded} / {set.questionsCount} Qs
                                  </span>
                                  <div>
                                    {set.isPublished ? (
                                      <span className="status-badge status-badge--published" onClick={() => handleTogglePublish(set.id || set._id, false)} style={{ cursor: 'pointer' }} title="Click to Unpublish (make Draft)">Published</span>
                                    ) : (
                                      <span className="status-badge status-badge--draft" onClick={() => handleTogglePublish(set.id || set._id, true)} style={{ cursor: 'pointer' }} title="Click to Publish">Draft</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="table-btn table-btn--edit" onClick={() => handleEditSet(set.id || set._id)}>Manage Questions</button>
                                <button className="table-btn table-btn--delete" onClick={() => handleDeleteSet(set.id || set._id)}>Delete Set</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="creator-grid">
                  {/* 4.2 CREATE / EDIT PYQ SET FORM */}
                  <form className="pane-form" onSubmit={handleCreateSet}>
                    <h3>{editingSetId ? `Edit PYQ Set #${editingSetId}` : 'Create New PYQ Year-Wise Set'}</h3>
                    <div className="form-field" style={{ marginBottom: '12px' }}>
                      <label>Paper Type</label>
                      <select 
                        className="pane-select"
                        value={newSetPaperType}
                        onChange={(e) => setNewSetPaperType(e.target.value)}
                      >
                        <option value="Paper I">Paper I (General Aptitude)</option>
                        <option value="Paper II">Paper II (Sociology)</option>
                      </select>
                    </div>

                    <div className="form-field" style={{ marginBottom: '12px' }}>
                      <label>Exam Year</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. 2023" 
                        value={newSetYear}
                        onChange={(e) => setNewSetYear(e.target.value)}
                      />
                    </div>

                    <div className="form-field" style={{ marginBottom: '12px' }}>
                      <label>Shift / Subtitle Info</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Shift 1 or June Exam" 
                        value={newSetSubtitle}
                        onChange={(e) => setNewSetSubtitle(e.target.value)}
                      />
                    </div>

                    <div className="form-field" style={{ marginBottom: '16px' }}>
                      <label>Total Questions Count</label>
                      <select 
                        className="pane-select"
                        value={newSetCount}
                        onChange={(e) => setNewSetCount(Number(e.target.value))}
                      >
                        <option value="50">50 Questions (Standard Paper I)</option>
                        <option value="100">100 Questions (Standard Paper II)</option>
                      </select>
                    </div>

                    <div className="form-field-checkbox" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="publishSetProfile"
                        checked={newSetIsPublished}
                        onChange={(e) => setNewSetIsPublished(e.target.checked)}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      <label htmlFor="publishSetProfile" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        Publish this set (make it visible to users)
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="pane-btn pane-btn--primary">
                        {editingSetId ? 'Update Set Details' : 'Create Exam Set'}
                      </button>
                      {editingSetId && (
                        <button type="button" className="pane-btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={cancelEditSet}>
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                  {editingSetId && (
                    <div className="pane-form" style={{ marginTop: '20px' }}>
                      <h3>Manage Questions ({editingSetQuestions?.length || 0})</h3>
                      <div className="questions-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                        {(!editingSetQuestions || editingSetQuestions.length === 0) ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            No questions have been saved to this set yet. Please use the form below to import some!
                          </div>
                        ) : editingSetQuestions.map((q, idx) => (
                          <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <strong>Q{idx + 1}. {q.type}</strong>
                              <button 
                                type="button" 
                                className="table-btn table-btn--delete" 
                                onClick={() => handleDeleteQuestion(q.id)}
                              >
                                Delete
                              </button>
                            </div>
                            {q.passage && <div style={{ fontSize: '0.85rem', marginBottom: '8px', fontStyle: 'italic', color: 'var(--text-light)' }}>Passage: {q.passage.substring(0, 50)}...</div>}
                            <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>{q.text}</div>
                            {q.options && q.options.length > 0 && (
                              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                                {q.options.map((opt, oIdx) => (
                                  <li key={oIdx} style={{ padding: '4px 0', color: q.correct === (oIdx + 1) ? 'var(--success)' : 'inherit', fontWeight: q.correct === (oIdx + 1) ? 'bold' : 'normal' }}>
                                    ({oIdx + 1}) {opt}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4.3 ADD QUESTION TO PYQ SET PANEL */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <form className="pane-form" onSubmit={handleCreateQuestion}>
                        <h3>Add Question to PYQ Set</h3>
                        
                        <div className="form-field" style={{ marginBottom: '12px' }}>
                          <label>Target PYQ Set</label>
                          <select 
                            className="pane-select"
                            value={selectedSetId}
                            onChange={(e) => setSelectedSetId(e.target.value)}
                          >
                            {pyqSets.map(s => (
                              <option key={s.id} value={s.id}>{s.title} {s.isPublished ? '(Published)' : '(Draft)'}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field" style={{ marginBottom: '12px' }}>
                          <label>Question Formatting Type</label>
                          <select 
                            className="pane-select"
                            value={newQType}
                            onChange={(e) => {
                              const type = e.target.value
                              setNewQType(type)
                              if (type === 'assertion-reason') {
                                setNewQSubPrompt('In the light of the above statements, choose the correct answer from the options given below')
                              } else if (type === 'match-column' || type === 'multiple-statement') {
                                setNewQSubPrompt('Choose the correct answer from the options given below:')
                              }
                            }}
                          >
                            <option value="mcq">Normal MCQ</option>
                            <option value="assertion-reason">Assertion & Reasoning</option>
                            <option value="match-column">Match the Column</option>
                            <option value="comprehension">Comprehension / Passage</option>
                            <option value="di">Data Interpretation / Table Data</option>
                            <option value="multiple-statement">Multiple Statements MCQ</option>
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
                          </div>
                        )}

                        {/* DYNAMIC FIELD PANEL: MULTIPLE STATEMENTS */}
                        {newQType === 'multiple-statement' && (
                          <div style={{ marginBottom: '12px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', background: 'var(--bg-card)' }}>
                            <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Statements (A, B, C, D...)</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {newQStatements.map((stmt, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{String.fromCharCode(65 + idx)}:</span>
                                  <input 
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }}
                                    type="text"
                                    required
                                    placeholder={`Statement ${idx + 1}`}
                                    value={stmt}
                                    onChange={(e) => handleStatementChange(idx, e.target.value)}
                                  />
                                </div>
                              ))}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setNewQStatements(prev => [...prev, ''])}>+ Add Statement</button>
                                {newQStatements.length > 2 && (
                                  <button type="button" className="pane-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#ef4444' }} onClick={() => setNewQStatements(prev => prev.slice(0, -1))}>Remove Last</button>
                                )}
                              </div>
                              <div className="form-field" style={{ marginTop: '12px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Answer Instruction / Sub-prompt</label>
                                <input 
                                  type="text" 
                                  required 
                                  placeholder="e.g. Choose the correct answer from the options given below:"
                                  value={newQSubPrompt}
                                  onChange={(e) => setNewQSubPrompt(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 5 DI QUESTIONS SEQUENCE OR SINGLE QUESTION FIELDS */}
                        {newQType === 'di' ? (
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
                                    <div className="form-field" key={oIdx}>
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
                                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '15px' }}>
                                  <div className="form-field">
                                    <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Correct Answer Option</label>
                                    <select 
                                      className="pane-select"
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
                                  <div className="form-field">
                                    <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Detailed Explanation (Optional)</label>
                                    <input 
                                      type="text"
                                      className="pane-input"
                                      placeholder="Explanation..."
                                      value={dq.explanation || ''}
                                      onChange={(e) => {
                                        setDiQuestions(prev => {
                                          const next = [...prev]
                                          next[qIdx] = { ...next[qIdx], explanation: e.target.value }
                                          return next
                                        })
                                      }}
                                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
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
                                <div className="form-field" key={idx}>
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
                            <div className="form-field" style={{ maxWidth: '200px', marginBottom: '16px' }}>
                              <label>Correct Answer Option</label>
                              <select 
                                className="pane-select"
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
                            <div className="form-field" style={{ marginBottom: '16px' }}>
                              <label>Detailed Explanation (Optional)</label>
                              <textarea 
                                rows="3"
                                placeholder="Enter detailed explanation of the concept and why this option is correct"
                                value={newQExplanation}
                                onChange={(e) => setNewQExplanation(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
                              />
                            </div>
                          </>
                        )}

                        <button type="submit" className="pane-submit-btn" style={{ width: '100%' }}>
                          {newQType === 'di' ? 'Add 5 DI Questions to Selected Set' : 'Add Question to Selected Set'}
                        </button>
                      </form>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CONTACT MESSAGES */}
            {activeTab === 'messages' && (
              <div className="admin-pane">
                <h2 className="pane-title">Contact Messages</h2>
                <p className="pane-desc">View and manage contact form submissions from your users.</p>

                <div className="messages-list" style={{ marginTop: '20px' }}>
                  {messages.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                      No messages received yet.
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Sender</th>
                            <th>Email</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {messages.map((msg) => (
                            <tr key={msg.id} style={{ background: msg.status === 'unread' ? 'rgba(37, 99, 235, 0.03)' : 'transparent' }}>
                              <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                {new Date(msg.createdAt).toLocaleString()}
                              </td>
                              <td style={{ fontSize: '0.88rem' }}><strong>{msg.name}</strong></td>
                              <td style={{ fontSize: '0.85rem' }}>
                                <a href={`mailto:${msg.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                  {msg.email}
                                </a>
                              </td>
                              <td style={{ 
                                maxWidth: '300px', 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '0.88rem', 
                                color: msg.status === 'unread' ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}>
                                {msg.message}
                              </td>
                              <td>
                                <span className={`role-badge role-badge--${msg.status}`}>
                                  {msg.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button 
                                    onClick={() => handleToggleMessageStatus(msg.id, msg.status)}
                                    className="table-btn table-btn--edit"
                                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                  >
                                    {msg.status === 'unread' ? 'Mark Read' : 'Mark Unread'}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="table-btn table-btn--delete"
                                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. MANAGE BLOGS */}
            {activeTab === 'blogs' && (
              <div className="admin-pane">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 className="pane-title">Manage Blog Section</h2>
                    <p className="pane-desc">Create, update, or remove articles shown in the public Blog section.</p>
                  </div>
                  {!isBlogFormOpen && (
                     <button 
                       className="table-btn table-btn--upload" 
                       style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                       onClick={() => {
                         handleResetBlogForm();
                         setIsBlogFormOpen(true);
                       }}
                     >
                       + Write New Post
                     </button>
                  )}
                </div>

                {isBlogFormOpen ? (
                  <form className="pane-form" onSubmit={handleSaveBlogPost}>
                    <h3>{blogId ? 'Edit Blog Post' : 'Write New Blog Post'}</h3>
                    <div className="form-fields" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-field">
                        <label>Article Title</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. 5 Secrets to Crack UGC NET on First Attempt" 
                          value={blogTitle}
                          onChange={(e) => setBlogTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Category</label>
                        <select 
                          className="pane-select"
                          value={blogCategory}
                          onChange={(e) => setBlogCategory(e.target.value)}
                        >
                          <option value="Strategy">Strategy</option>
                          <option value="Study Guide">Study Guide</option>
                          <option value="Tips">Tips</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Author Name</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Prof. Kumar" 
                          value={blogAuthor}
                          onChange={(e) => setBlogAuthor(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Read Time</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. 5 min read" 
                          value={blogReadTime}
                          onChange={(e) => setBlogReadTime(e.target.value)}
                        />
                      </div>

                      <div className="form-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
                        <input 
                          type="checkbox" 
                          id="isFeatured"
                          checked={blogIsFeatured}
                          onChange={(e) => setBlogIsFeatured(e.target.checked)}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <label htmlFor="isFeatured" style={{ cursor: 'pointer', userSelect: 'none' }}>Mark as Featured Post</label>
                      </div>
                      <div className="form-field full-width">
                        <label>Short Excerpt</label>
                        <textarea 
                          required 
                          rows="2"
                          placeholder="A brief 1-2 sentence description of the article..." 
                          value={blogExcerpt}
                          onChange={(e) => setBlogExcerpt(e.target.value)}
                        />
                      </div>
                      <div className="form-field full-width">
                        <label>Article Content (HTML Supported)</label>
                        <textarea 
                          required 
                          rows="8"
                          placeholder="Use HTML tags like <p>, <h3>, <ul>, <li> to format your article..." 
                          value={blogContent}
                          onChange={(e) => setBlogContent(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button type="submit" className="pane-submit-btn">Save Post</button>
                      <button type="button" className="table-btn" onClick={handleResetBlogForm}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Author</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminPosts.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No blog posts found.</td>
                          </tr>
                        ) : (
                          adminPosts.map(post => (
                            <tr key={post._id}>
                              <td style={{ fontWeight: 600 }}>
                                {post.title}
                                {post.isFeatured && (
                                  <span style={{ 
                                    marginLeft: '8px', 
                                    fontSize: '0.65rem', 
                                    backgroundColor: '#fff3c7', 
                                    color: '#d97706', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    border: '1px solid rgba(217, 119, 6, 0.15)',
                                    fontWeight: 'bold'
                                  }}>
                                    Featured
                                  </span>
                                )}
                              </td>
                              <td>{post.category}</td>
                              <td>{post.author}</td>
                              <td>{post.date}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button 
                                    className="table-btn table-btn--edit" 
                                    onClick={() => handleEditBlogPost(post)}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    className="table-btn table-btn--delete" 
                                    onClick={() => handleDeleteBlogPost(post._id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Profile
