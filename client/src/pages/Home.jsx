import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'
import { API_BASE_URL } from '../services/api'
import './Home.css'

const Home = () => {
  const isLoggedIn = typeof localStorage !== 'undefined' ? localStorage.getItem('isLoggedIn') === 'true' : false
  const [activeFaq, setActiveFaq] = useState(null)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.settings) setSettings(data.settings)
      })
      .catch(() => {})
  }, [])

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  const paper1Units = [
    { id: 'unit-1', num: 'Unit 1', title: 'Teaching Aptitude', topics: 'Learner characteristics, Teaching methods, Evaluation systems, Swayam/Moocs', path: '/paper1-notes/unit-1' },
    { id: 'unit-2', num: 'Unit 2', title: 'Research Aptitude', topics: 'Positivism, Methods of research, Thesis writing, Ethics, Plagiarism', path: '/paper1-notes/unit-2' },
    { id: 'unit-3', num: 'Unit 3', title: 'Reading Comprehension', topics: 'Passage analysis, Inference extraction, Contextual vocabulary', path: '/paper1-unit-pyq' },
    { id: 'unit-4', num: 'Unit 4', title: 'Communication', topics: 'Types of communication, Barriers, Mass-media and society, Intercultural', path: '/paper1-notes/unit-4' },
    { id: 'unit-5', num: 'Unit 5', title: 'Mathematical Reasoning', topics: 'Number series, Coding, Fractions, Ratio, Percentage, Profit & Loss', path: '/paper1-unit-pyq' },
    { id: 'unit-6', num: 'Unit 6', title: 'Logical Reasoning', topics: 'Square of opposition, Deductive/Inductive, Fallacies, Indian Logic (Pramanas)', path: '/paper1-notes/unit-6' },
    { id: 'unit-7', num: 'Unit 7', title: 'Data Interpretation (DI)', topics: 'Table charts, Bar graphs, Pie charts, Percentage analysis, Trend analysis', path: '/paper1-unit-pyq' },
    { id: 'unit-8', num: 'Unit 8', title: 'ICT', topics: 'General abbreviations, Internet basics, Digital initiatives, NEP 2020 tech', path: '/paper1-notes/unit-8' },
    { id: 'unit-9', num: 'Unit 9', title: 'People, Dev & Environment', topics: 'MDGs, SDGs, Air/Water Pollution, Climate Change, International Solar Alliance', path: '/paper1-notes/unit-9' },
    { id: 'unit-10', num: 'Unit 10', title: 'Higher Education System', topics: 'Ancient universities (Takshashila, Nalanda), Governance, NEP 2020, Regulatory bodies', path: '/paper1-notes/unit-10' }
  ]

  const comparisonFeatures = [
    {
      feature: 'Access & Pricing',
      other: '₹2,000 – ₹5,999 / year subscription paywall',
      ugc: '100% Free Forever — Zero Hidden Fees'
    },
    {
      feature: 'NTA CBT Exam Simulator',
      other: 'Generic quiz interface without actual exam layout',
      ugc: 'Pixel-perfect NTA CBT Palette, Timer & Question Layout'
    },
    {
      feature: 'Full-Length Solved PYQs',
      other: 'Only 1-2 free sample tests; remainder locked',
      ugc: 'Complete 100-Question Year Papers (2020–2025)'
    },
    {
      feature: 'Solution Quality',
      other: 'Brief 1-line answer key without deep context',
      ugc: '150-word Step-by-Step Academic Reasoning & References'
    },
    {
      feature: 'Bilingual Support (Hindi / Sindhi / English)',
      other: 'Often mixed, fragmented, or poorly translated',
      ugc: 'Clean English, Hindi Devanagari & Sindhi Devanagari'
    },
    {
      feature: 'Sign-up Friction & Marketing Spam',
      other: 'Aggressive sales calls, phone number gating',
      ugc: 'Zero Spam Calls • Instant 1-Click Practice'
    }
  ]

  const faqs = [
    {
      q: 'Why is UGC Free Paper completely free?',
      a: 'Our mission is to democratize higher education exam preparation in India. High-quality UGC NET and JRF test preparation should not be locked behind costly ₹5,000 paywalls. We provide full-length NTA mock tests, unit-wise notes, and authentic previous year papers completely free for all aspirants.'
    },
    {
      q: 'Is the mock test interface identical to the real NTA UGC NET exam?',
      a: 'Yes. Our Computer Based Test (CBT) engine replicates the exact NTA exam screen—including the 4-color status palette (Answered, Not Answered, Marked for Review, Not Visited), section switcher, question navigation, countdown timers, and final submission summaries.'
    },
    {
      q: 'Does UGC NET have negative marking in Paper 1 or Paper 2?',
      a: 'No. As per National Testing Agency (NTA) guidelines, there is no negative marking in either Paper 1 or Paper 2. Each correct question awards +2 marks. Unattempted or incorrect answers receive 0 marks. Aspirants should attempt all questions.'
    },
    {
      q: 'What are the qualifying criteria and fellowship for Junior Research Fellowship (JRF)?',
      a: 'Candidates who score above the top percentile cutoff qualify for JRF. Successful JRF awardees receive a monthly government research stipend of ₹37,000/month (plus HRA) for the first two years (JRF), progressing to ₹42,000/month for Senior Research Fellowship (SRF).'
    },
    {
      q: 'How can I practice both Paper 1 (General Paper) and Paper 2 (Subject Core)?',
      a: 'You can navigate to "Paper I (PYQ)" for year-wise full papers, "Unit-Wise PYQs" for topic drilling across all 10 general aptitude units, and "Core Paper (PYQ)" for specialized subjects like Sociology, Sindhi, Political Science, and more.'
    }
  ]

  return (
    <div className="home-page">
      {/* 1. HERO SECTION */}
      <section className="hero-sec">
        <div className="hero-sec__container">
          <div className="hero-sec__content">
            <div className="hero-sec__badge">
              <span className="hero-sec__badge-dot" />
              <span>OFFICIAL NTA CBT PATTERN (2024–2025)</span>
            </div>

            <h1 className="hero-sec__title">
              Crack UGC NET & JRF with <span className="hero-sec__title--highlight">100% Free</span> Mock Tests & Solved PYQs
            </h1>

            <p className="hero-sec__subtitle">
              Stop paying ₹3,000–₹5,000 for mock test subscriptions. Practice with the authentic NTA Computer Based Test (CBT) interface, 15,000+ verified previous year questions (2020–2025), and step-by-step academic solutions.
            </p>

            <div className="hero-sec__actions">
              <Link to="/paper1" className="hero-sec__btn hero-sec__btn--primary">
                <span>Start Paper 1 Mock Test</span>
                <span className="hero-sec__btn-arrow">&rarr;</span>
              </Link>
              <Link to="/paper2" className="hero-sec__btn hero-sec__btn--secondary">
                Explore Paper 2 Subjects
              </Link>
              <Link to="/paper1-notes" className="hero-sec__btn hero-sec__btn--outline">
                Unit Notes (All 10 Units)
              </Link>
            </div>

            <div className="hero-sec__trust-row">
              <div className="hero-sec__trust-item">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>100% Free Forever</span>
              </div>
              <div className="hero-sec__trust-item">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Zero Paywalls / No Cards</span>
              </div>
              <div className="hero-sec__trust-item">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>100k+ Aspirants</span>
              </div>
            </div>
          </div>

          <div className="hero-sec__visual">
            <div className="hero-cbt-preview">
              <div className="hero-cbt-preview__bar">
                <div className="hero-cbt-preview__dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <span className="hero-cbt-preview__title">NTA Examination Simulator</span>
                <span className="hero-cbt-preview__timer">⏱ 02:59:45</span>
              </div>
              <div className="hero-cbt-preview__body">
                <div className="hero-cbt-preview__question-area">
                  <span className="hero-cbt-preview__qnum">Question 1 (Paper I General)</span>
                  <p className="hero-cbt-preview__qtext">
                    Which of the following levels of teaching involves reflective and problem-solving cognitive abilities of the learner?
                  </p>
                  <div className="hero-cbt-preview__options">
                    <div className="hero-cbt-preview__opt">1. Memory level</div>
                    <div className="hero-cbt-preview__opt">2. Understanding level</div>
                    <div className="hero-cbt-preview__opt active">3. Reflective level (Hunt's Model)</div>
                    <div className="hero-cbt-preview__opt">4. Autonomous development level</div>
                  </div>
                </div>
                <div className="hero-cbt-preview__palette">
                  <span className="palette-label">Question Palette</span>
                  <div className="palette-grid">
                    <span className="palette-btn answered">1</span>
                    <span className="palette-btn review">2</span>
                    <span className="palette-btn not-visited">3</span>
                    <span className="palette-btn not-answered">4</span>
                    <span className="palette-btn not-visited">5</span>
                    <span className="palette-btn not-visited">6</span>
                    <span className="palette-btn not-visited">7</span>
                    <span className="palette-btn not-visited">8</span>
                  </div>
                  <div className="palette-legend">
                    <div><span className="legend-box answered" /> Answered</div>
                    <div><span className="legend-box review" /> Marked for Review</div>
                    <div><span className="legend-box not-answered" /> Not Answered</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BANNER */}
      <section className="stats-banner">
        <div className="stats-banner__container">
          <div className="stats-banner__item">
            <span className="stats-banner__number">15,000+</span>
            <span className="stats-banner__label">Solved Questions with Explanations</span>
          </div>
          <div className="stats-banner__divider" />
          <div className="stats-banner__item">
            <span className="stats-banner__number">100%</span>
            <span className="stats-banner__label">NTA Real Exam CBT Screen Match</span>
          </div>
          <div className="stats-banner__divider" />
          <div className="stats-banner__item">
            <span className="stats-banner__number">10 Units</span>
            <span className="stats-banner__label">Complete Paper 1 Syllabus Mastery</span>
          </div>
          <div className="stats-banner__divider" />
          <div className="stats-banner__item">
            <span className="stats-banner__number">₹0</span>
            <span className="stats-banner__label">Free Forever for Every Student</span>
          </div>
        </div>
      </section>

      {/* AdSense Placement 1: Top Leaderboard */}
      <div className="ad-container" style={{ maxWidth: '1200px', margin: '16px auto', padding: '0 24px', textAlign: 'center' }}>
        <AdSensePlaceholder format="horizontal" config={settings} />
      </div>

      {/* 3. DUAL PATHWAY SELECTOR */}
      <section className="pathway-sec">
        <div className="pathway-sec__container">
          <div className="section-head">
            <span className="section-head__tag">YOUR PREPARATION ROADMAP</span>
            <h2 className="section-head__title">What Do You Need to Practice Today?</h2>
            <p className="section-head__desc">
              Choose your targeted study mode. Whether you are aiming to score 80+ in Paper 1 or master your Core Subject in Paper 2, we have you covered.
            </p>
          </div>

          <div className="pathway-grid">
            {/* Pathway Card 1: Paper 1 */}
            <div className="pathway-card pathway-card--p1">
              <div className="pathway-card__header">
                <div className="pathway-card__badge">COMPULSORY GENERAL PAPER</div>
                <h3 className="pathway-card__title">Paper I: Teaching & Research Aptitude</h3>
                <p className="pathway-card__meta">50 Questions • 100 Marks • Common to all 83 UGC NET Subjects</p>
              </div>
              <ul className="pathway-card__list">
                <li>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span><strong>All 10 Units Covered:</strong> Teaching, Research, Reading Comprehension, DI, ICT, Environment & Higher Education.</span>
                </li>
                <li>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span><strong>Unit-Wise Practice:</strong> Isolate your weak topics and practice targeted question banks.</span>
                </li>
                <li>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span><strong>High-Yield Study Notes:</strong> Revision summaries, formulas, and short notes for quick memory retention.</span>
                </li>
              </ul>
              <div className="pathway-card__actions">
                <Link to="/paper1" className="pathway-btn pathway-btn--primary">
                  Practice Year-Wise PYQs &rarr;
                </Link>
                <Link to="/paper1-unit-pyq" className="pathway-btn pathway-btn--secondary">
                  Practice Unit-Wise PYQs &rarr;
                </Link>
              </div>
            </div>

            {/* Pathway Card 2: Paper 2 */}
            <div className="pathway-card pathway-card--p2">
              <div className="pathway-card__header">
                <div className="pathway-card__badge pathway-card__badge--p2">SUBJECT SPECIALIZATION</div>
                <h3 className="pathway-card__title">Paper II: Core Subject Question Banks</h3>
                <p className="pathway-card__meta">100 Questions • 200 Marks • Deep Domain Curriculum</p>
              </div>
              <ul className="pathway-card__list">
                <li>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span><strong>Full 100-Question Papers:</strong> Complete subject papers from 2020 to 2025 without missing questions.</span>
                </li>
                <li>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span><strong>Sociology, Sindhi & More:</strong> Deep question coverage with Match-Column, Assertion-Reason, and Multiple Statements.</span>
                </li>
                <li>
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span><strong>Bilingual & Script Purity:</strong> Crisp English, Hindi Devanagari, and Sindhi Devanagari script integrity.</span>
                </li>
              </ul>
              <div className="pathway-card__actions">
                <Link to="/paper2" className="pathway-btn pathway-btn--p2">
                  Browse Core Subjects &rarr;
                </Link>
                <Link to="/paper1-notes" className="pathway-btn pathway-btn--secondary">
                  Access Study Notes &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PAPER 1 COMPLETE 10 UNITS BREAKDOWN */}
      <section className="units-sec">
        <div className="units-sec__container">
          <div className="section-head">
            <span className="section-head__tag">COMPLETE SYLLABUS BREAKDOWN</span>
            <h2 className="section-head__title">Paper 1: Master All 10 Units</h2>
            <p className="section-head__desc">
              Every unit carries equal weightage (5 questions / 10 marks). Click any unit below to access dedicated notes and practice tests.
            </p>
          </div>

          <div className="units-grid">
            {paper1Units.map((u) => (
              <Link to={u.path} key={u.id} className="unit-card">
                <div className="unit-card__top">
                  <span className="unit-card__num">{u.num}</span>
                  <span className="unit-card__badge">5 Qs / 10 M</span>
                </div>
                <h4 className="unit-card__title">{u.title}</h4>
                <p className="unit-card__topics">{u.topics}</p>
                <span className="unit-card__link">
                  Study & Practice &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AdSense Placement 2: Mid-Content In-Feed Banner */}
      <div className="ad-container" style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px', textAlign: 'center' }}>
        <AdSensePlaceholder format="horizontal" config={settings} />
      </div>

      {/* 5. "WHY STICK WITH UGC FREE PAPER" - COMPARISON MATRIX */}
      <section className="comparison-sec">
        <div className="comparison-sec__container">
          <div className="section-head">
            <span className="section-head__tag">WHY STICK WITH US</span>
            <h2 className="section-head__title">UGC Free Paper vs Paid Coaching Platforms</h2>
            <p className="section-head__desc">
              See how we provide an authentic, high-quality learning ecosystem at zero cost compared to expensive commercial apps.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="th-feature">Feature / Quality Metric</th>
                  <th className="th-other">Paid Coaching Apps<br/><span className="sub">(Testbook / Unacademy / Adda247)</span></th>
                  <th className="th-ugc">🌟 UGC Free Paper<br/><span className="sub">(For All Aspirants)</span></th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={i}>
                    <td className="td-feature">
                      <strong>{row.feature}</strong>
                    </td>
                    <td className="td-other">
                      <span className="cross-badge">✕</span>
                      <span>{row.other}</span>
                    </td>
                    <td className="td-ugc">
                      <span className="check-badge">✓</span>
                      <span>{row.ugc}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. REAL NTA CBT EXPERIENCE FEATURES */}
      <section className="features-sec">
        <div className="features-sec__container">
          <div className="section-head">
            <span className="section-head__tag">SIMULATE REAL EXAM PRESSURE</span>
            <h2 className="section-head__title">Built for Peak Examination Performance</h2>
            <p className="section-head__desc">
              Overcome exam anxiety before sitting in the actual exam hall. Practice in the exact environment NTA provides.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-item__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="feature-item__title">Authentic NTA Color Palette</h3>
              <p className="feature-item__desc">
                Color coding matched to NTA standards: Green for Answered, Red for Unanswered, Purple for Marked for Review, and Grey for Not Visited.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-item__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="feature-item__title">Live 3-Hour Countdown Timers</h3>
              <p className="feature-item__desc">
                Master your time management. Learn to allocate 60 minutes for Paper 1 and 120 minutes for Paper 2 without running out of time.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-item__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <line x1="9" y1="18" x2="15" y2="18" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
              </div>
              <h3 className="feature-item__title">In-Depth Academic Explanations</h3>
              <p className="feature-item__desc">
                Never guess why an answer is correct. Every single question has a clear, formatted explanation citing academic theories, formulas, and concepts.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-item__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3 className="feature-item__title">Instant Performance Analytics</h3>
              <p className="feature-item__desc">
                Get an instant diagnostic report showing your total score, accuracy percentage, time spent per question, and strong vs. weak units.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HIGH-CONVERTING FINAL CTA */}
      <section className="cta-sec">
        <div className="cta-sec__container">
          <div className="cta-sec__box">
            <h2 className="cta-sec__title">Ready to Achieve Your Assistant Professor & JRF Dream?</h2>
            <p className="cta-sec__subtitle">
              Join thousands of serious aspirants preparing daily on UGC Free Paper. Full access to all mock tests, previous year papers, and study notes at zero cost.
            </p>
            <div className="cta-sec__actions">
              {isLoggedIn ? (
                <Link to="/profile" className="cta-sec__btn cta-sec__btn--primary">
                  Go to Student Dashboard &rarr;
                </Link>
              ) : (
                <Link to="/signup" className="cta-sec__btn cta-sec__btn--primary">
                  Create Free Account &rarr;
                </Link>
              )}
              <Link to="/paper1" className="cta-sec__btn cta-sec__btn--secondary">
                Start Mock Test Without Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AdSense Placement 3: Pre-FAQ Display Banner */}
      <div className="ad-container" style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px', textAlign: 'center' }}>
        <AdSensePlaceholder format="horizontal" config={settings} />
      </div>

      {/* 8. AUTHORITATIVE UGC NET GUIDELINES & FAQS */}
      <section className="faq-sec">
        <div className="faq-sec__container">
          <div className="section-head">
            <span className="section-head__tag">COMMONLY ASKED QUESTIONS</span>
            <h2 className="section-head__title">UGC NET Guidelines & Platform FAQs</h2>
            <p className="section-head__desc">
              Everything you need to know about the exam pattern, fellowship benefits, and how to maximize your score.
            </p>
          </div>

          <div className="faq-accordion">
            {faqs.map((f, idx) => (
              <div
                key={idx}
                className={`faq-item ${activeFaq === idx ? 'faq-item--active' : ''}`}
                onClick={() => toggleFaq(idx)}
              >
                <div className="faq-item__question">
                  <h4>{f.q}</h4>
                  <span className="faq-item__toggle">{activeFaq === idx ? '−' : '+'}</span>
                </div>
                {activeFaq === idx && (
                  <div className="faq-item__answer">
                    <p>{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
