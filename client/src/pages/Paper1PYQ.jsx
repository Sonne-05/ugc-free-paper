import { Link } from 'react-router-dom'
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

const cleanExamTitle = (subtitle) => {
  if (!subtitle) return ''
  let cleaned = subtitle
    .replace(/^UGC\s+NET\s+Paper\s+(1|I|II|2|one|two)\s+([a-zA-Z\s]+?)\s*Previous\s+Year\s+Question\s+Paper\s*/i, '')
    .replace(/^UGC\s+NET\s+Paper\s+(1|I|II|2|one|two)\s*Previous\s+Year\s+Question\s+Paper\s*/i, '')
    .replace(/^UGC\s+NET\s+Previous\s+Year\s+Question\s+Paper\s*/i, '')
    .replace(/^General\s+Paper\s+\d{4}\s*/i, '')
    .replace(/^General\s+Paper\s*/i, '')
    .replace(/^Previous\s+Year\s+Question\s+Paper\s*/i, '')
    .replace(/\s*-\s*Free\s+Mock\s+Test\s*$/i, '')
    .replace(/\s*Free\s+Mock\s+Test\s*$/i, '')
    .trim()
  
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned || subtitle
}

const Paper1PYQ = () => {
  const [papersData, setPapersData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data)
      })
      .catch(err => console.error('Failed to fetch settings:', err))
  }, [])

  const fetchPyqSets = useCallback(() => {
    setIsLoading(true)
    setHasError(false)
    fetch(`${API_BASE_URL}/api/pyqsets`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch pyq sets')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPapersData(data.filter(set => set.paperType === 'Paper I'))
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
    fetchPyqSets()
  }, [fetchPyqSets])

  // Memoize grouped and pre-sorted papers to prevent re-sorting on every render
  const sortedYears = useMemo(() => {
    const grouped = {}
    papersData.forEach(set => {
      if (!grouped[set.year]) grouped[set.year] = []
      
      const cleanedCycle = cleanExamTitle(set.subtitle)
      const desktopTitle = set.subtitle
        ? set.subtitle.replace(/^General\s+Paper\s+\d{4}\s*/i, '').replace(/^General\s+Paper\s*/i, '')
        : ''

      grouped[set.year].push({
        id: set.id,
        cycle: cleanedCycle,
        desktopTitle: desktopTitle,
        seoTitle: `UGC NET ${set.year} Paper 1 Solved Question Paper (${cleanedCycle || desktopTitle})`,
        questions: set.questionsCount,
        title: set.title
      })
    })

    const years = Object.keys(grouped).sort((a, b) => b - a)
    return years.map(year => ({
      year,
      papers: grouped[year].sort((a, b) => getSortValue(a) - getSortValue(b))
    }))
  }, [papersData])

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
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://ugcfreepaper.com/'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'UGC NET Paper 1 PYQs',
                item: 'https://ugcfreepaper.com/paper1'
              }
            ]
          })
        }}
      />

      <div className="pyq-page__container">
        <h1 className="pyq-page__title">UGC NET Paper 1 Solved PYQs & Free CBT Mock Tests (2020–2025)</h1>
        <p className="pyq-page__subtitle">Solve official NTA year-wise Previous Year Question papers with step-by-step academic solutions and authentic exam timer.</p>

        {/* Top Leaderboard Ad */}
        {adsEnabled && (
          <div className="pyq-page__top-ad">
            <AdSensePlaceholder type="display" format="horizontal" config={settings} />
          </div>
        )}

        <div className="pyq-page__layout">
          <div className="pyq-page__main-content">
            {/* SEO Intro */}
            <section className="pyq-page__intro">
              <h2>Why Solve Official UGC NET Paper 1 PYQs?</h2>
              <p>
                Practicing previous years' question papers (2020–2025) is the most effective way to understand the pattern, difficulty level, and types of questions asked in UGC NET Paper 1. It helps in speed optimization, time management, and recognizing recurring concepts across all 10 general aptitude units.
              </p>
            </section>

            {/* Mobile/Tablet suggested blogs */}
            <div className="pyq-page__suggested-blogs-mobile">
              <SuggestedBlogs limit={3} />
            </div>

            <div className="pyq-page__content">
              <table className="pyq-table pyq-table--year">
                <thead>
                  <tr>
                    <th scope="col" className="pyq-table__th col-cycle">Exam Cycle & Shift Paper</th>
                    <th scope="col" className="pyq-table__th col-action col-action-th">Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // Skeleton rows during initial fetch to eliminate Cumulative Layout Shift (CLS)
                    [2025, 2024, 2023].map((skeletonYear) => (
                      <Fragment key={`skeleton-group-${skeletonYear}`}>
                        <tr className="pyq-table__year-row">
                          <th scope="rowgroup" colSpan={2} className="pyq-table__year-td">
                            <div className="pyq-table__year-content">
                              <div className="pyq-skeleton-line" style={{ width: '190px', height: '18px' }} />
                              <div className="pyq-skeleton-line" style={{ width: '90px', height: '18px', borderRadius: '12px' }} />
                            </div>
                          </th>
                        </tr>
                        {[1, 2].map((sIndex) => (
                          <tr key={`skeleton-row-${skeletonYear}-${sIndex}`} className="pyq-table__tr pyq-skeleton-row">
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
                          <p className="pyq-page__state-msg">Unable to load Paper 1 question papers. Please check your internet connection.</p>
                          <button type="button" className="pyq-page__retry-btn" onClick={fetchPyqSets}>
                            Retry Loading
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : sortedYears.length === 0 ? (
                    <tr>
                      <td colSpan={2}>
                        <div className="pyq-page__state-box">
                          <p className="pyq-page__state-msg">No question papers found for Paper 1.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedYears.map(({ year, papers }, yearIndex) => (
                      <Fragment key={year}>
                        <tr className="pyq-table__year-row">
                          <th scope="rowgroup" colSpan={2} className="pyq-table__year-td">
                            <div className="pyq-table__year-content">
                              <span className="pyq-table__year-title">UGC NET {year} Question Papers</span>
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
                                  UGC NET {year} Paper 1 ({paper.cycle || paper.desktopTitle})
                                </span>
                                <div className="pyq-card-questions">
                                  {paper.questions || 50} Questions • 100 Marks • NTA CBT Pattern
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
      </div>
    </div>
  )
}

export default Paper1PYQ
