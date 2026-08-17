import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'
import SuggestedBlogs from '../components/layout/SuggestedBlogs'
import { API_BASE_URL } from '../services/api'
import './PaperPYQ.css'
import './Paper1Notes.css'

const Paper1Notes = () => {
  const [studyNotesEnabled, setStudyNotesEnabled] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  
  const [units, setUnits] = useState([
    { 
      id: '1', 
      name: 'Teaching Aptitude', 
      seoTitle: 'Unit 1: Teaching Aptitude Notes & Concepts',
      badge: 'Levels of Teaching • Learner Psychology • Evaluation Systems • SWAYAM',
      desc: 'Complete revision notes on Memory, Understanding & Reflective teaching levels, learner characteristics, modern ICT support systems, Swayam, Swayam Prabha, and CBCS evaluation.',
      isAvailable: true
    },
    { 
      id: '2', 
      name: 'Research Aptitude', 
      seoTitle: 'Unit 2: Research Aptitude Notes & Methodology Guide',
      badge: 'Research Methods • Positivism • Thesis Formatting • Academic Ethics',
      desc: 'In-depth notes on qualitative vs quantitative research, experimental & historical methods, hypothesis testing, APA/MLA citation formatting, thesis writing, and research ethics.',
      isAvailable: true
    },
    { 
      id: '3', 
      name: 'Reading Comprehension', 
      seoTitle: 'Unit 3: Reading Comprehension Strategies & Notes',
      badge: 'Unseen Passages • Critical Analysis • Contextual Vocabulary • Skimming & Scanning',
      desc: 'Core strategies, passage mapping techniques, speed reading tricks, contextual vocabulary analysis, and inference extraction for 100% accuracy in RC.',
      isAvailable: true
    },
    { 
      id: '4', 
      name: 'Communication', 
      seoTitle: 'Unit 4: Communication Notes & Media Models',
      badge: 'Verbal & Non-Verbal • Classroom Dynamics • Barriers • Mass Media',
      desc: 'Concise summary of communication models, effective classroom communication, physiological/semantic/cultural barriers, and mass-media societal impact.',
      isAvailable: true
    },
    { 
      id: '5', 
      name: 'Mathematical Reasoning & Aptitude', 
      seoTitle: 'Unit 5: Mathematical Reasoning Formulas & Shortcuts',
      badge: 'Number Series • Coding-Decoding • Speed & Distance • Profit-Loss • Ratios',
      desc: 'Formulas and shortcut tricks for number & letter series, coding-decoding, blood relations, proportions, percentages, profit & loss, interest, and average problems.',
      isAvailable: true
    },
    { 
      id: '6', 
      name: 'Logical Reasoning', 
      seoTitle: 'Unit 6: Logical Reasoning & Indian Logic (Pramanas) Notes',
      badge: 'Classical Indian Logic • Pramanas • Square of Opposition • Fallacies',
      desc: 'Comprehensive guide to Pramanas (Pratyaksha, Anumana, Upamana, Shabda, Arthapatti, Anupalabdhi), Hetvabhasa fallacies, Aristotelian vs Nyaya syllogisms, and Square of Opposition.',
      isAvailable: true
    },
    { 
      id: '7', 
      name: 'Data Interpretation', 
      seoTitle: 'Unit 7: Data Interpretation (DI) Shortcuts & Notes',
      badge: 'Table Charts • Bar Graphs • Pie Charts • Percentage Calculation Shortcuts',
      desc: 'Step-by-step techniques and mental math formulas for calculating percentages, averages, and ratios across table charts, bar graphs, and line graphs.',
      isAvailable: true
    },
    { 
      id: '8', 
      name: 'Information & Communication Technology (ICT)', 
      seoTitle: 'Unit 8: ICT (Information & Communication Technology) Notes',
      badge: 'Digital Initiatives • Internet Basics • Memory Hierarchy • Cyber Security',
      desc: 'Essential terminology, computer memory hierarchy (RAM, ROM, Cache), networking protocols, digital higher education initiatives (DigiLocker, NAD, NDL), and email/cloud basics.',
      isAvailable: true
    },
    { 
      id: '9', 
      name: 'People, Development & Environment', 
      seoTitle: 'Unit 9: People, Development & Environment Notes',
      badge: 'MDGs & SDGs • Climate Protocols • Pollution Control • Renewable Energy',
      desc: 'High-yield notes on Millennium & Sustainable Development Goals, Paris Agreement, ISA, air/water quality indices, disaster management, and renewable energy targets.',
      isAvailable: true
    },
    { 
      id: '10', 
      name: 'Higher Education System', 
      seoTitle: 'Unit 10: Higher Education System & Policies Notes',
      badge: 'Ancient Universities • NEP 2020 • Regulatory Bodies • Value Education',
      desc: 'Detailed summary of ancient learning institutions (Takshashila, Nalanda, Vikramashila), post-independence commissions, NEP 2020 reforms, and UGC/AICTE/NAAC governance.',
      isAvailable: true
    }
  ])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'UGC NET Paper 1 Notes PDF (All 10 Units) - Free Study Material 2025 - UGC Free Paper'
    setIsAdmin(localStorage.getItem('userRole') === 'admin')

    const fetchSettings = fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings(data)
          if (data.studyNotesEnabled !== undefined) {
            setStudyNotesEnabled(data.studyNotesEnabled)
          }
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err))

    const fetchNotes = fetch(`${API_BASE_URL}/api/notes`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnits(prevUnits => 
            prevUnits.map(unit => {
              const matchedNote = data.find(n => String(n.id) === String(unit.id))
              return {
                ...unit,
                isAvailable: matchedNote ? matchedNote.isAvailable !== false : true
              }
            })
          )
        }
      })
      .catch(err => console.error('Failed to fetch notes availability:', err))

    Promise.all([fetchSettings, fetchNotes]).finally(() => {
      setSettingsLoading(false)
    })
  }, [])

  const adsEnabled = settings ? settings.adsenseEnabled : false

  if (settingsLoading) {
    return <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading study notes...</div>
  }

  if (!studyNotesEnabled && !isAdmin) {
    return (
      <div className="pyq-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚧</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>Section Under Construction</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            The Study Notes section is temporarily hidden while we complete data entry. Please check back soon!
          </p>
          <Link to="/" className="pyq-table__btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 24px' }}>
            Go Back to Home
          </Link>
        </div>
      </div>
    )
  }

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
                name: 'UGC NET Paper 1 Notes PDF & Study Material',
                item: 'https://ugcfreepaper.com/paper1-notes'
              }
            ]
          })
        }}
      />

      <div className="pyq-page__container">
        <h1 className="pyq-page__title">UGC NET Paper 1 Notes PDF & Study Material (All 10 Units)</h1>
        <p className="pyq-page__subtitle">Read comprehensive unit-wise study notes, high-yield concept summaries, and syllabus revision guides for UGC NET Paper 1 JRF preparation.</p>

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
              <h2>About UGC NET Paper 1 Study Notes & Preparation</h2>
              <p>
                UGC NET Paper 1 is a compulsory General Paper on Teaching and Research Aptitude, designed to assess cognitive abilities, teaching acumen, and research aptitude of candidates aspiring for Assistant Professorship and Junior Research Fellowship (JRF). The exam features 50 objective multiple-choice questions (100 marks total) with no negative marking.
              </p>
              <p style={{ marginTop: '10px' }}>
                Mastering all 10 syllabus units with concise, topic-wise summary notes ensures high accuracy and maximum speed during the CBT exam. Explore each unit below for detailed conceptual summaries, core frameworks, shortcut tricks, and syllabus breakdowns.
              </p>
            </section>

            {/* Mobile/Tablet suggested blogs */}
            <div className="pyq-page__suggested-blogs-mobile">
              <SuggestedBlogs limit={3} />
            </div>

            <div className="pyq-page__content">
              <table className="pyq-table pyq-table--unit">
                <thead>
                  <tr>
                    <th scope="col" className="pyq-table__th" style={{ width: '70px', textAlign: 'center' }}>Unit</th>
                    <th scope="col" className="pyq-table__th col-cycle">Syllabus Unit Name & Topic Details</th>
                    <th scope="col" className="pyq-table__th col-action col-action-th">Read Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit, index) => (
                    <Fragment key={unit.id}>
                      <tr className="pyq-table__tr">
                        <td className="pyq-table__td font-semibold" style={{ textAlign: 'center', borderRight: '1px solid var(--border)', fontSize: '1.1rem', color: 'var(--primary, #2563eb)' }}>
                          {unit.id}
                        </td>
                        <td className="pyq-table__td">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem', lineHeight: '1.4' }}>
                              {unit.seoTitle}
                            </div>
                            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                              {unit.desc}
                            </div>
                            <div className="pyq-card-questions" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                              {unit.badge}
                            </div>
                          </div>
                        </td>
                        <td className="pyq-table__td col-action">
                          {unit.isAvailable ? (
                            <Link 
                              to={`/paper1-notes/unit-${unit.id}`}
                              className="pyq-table__btn"
                              aria-label={`Read notes for ${unit.seoTitle}`}
                            >
                              Read Notes
                            </Link>
                          ) : (
                            <button 
                              className="pyq-table__btn pyq-table__btn--disabled"
                              disabled
                              aria-label={`${unit.seoTitle} Coming Soon`}
                            >
                              Coming Soon
                            </button>
                          )}
                        </td>
                      </tr>
                      {adsEnabled && index === 4 && (
                        <tr className="pyq-table__in-feed-ad-row">
                          <td colSpan={3} className="pyq-table__in-feed-ad-td">
                            <AdSensePlaceholder type="display" format="horizontal" config={settings} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SEO & User FAQ Section */}
            <section className="notes-page__faqs">
              <h2 className="faqs-title">Frequently Asked Questions (FAQs)</h2>
              <div className="faq-item">
                <h3 className="faq-question">What is the syllabus pattern of UGC NET Paper 1?</h3>
                <p className="faq-answer">
                  Paper 1 consists of 10 units: Teaching Aptitude, Research Aptitude, Reading Comprehension, Communication, Mathematical Reasoning, Logical Reasoning, Data Interpretation, Information & Communication Technology (ICT), People & Environment, and Higher Education System.
                </p>
              </div>
              <div className="faq-item">
                <h3 className="faq-question">Are the study notes aligned with the latest NTA guidelines?</h3>
                <p className="faq-answer">
                  Yes, our preparation notes, key formulas, conceptual frameworks, and practice strategies are curated according to the latest National Testing Agency (NTA) syllabus and recent PYQ exam trends.
                </p>
              </div>
              <div className="faq-item">
                <h3 className="faq-question">How should I use these unit-wise notes effectively?</h3>
                <p className="faq-answer">
                  We recommend reading the high-yield summary notes for a specific unit, memorizing the core concepts and formulas, and then attempting unit-wise PYQ practice tests to assess your speed and retention.
                </p>
              </div>
            </section>
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

export default Paper1Notes
