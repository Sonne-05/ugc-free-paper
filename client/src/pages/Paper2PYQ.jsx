import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import './PaperPYQ.css'

const Paper2PYQ = () => {
  const navigate = useNavigate()
  const [groupedPapers, setGroupedPapers] = useState({})

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/pyqsets`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const paper2Sets = data.filter(set => set.paperType === 'Paper II')
          const grouped = {}
          paper2Sets.forEach(set => {
            if (!grouped[set.year]) grouped[set.year] = []
            grouped[set.year].push({
              id: set.id,
              subject: 'Sociology',
              cycle: set.subtitle,
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
        <h1 className="pyq-page__title">UGC NET Paper II Sociology PYQs</h1>
        <p className="pyq-page__subtitle">Solve official year-wise UGC NET Sociology Previous Year Question papers.</p>

        {/* SEO Intro */}
        <section className="pyq-page__intro">
          <h2>Master Paper II Sociology</h2>
          <p>
            Paper 2 Sociology tests your depth of knowledge in sociological theories, research methodology, social institutions, and developments in India. Regularly solving Sociology previous years' question papers allows you to analyze question patterns and maximize your JRF qualification rate.
          </p>
        </section>

        <div className="pyq-page__content">
          <table className="pyq-table">
            <thead>
              <tr>
                <th className="pyq-table__th col-year">Year</th>
                <th className="pyq-table__th col-cycle">Subject & Cycle</th>
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
                        <span className="subject-badge">{paper.subject}</span>
                        <span className="cycle-text">{paper.cycle}</span>
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

export default Paper2PYQ
