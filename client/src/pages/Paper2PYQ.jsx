import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { API_BASE_URL } from '../services/api'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'
import SuggestedBlogs from '../components/layout/SuggestedBlogs'
import './PaperPYQ.css'

const monthMap = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
}

const getSortValue = (paper) => {
  const subtitle = (paper.cycle || '').toLowerCase()
  let month = 0
  let day = 1
  let shift = 1

  // Format 1: 21-aug-2024 or 02-september-2024
  const match1 = subtitle.match(/(\d{1,2})-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)
  if (match1) {
    day = parseInt(match1[1], 10)
    month = monthMap[match1[2]] ?? 0
  } else {
    // Format 2: 02 jan or 25 june or 31 december
    const match2 = subtitle.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)
    if (match2) {
      day = parseInt(match2[1], 10)
      month = monthMap[match2[2]] ?? 0
    } else {
      // Format 3: just month name like "june morning shift"
      const match3 = subtitle.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)
      if (match3) {
        month = monthMap[match3[1]] ?? 0
      }
    }
  }

  // Shift check (supports Shift 2, Shift II, Evening, etc. with or without spaces/dashes)
  if (
    subtitle.includes('evening') || 
    subtitle.includes('shift 2') || 
    subtitle.includes('shift2') || 
    subtitle.includes('shift ii') ||
    subtitle.match(/shift[\s-]*(2|ii)\b/)
  ) {
    shift = 2
  }

  return month * 1000 + day * 10 + shift
}

const cleanExamTitle = (subtitle, subject, year) => {
  if (!subtitle) return ''
  let cleaned = subtitle

  // Build a list of potential prefixes to remove from the start
  const prefixes = []
  if (subject && year) {
    prefixes.push(`${subject} ${year}`)
    const normSub = subject.replace(/\s+language$/i, '').trim()
    prefixes.push(`${normSub} ${year}`)
  }
  
  // Sort prefixes by length descending to match the longest prefix first
  prefixes.sort((a, b) => b.length - a.length)

  for (const prefix of prefixes) {
    const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp('^' + escapedPrefix + '\\s*', 'i')
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '')
      break // Only strip the longest matching prefix
    }
  }

  return cleaned.trim() || subtitle
}

// Master list of UGC NET Paper 2 subjects for directory listing & search
const UGC_NET_SUBJECTS_CATALOG = [
  { code: '05', name: 'Sociology', category: 'Social Sciences', featured: true },
  { code: '42', name: 'Sindhi', category: 'Languages & Literature', featured: true },
  { code: '02', name: 'Political Science', category: 'Social Sciences' },
  { code: '06', name: 'History', category: 'Social Sciences' },
  { code: '08', name: 'Commerce', category: 'Commerce & Management' },
  { code: '01', name: 'Economics / Rural Economics', category: 'Social Sciences' },
  { code: '30', name: 'English', category: 'Languages & Literature' },
  { code: '20', name: 'Hindi', category: 'Languages & Literature' },
  { code: '09', name: 'Education', category: 'Education' },
  { code: '17', name: 'Management', category: 'Commerce & Management' },
  { code: '87', name: 'Computer Science & Applications', category: 'Science & Tech' },
  { code: '80', name: 'Geography', category: 'Social Sciences' },
  { code: '58', name: 'Law', category: 'Legal Studies' },
  { code: '04', name: 'Psychology', category: 'Social Sciences' },
  { code: '14', name: 'Public Administration', category: 'Social Sciences' },
  { code: '89', name: 'Environmental Sciences', category: 'Science & Tech' },
  { code: '59', name: 'Library & Information Science', category: 'Information Sciences' },
  { code: '03', name: 'Philosophy', category: 'Humanities' },
  { code: '25', name: 'Sanskrit', category: 'Languages & Literature' },
  { code: '12', name: 'Home Science', category: 'Interdisciplinary' },
  { code: '63', name: 'Mass Communication & Journalism', category: 'Media & Arts' },
  { code: '10', name: 'Social Work', category: 'Social Sciences' },
  { code: '47', name: 'Physical Education', category: 'Education' },
  { code: '07', name: 'Anthropology', category: 'Social Sciences' },
  { code: '88', name: 'Electronic Science', category: 'Science & Tech' }
]

