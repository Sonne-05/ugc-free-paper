import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import { paper1NotesData } from '../data/paper1NotesData'
import UnitNotesTemplate from '../components/UnitNotesTemplate'
import './UnitNotes.css'

const UnitNotes = () => {
  const { unitId } = useParams()
  const navigate = useNavigate()
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [customData, setCustomData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Extract number from param (e.g. "unit-1" -> "1")
  const cleanedId = unitId?.replace('unit-', '') || ''
  const fallbackUnit = paper1NotesData[cleanedId]

  // Scroll to top and fetch custom data
  useEffect(() => {
    window.scrollTo(0, 0)
    
    // Fetch custom note data from local backend
    setLoading(true)
    fetch(`${API_BASE_URL}/api/notes/${cleanedId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        setCustomData(data)
        setLoading(false)
      })
      .catch(err => {
        setCustomData(null)
        setLoading(false)
      })
  }, [unitId, cleanedId])

  if (loading) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>Loading notes...</div>
  }

  // If custom JSON data exists, render the template
  if (customData) {
    return <UnitNotesTemplate data={customData} />
  }

  // Fallback to original logic if no custom JSON data
  if (!fallbackUnit && cleanedId !== '1') {
    return (
      <div className="notes-detail-error">
        <h2>Unit Not Found</h2>
        <p>The requested study unit notes could not be located.</p>
        <Link to="/paper1-notes" className="btn-back">Back to Notes Index</Link>
      </div>
    )
  }

  const unit = fallbackUnit;

  const handleSelectOption = (questionIndex, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: option
    }))
  }

  // Render static HTML file for Unit 1
  if (cleanedId === '1') {
    return (
      <div style={{ width: '100%', height: '100vh', paddingTop: '56px', overflow: 'hidden', boxSizing: 'border-box' }}>
        <iframe 
          src="/notes/Unit%201%20P1%20notes.html" 
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="Unit 1 Notes"
        />
      </div>
    )
  }

  return (
    <div className="unit-notes">
      <div className="unit-notes__container">
        <Link to="/paper1-notes" className="unit-notes__back-link">
          &larr; Back to Paper I Notes
        </Link>

        <header className="unit-notes__header">
          <span className="unit-notes__badge">Syllabus Guide</span>
          <h1 className="unit-notes__title">{unit.title}</h1>
          <p className="unit-notes__overview">{unit.overview}</p>
        </header>

        <main className="unit-notes__content">
          {/* Key Topics Section */}
          <section className="unit-notes__section">
            <h2 className="unit-notes__section-title">Core Study Topics</h2>
            <div className="unit-notes__topics-list">
              {unit.topics.map((topic, index) => (
                <div key={index} className="unit-notes__topic-card">
                  <h3 className="unit-notes__topic-title">{topic.title}</h3>
                  <p className="unit-notes__topic-content">{topic.content}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Preparation Tips Section */}
          <section className="unit-notes__section unit-notes__section--tips">
            <h2 className="unit-notes__section-title">Preparation Strategy & Tips</h2>
            <ul className="unit-notes__tips-list">
              {unit.tips.map((tip, index) => (
                <li key={index} className="unit-notes__tip-item">{tip}</li>
              ))}
            </ul>
          </section>

          {/* Practice Questions Section */}
          <section className="unit-notes__section">
            <h2 className="unit-notes__section-title">High-Yield Practice Questions</h2>
            <p className="unit-notes__section-subtitle">Test your understanding of {unit.title} concepts with these typical exam questions:</p>
            
            <div className="unit-notes__questions-list">
              {unit.questions.map((q, qIndex) => {
                const selected = selectedAnswers[qIndex]
                return (
                  <div key={qIndex} className="unit-notes__q-card">
                    <h3 className="unit-notes__q-text">
                      <span className="unit-notes__q-num">Q{qIndex + 1}.</span> {q.question}
                    </h3>
                    <div className="unit-notes__options-grid">
                      {q.options.map((option, oIndex) => {
                        const isSelected = selected === option
                        const isCorrect = option === q.answer
                        let optionClass = 'unit-notes__option'
                        
                        if (selected) {
                          if (isSelected) {
                            optionClass += isCorrect ? ' unit-notes__option--correct' : ' unit-notes__option--incorrect'
                          } else if (isCorrect) {
                            optionClass += ' unit-notes__option--highlight-correct'
                          } else {
                            optionClass += ' unit-notes__option--disabled'
                          }
                        }

                        return (
                          <button
                            key={oIndex}
                            className={optionClass}
                            disabled={!!selected}
                            onClick={() => handleSelectOption(qIndex, option)}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                    {selected && (
                      <div className="unit-notes__feedback">
                        {selected === q.answer ? (
                          <span className="feedback-text feedback-text--correct">✓ Correct Answer!</span>
                        ) : (
                          <span className="feedback-text feedback-text--incorrect">✗ Incorrect. Correct: {q.answer}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default UnitNotes
