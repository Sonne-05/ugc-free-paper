import { Link } from 'react-router-dom'
import { useState, useEffect, Fragment } from 'react'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'
import SuggestedBlogs from '../components/layout/SuggestedBlogs'
import { API_BASE_URL } from '../services/api'
import './PaperPYQ.css'

const Paper1UnitPYQ = () => {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    // Fetch dynamic platform settings
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data)
      })
      .catch(err => console.error('Failed to fetch settings:', err))
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'UGC NET Paper 1 Unit Wise PYQ Practice & Mock Tests (All 10 Units) - UGC Free Paper'
  }, [])

  const units = [
    { 
      id: '1', 
      name: 'Unit 1: Teaching Aptitude', 
      seoTitle: 'UGC NET Unit 1: Teaching Aptitude Solved PYQs & MCQs',
      badge: 'Levels of Teaching • Learner Psychology • Evaluation Systems',
      desc: 'Practice official solved previous year questions (PYQs) on Memory, Understanding & Reflective levels of teaching, learner characteristics, Swayam, Swayam Prabha, and CBCS evaluation systems.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    },
    { 
      id: '2', 
      name: 'Unit 2: Research Aptitude', 
      seoTitle: 'UGC NET Unit 2: Research Aptitude Solved PYQs & Methodology Questions',
      badge: 'Research Methods • Positivism • Thesis Formatting • Ethics',
      desc: 'Master qualitative vs quantitative research, hypothesis formulation, experimental & historical methods, APA formatting, thesis writing, and academic publication ethics.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      )
    },
    { 
      id: '3', 
      name: 'Unit 3: Reading Comprehension', 
      seoTitle: 'UGC NET Unit 3: Reading Comprehension PYQs & Solved Passages',
      badge: 'Unseen Passages • Critical Analysis • Contextual Vocabulary',
      desc: 'Practice UGC NET unseen comprehension passages with step-by-step reading strategies, main-idea extraction, and contextual multiple-choice questions.',
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
      name: 'Unit 4: Communication', 
      seoTitle: 'UGC NET Unit 4: Communication Solved PYQs & Classroom Dynamics',
      badge: 'Verbal & Non-Verbal • Barriers • Intercultural • Mass Media',
      desc: 'Practice questions on types of communication, effective classroom communication, semantic & psychological barriers, and mass-media society interactions.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    { 
      id: '5', 
      name: 'Unit 5: Mathematical Reasoning and Aptitude', 
      seoTitle: 'UGC NET Unit 5: Mathematical Reasoning & Aptitude Solved PYQs',
      badge: 'Number Series • Coding-Decoding • Speed & Distance • Profit-Loss',
      desc: 'Master numerical aptitude with solved PYQs on letter series, coding-decoding, blood relations, ratios, percentages, time-speed-distance, and simple/compound interest.',
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
      name: 'Unit 6: Logical Reasoning', 
      seoTitle: 'UGC NET Unit 6: Logical Reasoning PYQs (Pramanas & Syllogisms)',
      badge: 'Classical Indian Logic • Venn Diagrams • Formal Fallacies • Deductive',
      desc: 'Solve high-yield questions on structure of arguments, categorical propositions, formal & informal fallacies, Venn diagrams, and Indian Logic (Pratyaksha, Anumana, Upamana, Shabda, Arthapatti, Anupalabdhi).',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      )
    },
    { 
      id: '7', 
      name: 'Unit 7: Data Interpretation', 
      seoTitle: 'UGC NET Unit 7: Data Interpretation (DI) Solved Questions & Tables',
      badge: 'Table Charts • Bar Graphs • Pie Charts • Percentage Calculation',
      desc: 'Practice full 5-question Data Interpretation sets based on authentic NTA table charts, percentage changes, ratios, and quantitative analysis techniques.',
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
      name: 'Unit 8: Information and Communication Technology (ICT)', 
      seoTitle: 'UGC NET Unit 8: ICT (Information & Communication Technology) PYQs',
      badge: 'Digital Initiatives • Internet & Email • Digital Governance • Terminology',
      desc: 'Solve high-frequency questions on ICT abbreviations, computer memory, networking basics, Swayam, Swayam Prabha, digital higher education initiatives, and cyber security.',
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
      name: 'Unit 9: People, Development and Environment', 
      seoTitle: 'UGC NET Unit 9: People, Development & Environment Solved PYQs',
      badge: 'MDGs & SDGs • Environmental Treaties • Pollution • Renewable Energy',
      desc: 'Practice official PYQs on Millennium & Sustainable Development Goals, Kyoto Protocol, Paris Agreement, International Solar Alliance, renewable energy sources, and air/water pollutants.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
      )
    },
    { 
      id: '10', 
      name: 'Unit 10: Higher Education System', 
      seoTitle: 'UGC NET Unit 10: Higher Education System Solved PYQs & Policies',
      badge: 'Ancient Learning • NEP 2020 • Value Education • Regulatory Governance',
      desc: 'Master UGC NET questions on ancient Indian universities (Takshashila, Nalanda), NEP 2020 recommendations, UGC/AICTE regulations, and higher educational policy governance.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
        </svg>
      )
    }
  ]

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
                name: 'UGC NET Paper 1 Unit Wise PYQ Practice',
                item: 'https://ugcfreepaper.com/paper1-unit-pyq'
              }
            ]
          })
        }}
      />

      <div className="pyq-page__container">
        <h1 className="pyq-page__title">UGC NET Paper 1 Unit-Wise PYQs & Topic Practice Tests (All 10 Units)</h1>
        <p className="pyq-page__subtitle">Practice topic-wise UGC NET Paper 1 previous year questions with verified answer keys, full explanations, and NTA CBT test mode.</p>

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
              <h2>About UGC NET Paper 1 Unit-Wise PYQ Practice</h2>
              <p>
                Practicing previous years' questions (PYQs) organized by unit allows you to isolate specific areas of the UGC NET Paper 1 syllabus and strengthen your conceptual understanding. Master individual topic weights, test your speed, and review explanations for each question in a target-focused practice environment.
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
                    <th scope="col" className="pyq-table__th col-action col-action-th">Practice</th>
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
                          <Link 
                            to="/mocktest"
                            state={{
                              isUnitWise: true,
                              unitName: unit.name,
                              title: `Paper 1 - ${unit.name} Practice Questions`,
                              subtitle: 'Unit-wise Practice PYQ',
                              questionsCount: 25,
                              skip: 0,
                              limit: 25
                            }}
                            className="pyq-table__btn"
                            aria-label={`Practice ${unit.seoTitle}`}
                          >
                            Practice
                          </Link>
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

export default Paper1UnitPYQ