const normalizeSubject = (sub) => {
  if (!sub) return ''
  return sub
    .toLowerCase()
    .replace(/[\s\-_()]+/g, '')
    .replace(/language$/i, '')
    .trim()
}

const Paper2PYQ = () => {
  const { search } = useLocation()
  const [allRawSets, setAllRawSets] = useState([])
  const [corePapers, setCorePapers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [settings, setSettings] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const query = new URLSearchParams(search)
  const activeSubject = query.get('subject') || ''

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data)
      })
      .catch(err => console.error('Failed to fetch settings:', err))
  }, [])

  // Fetch core papers list
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/core-papers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCorePapers(data.filter(p => p.isAvailable !== false))
        }
      })
      .catch(err => console.error('Failed to fetch core papers:', err))
  }, [])

  // Fetch all PYQ sets
  const fetchAllSets = useCallback(() => {
    setIsLoading(true)
    setHasError(false)

    fetch(`${API_BASE_URL}/api/pyqsets`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch pyq sets')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAllRawSets(data)
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch pyq sets:', err)
        setHasError(true)
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchAllSets()
  }, [fetchAllSets])

  // Dynamic document title update based on whether a specific subject is selected or hub view
  useEffect(() => {
    if (activeSubject) {
      document.title = `UGC NET Paper 2 ${activeSubject} Solved PYQs & Free CBT Mock Tests - UGC Free Paper`
    } else {
      document.title = `UGC NET Paper 2 Core Subjects - Solved PYQs & Free Mock Tests - UGC Free Paper`
    }
  }, [activeSubject])

  // Filter paper 2 sets for active subject
  const activeSubjectPapers = useMemo(() => {
    if (!activeSubject) return []
    const activeSubNorm = normalizeSubject(activeSubject)
    return allRawSets.filter(set => {
      if (set.paperType !== 'Paper II') return false
      const setSubNorm = normalizeSubject(set.subject || 'Sociology')
      return setSubNorm === activeSubNorm ||
             (activeSubNorm.includes('sindhi') && setSubNorm.includes('sindhi')) ||
             (activeSubNorm.includes('sociology') && setSubNorm.includes('sociology')) ||
             setSubNorm.includes(activeSubNorm) ||
             activeSubNorm.includes(setSubNorm)
    })
  }, [allRawSets, activeSubject])

  // Memoize grouped & sorted papers for subject-specific view
  const sortedYears = useMemo(() => {
    if (!activeSubject) return []
    const grouped = {}
    activeSubjectPapers.forEach(set => {
      if (!grouped[set.year]) grouped[set.year] = []
      const cleanedCycle = cleanExamTitle(set.subtitle, activeSubject, set.year) || set.subtitle || ''
      const desktopTitle = cleanExamTitle(set.subtitle, activeSubject, set.year) || set.subtitle || ''
      
      grouped[set.year].push({
        id: set.id,
        subject: activeSubject,
        cycle: cleanedCycle,
        desktopTitle: desktopTitle,
        questions: set.questionsCount,
        seoTitle: `UGC NET ${set.year} ${activeSubject} Paper 2 Solved Question Paper (${cleanedCycle || desktopTitle || 'Official Shift'})`,
        title: set.title
      })
    })

    const years = Object.keys(grouped).sort((a, b) => b - a)
    return years.map(year => ({
      year,
      papers: grouped[year].sort((a, b) => getSortValue(a) - getSortValue(b))
    }))
  }, [activeSubjectPapers, activeSubject])

  // Aggregate available subjects and their paper counts for the Hub view
  const availableSubjectsList = useMemo(() => {
    // 1. Gather all Paper II sets
    const paper2Sets = allRawSets.filter(s => s.paperType === 'Paper II')
    
    // Group sets by normalized subject
    const subjectCounts = {}
    const subjectYearRange = {}

    paper2Sets.forEach(set => {
      const subName = set.subject || 'Sociology'
      const norm = normalizeSubject(subName)
      subjectCounts[norm] = (subjectCounts[norm] || 0) + 1
      
      if (!subjectYearRange[norm]) {
        subjectYearRange[norm] = new Set()
      }
      if (set.year) subjectYearRange[norm].add(set.year)
    })

    // Start with core papers configured in backend
    const map = new Map()

    // Default guaranteed entries if none configured yet
    const defaults = [
      { name: 'Sociology', code: '05', description: 'Complete 100-question full papers with theoretical sociology explanations.' },
      { name: 'Sindhi', code: '42', description: 'Devanagari script verified question papers and solutions.' }
    ]

    // Add configured core papers
    corePapers.forEach(cp => {
      const norm = normalizeSubject(cp.name)
      map.set(norm, {
        name: cp.name,
        code: cp.code || '',
        description: cp.description || `Paper II ${cp.name} Solved Question Papers & CBT Mock Tests`,
        isAvailable: cp.isAvailable !== false,
        paperCount: subjectCounts[norm] || 0,
        years: subjectYearRange[norm] ? Array.from(subjectYearRange[norm]).sort((a, b) => a - b) : []
      })
    })

    // Add defaults if not present
    defaults.forEach(d => {
      const norm = normalizeSubject(d.name)
      if (!map.has(norm)) {
        map.set(norm, {
          name: d.name,
          code: d.code,
          description: d.description,
          isAvailable: true,
          paperCount: subjectCounts[norm] || 0,
          years: subjectYearRange[norm] ? Array.from(subjectYearRange[norm]).sort((a, b) => a - b) : []
        })
      }
    })

    // Also include any other subject found in uploaded Paper II sets
    paper2Sets.forEach(set => {
      const subName = set.subject || 'Sociology'
      const norm = normalizeSubject(subName)
      if (!map.has(norm)) {
        map.set(norm, {
          name: subName,
          code: '',
          description: `Paper II ${subName} Solved Question Papers & CBT Mock Tests`,
          isAvailable: true,
          paperCount: subjectCounts[norm] || 0,
          years: subjectYearRange[norm] ? Array.from(subjectYearRange[norm]).sort((a, b) => a - b) : []
        })
      }
    })

    return Array.from(map.values())
  }, [allRawSets, corePapers])

  // Filtered UGC NET catalog for search
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return UGC_NET_SUBJECTS_CATALOG
    const q = searchQuery.toLowerCase().trim()
    return UGC_NET_SUBJECTS_CATALOG.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.code.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const adsEnabled = settings ? settings.adsenseEnabled : false

  return (
    <div className="pyq-page">
      {/* Dynamic Schema.org BreadcrumbList Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: activeSubject ? [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://ugcfreepaper.com/'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Paper 2 Subjects',
                item: 'https://ugcfreepaper.com/paper2'
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: `UGC NET Paper 2 ${activeSubject} PYQs`,
                item: `https://ugcfreepaper.com/paper2?subject=${encodeURIComponent(activeSubject)}`
              }
            ] : [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://ugcfreepaper.com/'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Paper 2 Core Subjects',
                item: 'https://ugcfreepaper.com/paper2'
              }
            ]
          })
        }}
      />

      <div className="pyq-page__container">
        {/* Top Leaderboard Ad */}
        {adsEnabled && (
          <div className="pyq-page__top-ad">
            <AdSensePlaceholder type="display" format="horizontal" config={settings} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: SPECIFIC SUBJECT SELECTED (e.g. /paper2?subject=Sociology)       */}
        {/* ========================================================================= */}
        {activeSubject ? (
          <>
            {/* Subject Switcher & Back Navigation Bar */}
            <div className="p2-switcher-nav">
              <Link to="/paper2" className="p2-back-btn">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>All Paper 2 Subjects</span>
              </Link>

              <div className="p2-switcher-pills">
                <Link to="/paper2" className="p2-pill">
                  All Subjects
                </Link>
                {availableSubjectsList.map(sub => (
                  <Link
                    key={sub.name}
                    to={`/paper2?subject=${encodeURIComponent(sub.name)}`}
                    className={`p2-pill ${normalizeSubject(activeSubject) === normalizeSubject(sub.name) ? 'p2-pill--active' : ''}`}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>

            <h1 className="pyq-page__title">UGC NET Paper 2 {activeSubject} Solved PYQs & Free CBT Mock Tests</h1>
            <p className="pyq-page__subtitle">Solve official year-wise UGC NET {activeSubject} 100-Question Previous Year Papers (2020–2025) with verified keys & explanations.</p>

            <div className="pyq-page__layout">
              <div className="pyq-page__main-content">
                {/* SEO Intro */}
                <section className="pyq-page__intro">
                  <h2>Master UGC NET Paper 2 {activeSubject} with Real PYQs</h2>
                  <p>
                    Paper 2 {activeSubject} tests your depth of knowledge in advanced subject curriculum, core concepts, research methodologies, and theoretical frameworks. Regularly solving official {activeSubject} previous years' question papers allows you to analyze question patterns and maximize your JRF qualification rate.
                  </p>
                </section>

                {/* Mobile/Tablet suggested blogs */}
                <div className="pyq-page__suggested-blogs-mobile">
                  <SuggestedBlogs limit={3} />
                </div>

                <div className="pyq-page__content">
                  <table className="pyq-table pyq-table--subject">
                    <thead>
                      <tr>
                        <th scope="col" className="pyq-table__th col-cycle">Exam Cycle & Shift Paper</th>
                        <th scope="col" className="pyq-table__th col-action col-action-th">Practice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        // Skeleton rows during initial fetch to eliminate Cumulative Layout Shift (CLS)
                        [2024, 2023, 2022].map((skeletonYear) => (
                          <Fragment key={`skeleton-p2-group-${skeletonYear}`}>
                            <tr className="pyq-table__year-row">
                              <th scope="rowgroup" colSpan={2} className="pyq-table__year-td">
                                <div className="pyq-table__year-content">
                                  <div className="pyq-skeleton-line" style={{ width: '220px', height: '18px' }} />
                                  <div className="pyq-skeleton-line" style={{ width: '90px', height: '18px', borderRadius: '12px' }} />
                                </div>
                              </th>
                            </tr>
                            {[1, 2].map((sIndex) => (
                              <tr key={`skeleton-p2-row-${skeletonYear}-${sIndex}`} className="pyq-table__tr pyq-skeleton-row">
                                <td className="pyq-table__td">
                                  <div className="pyq-card-meta">
                                    <div className="pyq-skeleton-line pyq-skeleton-line--title" />
                                    <div className="pyq-skeleton-line pyq-skeleton-line--sub" />
                                  </div>
                                </td>
                                <td className="pyq-table__td col-action">
                                  <div className="pyq-skeleton-line pyq-skeleton-line--btn" />
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))
                      ) : hasError ? (
                        <tr>
                          <td colSpan={2}>
                            <div className="pyq-page__state-box">
                              <p className="pyq-page__state-msg">Unable to load Paper 2 question papers. Please check your internet connection.</p>
                              <button type="button" className="pyq-page__retry-btn" onClick={fetchAllSets}>
                                Retry Loading
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : sortedYears.length === 0 ? (
                        <tr>
                          <td colSpan={2}>
                            <div className="pyq-page__state-box">
                              <p className="pyq-page__state-msg">No question papers found for {activeSubject} Paper 2.</p>
                              <Link to="/paper2" className="pyq-page__retry-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                                View All Available Subjects
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        sortedYears.map(({ year, papers }, yearIndex) => (
                          <Fragment key={year}>
                            <tr className="pyq-table__year-row">
                              <th scope="rowgroup" colSpan={2} className="pyq-table__year-td">
                                <div className="pyq-table__year-content">
                                  <span className="pyq-table__year-title">UGC NET {year} {activeSubject} Papers</span>
                                  <span className="pyq-table__year-badge">
                                    {papers.length} {papers.length === 1 ? 'Paper' : 'Papers'} Available
                                  </span>
                                </div>
                              </th>
                            </tr>
                            {papers.map((paper) => (
                              <tr key={paper.id} className="pyq-table__tr">
                                <td className="pyq-table__td">
                                  <div className="pyq-card-meta">
                                    <span className="pyq-card-title pyq-card-title--desktop">
                                      {paper.seoTitle}
                                    </span>
                                    <span className="pyq-card-title pyq-card-title--mobile">
                                      UGC NET {year} {activeSubject} ({paper.cycle || paper.desktopTitle})
                                    </span>
                                    <div className="pyq-card-questions">
                                      {paper.questions || 100} Questions • 200 Marks • NTA CBT Pattern
                                    </div>
                                  </div>
                                </td>
                                <td className="pyq-table__td col-action">
                                  <Link 
                                    to="/mocktest"
                                    state={{ 
                                      paperId: paper.id, 
                                      title: paper.seoTitle, 
                                      subtitle: paper.cycle,
                                      questionsCount: paper.questions 
                                    }}
                                    className="pyq-table__btn" 
                                    aria-label={`Solve ${paper.seoTitle}`}
                                  >
                                    Solve Paper
                                  </Link>
                                </td>
                              </tr>
                            ))}
                            {adsEnabled && (yearIndex + 1) % 2 === 0 && (
                              <tr className="pyq-table__in-feed-ad-row">
                                <td colSpan={2} className="pyq-table__in-feed-ad-td">
                                  <AdSensePlaceholder type="display" format="horizontal" config={settings} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pyq-page__sidebar">
                <SuggestedBlogs limit={3} />
                {adsEnabled && (
                  <>
                    <AdSensePlaceholder type="display" format="rectangle" config={settings} />
                    <AdSensePlaceholder type="display" format="rectangle" config={settings} />
                    <div className="pyq-page__sidebar-sticky">
                      <AdSensePlaceholder type="display" format="rectangle" config={settings} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: ALL PAPER 2 SUBJECTS HUB / DIRECTORY (/paper2)                    */
          /* ========================================================================= */
          <>
            <div className="p2-hub-header">
              <div className="p2-hub-badge">UGC NET PAPER 2 SPECIALIZATION</div>
              <h1 className="pyq-page__title">Explore Paper 2 Core Subjects</h1>
              <p className="pyq-page__subtitle">
                Select your specialized discipline to practice authentic 100-question previous year papers (2020–2025), comprehensive question banks, and simulated CBT mock exams.
              </p>
            </div>

            {/* Quick Search Bar */}
            <div className="p2-search-container">
              <div className="p2-search-input-wrapper">
                <svg className="p2-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="p2-search-input"
                  placeholder="Search Paper 2 subjects by name or code (e.g., Sociology, Sindhi, Political Science, Commerce)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    className="p2-search-clear" 
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="pyq-page__layout">
              <div className="pyq-page__main-content">
                {/* 1. ACTIVE & AVAILABLE SUBJECT CARDS */}
                <section className="p2-active-section">
                  <div className="p2-section-title-row">
                    <div>
                      <h2 className="p2-section-heading">Available Paper 2 Disciplines</h2>
                      <p className="p2-section-sub">Full 100-question shift-wise solved papers with NTA test simulator & verified academic explanations.</p>
                    </div>
                    <span className="p2-active-count-badge">
                      {availableSubjectsList.length} Active {availableSubjectsList.length === 1 ? 'Subject' : 'Subjects'}
                    </span>
                  </div>

                  {isLoading ? (
                    <div className="p2-cards-grid">
                      {[1, 2, 3].map((n) => (
                        <div key={`skeleton-p2-card-${n}`} className="p2-subject-card p2-subject-card--skeleton">
                          <div className="pyq-skeleton-line" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '16px' }} />
                          <div className="pyq-skeleton-line" style={{ width: '70%', height: '22px', marginBottom: '8px' }} />
                          <div className="pyq-skeleton-line" style={{ width: '90%', height: '14px', marginBottom: '6px' }} />
                          <div className="pyq-skeleton-line" style={{ width: '60%', height: '14px', marginBottom: '20px' }} />
                          <div className="pyq-skeleton-line" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p2-cards-grid">
                      {availableSubjectsList
                        .filter(sub => !searchQuery || sub.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
                        .map((sub) => {
                          const hasPapers = sub.paperCount > 0
                          const yearText = sub.years && sub.years.length > 0 
                            ? sub.years.length === 1 ? `${sub.years[0]}` : `${Math.min(...sub.years)}–${Math.max(...sub.years)}`
                            : '2020–2025'

                          return (
                            <div key={sub.name} className="p2-subject-card">
                              <div className="p2-subject-card__top">
                                <div className="p2-subject-card__icon-box">
                                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                  </svg>
                                </div>
                                <div className="p2-subject-card__badges">
                                  {sub.code && <span className="p2-subject-card__code">Code {sub.code}</span>}
                                  <span className="p2-subject-card__status p2-subject-card__status--live">
                                    ● Available Now
                                  </span>
                                </div>
                              </div>

                              <h3 className="p2-subject-card__title">{sub.name}</h3>
                              <p className="p2-subject-card__desc">
                                {sub.description || `Official UGC NET Paper 2 ${sub.name} previous year question papers and mock tests.`}
                              </p>

                              <div className="p2-subject-card__meta-list">
                                <div className="p2-meta-item">
                                  <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span><strong>{hasPapers ? `${sub.paperCount} Solved Shift Papers` : 'Full Question Bank'}</strong> ({yearText})</span>
                                </div>
                                <div className="p2-meta-item">
                                  <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>100 Questions • 200 Marks • NTA CBT Mode</span>
                                </div>
                              </div>

                              <Link 
                                to={`/paper2?subject=${encodeURIComponent(sub.name)}`}
                                className="p2-subject-card__action-btn"
                              >
                                <span>Practice {sub.name} PYQs</span>
                                <span className="p2-btn-arrow">&rarr;</span>
                              </Link>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </section>

                {/* 2. ALL 83 UGC NET SUBJECTS DIRECTORY */}
                <section className="p2-directory-section">
                  <div className="p2-section-title-row">
                    <div>
                      <h2 className="p2-section-heading">UGC NET Paper 2 Subject Directory (All 83 Subjects)</h2>
                      <p className="p2-section-sub">We are continuously digitizing authentic NTA question papers for all core subjects. Click any available subject or explore the curriculum.</p>
                    </div>
                  </div>

                  <div className="p2-directory-table-wrapper">
                    <table className="p2-directory-table">
                      <thead>
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Discipline Category</th>
                          <th>Status / Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCatalog.map((subj) => {
                          const isLive = availableSubjectsList.some(
                            avail => normalizeSubject(avail.name) === normalizeSubject(subj.name) ||
                                     normalizeSubject(avail.name).includes(normalizeSubject(subj.name)) ||
                                     normalizeSubject(subj.name).includes(normalizeSubject(avail.name))
                          )

                          return (
                            <tr key={subj.code} className={`p2-dir-row ${isLive ? 'p2-dir-row--live' : ''}`}>
                              <td className="p2-dir-code">
                                <span className="p2-code-badge">Code {subj.code}</span>
                              </td>
                              <td className="p2-dir-name">
                                <strong>{subj.name}</strong>
                              </td>
                              <td className="p2-dir-category">
                                <span className="p2-category-pill">{subj.category}</span>
                              </td>
                              <td className="p2-dir-status">
                                {isLive ? (
                                  <Link 
                                    to={`/paper2?subject=${encodeURIComponent(subj.name)}`}
                                    className="p2-dir-solve-btn"
                                  >
                                    Solve PYQs &rarr;
                                  </Link>
                                ) : (
                                  <span className="p2-dir-badge p2-dir-badge--queued">
                                    Coming Soon
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 3. WHY PRACTICE PAPER 2 WITH UGC FREE PAPER */}
                <section className="p2-features-overview">
                  <h3 className="p2-features-title">Why Practice Paper 2 on UGC Free Paper?</h3>
                  <div className="p2-features-grid">
                    <div className="p2-feature-box">
                      <div className="p2-feature-icon">🎯</div>
                      <h4>200/300 Marks Weightage</h4>
                      <p>Paper 2 constitutes two-thirds of your overall UGC NET score. Domain expertise is key to qualifying JRF.</p>
                    </div>
                    <div className="p2-feature-box">
                      <div className="p2-feature-icon">💻</div>
                      <h4>Authentic CBT Simulator</h4>
                      <p>Experience the official NTA test screen layout, countdown timer, question palette, and instant review navigation.</p>
                    </div>
                    <div className="p2-feature-box">
                      <div className="p2-feature-icon">📖</div>
                      <h4>Deep Academic Explanations</h4>
                      <p>Every single question includes clear rationale, academic theories, and citation of classical concepts.</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <div className="pyq-page__sidebar">
                <SuggestedBlogs limit={3} />
                {adsEnabled && (
                  <>
                    <AdSensePlaceholder type="display" format="rectangle" config={settings} />
                    <AdSensePlaceholder type="display" format="rectangle" config={settings} />
                    <div className="pyq-page__sidebar-sticky">
                      <AdSensePlaceholder type="display" format="rectangle" config={settings} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Paper2PYQ
