import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'
import './PaperPYQ.css'

const Paper1UnitPYQ = () => {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'UGC NET Paper I PYQs (Unit Wise) - UGC Free Paper'
  }, [])

  const units = [
    { 
      id: '1', 
      name: 'Teaching Aptitude', 
      fullName: 'Unit 1: Teaching Aptitude', 
      desc: 'Master teaching concepts, learning characteristics, methods, support systems, and evaluation methods.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    },
    { 
      id: '2', 
      name: 'Research Aptitude', 
      fullName: 'Unit 2: Research Aptitude', 
      desc: 'Master qualitative vs quantitative methodologies, steps of research, thesis formatting, and publication ethics.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      )
    },
    { 
      id: '3', 
      name: 'Comprehension', 
      fullName: 'Unit 3: Comprehension', 
      desc: 'Practice reading passages, summarizing arguments, and answering contextual vocabulary questions.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    { 
      id: '4', 
      name: 'Communication', 
      fullName: 'Unit 4: Communication', 
      desc: 'Master verbal & non-verbal communication channels, classroom communication dynamics, and barriers.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    { 
      id: '5', 
      name: 'Mathematical Reasoning & Aptitude', 
      fullName: 'Unit 5: Mathematical Reasoning', 
      desc: 'Practice number series, letter codes, relationship puzzles, speed, distance, time, and percentage calculations.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="15"></line>
          <line x1="15" y1="9" x2="9" y2="15"></line>
        </svg>
      )
    },
    { 
      id: '6', 
      name: 'Logical Reasoning', 
      fullName: 'Unit 6: Logical Reasoning', 
      desc: 'Crack arguments structure, deductive/inductive logic, Venn Diagrams, and Indian classical logic (Pramanas).',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      )
    },
    { 
      id: '7', 
      name: 'Data Interpretation', 
      fullName: 'Unit 7: Data Interpretation', 
      desc: 'Interpret complex quantitative data charts, table structures, bar graphs, and calculate percentage distributions.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    { 
      id: '8', 
      name: 'Information & Communication Technology (ICT)', 
      fullName: 'Unit 8: Information and Communication Technology', 
      desc: 'Learn high-frequency terminology, internet protocols, digital initiatives in higher education, and email standards.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      )
    },
    { 
      id: '9', 
      name: 'People, Development & Environment', 
      fullName: 'Unit 9: People, Development and Environment', 
      desc: 'Review MDGs, SDGs, human-environment interactions, pollution types, hazards, and international environment treaties.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
      )
    },
    { 
      id: '10', 
      name: 'Higher Education System', 
      fullName: 'Unit 10: Higher Education', 
      desc: 'Master evolution of ancient Indian learning, value education, administrative frameworks, governance, and policy systems.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
        </svg>
      )
    }
  ]

  const handleStartPractice = (unit) => {
    navigate('/mocktest', {
      state: {
        isUnitWise: true,
        unitName: unit.fullName,
        title: `Paper 1 - ${unit.name} (Session 1)`,
        subtitle: 'Unit-wise Practice PYQ',
        questionsCount: 25,
        skip: 0,
        limit: 25
      }
    })
  }

  return (
    <div className="pyq-page">
      <div className="pyq-page__container">
        <h1 className="pyq-page__title">UGC NET Paper I PYQs (Unit Wise)</h1>
        <p className="pyq-page__subtitle">Practice previous year questions organized by syllabus units.</p>

        <div className="pyq-page__layout">
          <div className="pyq-page__main-content">
            {/* SEO Intro */}
            <section className="pyq-page__intro">
              <h2>About Unit-wise Practice</h2>
              <p>
                Practicing previous years' questions (PYQs) organized by unit allows you to isolate specific areas of the UGC NET Paper 1 syllabus and strengthen your conceptual understanding. Master individual topic weights, test your speed, and review explanations for each question in a target-focused practice environment.
              </p>
            </section>

            <div className="pyq-page__content">
              <table className="pyq-table">
                <thead>
                  <tr>
                    <th className="pyq-table__th" style={{ width: '80px', textAlign: 'center' }}>Unit</th>
                    <th className="pyq-table__th col-cycle">Syllabus Unit Name & Description</th>
                    <th className="pyq-table__th col-action col-action-th">Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id} className="pyq-table__tr">
                      <td className="pyq-table__td font-semibold" style={{ textAlign: 'center', borderRight: '1px solid var(--border)', fontSize: '1.1rem' }}>
                        {unit.id}
                      </td>
                      <td className="pyq-table__td">
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                            {unit.name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {unit.desc}
                          </div>
                        </div>
                      </td>
                      <td className="pyq-table__td col-action">
                        <button 
                          className="pyq-table__btn"
                          onClick={() => handleStartPractice(unit)}
                        >
                          Practice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pyq-page__sidebar">
            <AdSensePlaceholder type="display" format="rectangle" />
            <div className="pyq-page__sidebar-sticky">
              <AdSensePlaceholder type="display" format="rectangle" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Paper1UnitPYQ
