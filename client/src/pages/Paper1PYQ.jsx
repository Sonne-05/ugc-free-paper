import { useNavigate } from 'react-router-dom'
import { useState, useEffect, Fragment } from 'react'
import { API_BASE_URL } from '../services/api'
import AdSensePlaceholder, { ENABLE_ADSENSE } from '../components/layout/AdSensePlaceholder'
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
    month = monthMap[match1[2]]
  } else {
    // Format 2: 02 jan or 25 june or 31 december
    const match2 = subtitle.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)
    if (match2) {
      day = parseInt(match2[1], 10)
      month = monthMap[match2[2]]
    } else {
      // Format 3: just month name like "june morning shift"
      const match3 = subtitle.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)
      if (match3) {
        month = monthMap[match3[1]]
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

const Paper1PYQ = () => {
  const navigate = useNavigate()
  const [groupedPapers, setGroupedPapers] = useState({})

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/pyqsets`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const paper1Sets = data.filter(set => set.paperType === 'Paper I')
          const grouped = {}
          paper1Sets.forEach(set => {
            if (!grouped[set.year]) grouped[set.year] = []
            
            const cleanedCycle = set.subtitle
              ? set.subtitle.replace(/^General\s+Paper\s+\d{4}\s*/i, '').replace(/^General\s+Paper\s*/i, '')
              : ''

            grouped[set.year].push({
              id: set.id,
              cycle: cleanedCycle,
              questions: set.questionsCount,
              title: set.title
            })
          })
          setGroupedPapers(grouped)
        }
      })
      .catch(err => console.error('Failed to fetch pyq sets:', err))
  }, [])

  return (
    <div className="pyq-page">
      <div className="pyq-page__container">
        <h1 className="pyq-page__title">UGC NET Paper I PYQs</h1>
        <p className="pyq-page__subtitle">Solve official year-wise Previous Year Question papers for general teaching & research aptitude.</p>

        {/* Top Leaderboard Ad */}
        {ENABLE_ADSENSE && (
          <div className="pyq-page__top-ad">
            <AdSensePlaceholder type="display" format="horizontal" />
          </div>
        )}

        <div className="pyq-page__layout">
          <div className="pyq-page__main-content">
            {/* SEO Intro */}
            <section className="pyq-page__intro">
              <h2>Why Solve Paper 1 PYQs?</h2>
              <p>
                Practicing previous years' question papers is the most effective way to understand the pattern, difficulty level, and types of questions asked in UGC NET Paper 1. It helps in speed optimization, time management, and recognizing recurring concepts across all 10 general aptitude units.
              </p>
            </section>

            {/* Mobile/Tablet suggested blogs */}
            <div className="pyq-page__suggested-blogs-mobile">
              <SuggestedBlogs limit={3} />
            </div>

            <div className="pyq-page__content">
              <table className="pyq-table">
                <thead>
                  <tr>
                    <th className="pyq-table__th col-cycle">Exam Cycle & Shift</th>
                    <th className="pyq-table__th col-action col-action-th">Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedPapers)
                    .sort((a, b) => b - a) // Show latest years first
                    .map((year) => {
                      const yearPapers = [...groupedPapers[year]].sort((a, b) => getSortValue(a) - getSortValue(b))
                      return (
                        <Fragment key={year}>
                          <tr className="pyq-table__year-row">
                            <td colSpan={2} className="pyq-table__year-td">
                              <div className="pyq-table__year-content">
                                <span className="pyq-table__year-title">{year} Papers</span>
                                <span className="pyq-table__year-badge">
                                  {yearPapers.length} {yearPapers.length === 1 ? 'Paper' : 'Papers'}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {yearPapers.map((paper) => (
                            <tr key={paper.id} className="pyq-table__tr">
                              <td className="pyq-table__td">
                                {paper.cycle}
                              </td>
                              <td className="pyq-table__td col-action">
                                <button 
                                  className="pyq-table__btn" 
                                  onClick={() => navigate('/mocktest', { 
                                    state: { 
                                      paperId: paper.id, 
                                      title: paper.title, 
                                      subtitle: paper.cycle,
                                      questionsCount: paper.questions 
                                    } 
                                  })}
                                >
                                  Solve Paper
                                </button>
                              </td>
                            </tr>
                          ))}
                          {ENABLE_ADSENSE && (
                            <tr className="pyq-table__in-feed-ad-row">
                              <td colSpan={2} className="pyq-table__in-feed-ad-td">
                                <AdSensePlaceholder type="display" format="horizontal" />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pyq-page__sidebar">
            <SuggestedBlogs limit={3} />
            {ENABLE_ADSENSE && (
              <>
                <AdSensePlaceholder type="display" format="rectangle" />
                <AdSensePlaceholder type="display" format="rectangle" />
                <div className="pyq-page__sidebar-sticky">
                  <AdSensePlaceholder type="display" format="rectangle" />
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
