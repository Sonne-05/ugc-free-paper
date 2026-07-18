import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import './PaperPYQ.css'

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

        {/* SEO Intro */}
        <section className="pyq-page__intro">
          <h2>Why Solve Paper 1 PYQs?</h2>
          <p>
            Practicing previous years' question papers is the most effective way to understand the pattern, difficulty level, and types of questions asked in UGC NET Paper 1. It helps in speed optimization, time management, and recognizing recurring concepts across all 10 general aptitude units.
          </p>
        </section>

        <div className="pyq-page__content">
          <table className="pyq-table">
            <thead>
              <tr>
                <th className="pyq-table__th col-year">Year</th>
                <th className="pyq-table__th col-cycle">Exam Cycle & Shift</th>
                <th className="pyq-table__th col-action">Practice</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedPapers)
                .sort((a, b) => b - a) // Show latest years first
                .map((year) => {
                  const yearPapers = groupedPapers[year]
                  return yearPapers.map((paper, index) => (
                    <tr key={paper.id} className="pyq-table__tr">
                      {/* Only render Year column for the first paper of that year, using rowspan */}
                      {index === 0 && (
                        <td 
                          className="pyq-table__td font-semibold pyq-table__td--year-group" 
                          rowSpan={yearPapers.length}
                        >
                          {year}
                        </td>
                      )}
                      <td className="pyq-table__td">
                        {paper.cycle} <span className="q-count">({paper.questions} Qs)</span>
                      </td>
                      <td className="pyq-table__td">
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
                  ))
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Paper1PYQ
