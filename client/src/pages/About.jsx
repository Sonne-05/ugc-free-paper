import { Link } from 'react-router-dom'
import './About.css'

const About = () => {
  const metrics = [
    { value: '15,000+', label: 'Verified Questions' },
    { value: '10 / 10', label: 'Paper 1 Units' },
    { value: '2021–2024', label: 'NTA Exam Shifts' },
    { value: '100% Free', label: 'Open To All' },
  ]

  const pillars = [
    {
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: 'Democratic Open Education',
      desc: 'Top-quality UGC NET test preparation should never be locked behind steep ₹5,000 annual paywalls. Everything on our platform is accessible without barriers.'
    },
    {
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Authentic CBT Simulator',
      desc: 'Practice in the exact NTA Computer Based Test environment — complete with official color palette, question status counters, section tabs, and accurate timers.'
    },
    {
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Academic Reasoning & Keys',
      desc: 'Every question includes verified answers with comprehensive 150-word explanations, referencing UGC syllabus concepts and official answer keys.'
    },
    {
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      title: 'Unit-Wise Focused Notes',
      desc: 'Study concise, exam-oriented revision notes crafted for all 10 Paper 1 units, from Teaching & Research Aptitude to ICT, People & Environment, and Higher Education.'
    }
  ]

  const audience = [
    {
      role: 'JRF & PhD Aspirants',
      desc: 'Master Paper 1 with 99+ percentile precision to qualify for the prestigious Junior Research Fellowship stipend and direct doctoral admissions.'
    },
    {
      role: 'Assistant Professor Candidates',
      desc: 'Secure high aggregate scores to clear the UGC NET Lectureship cut-off with confidence across both Paper 1 and core subjects.'
    },
    {
      role: 'Self-Studying Educators',
      desc: 'Access structured previous year questions without expensive commercial coaching subscriptions or intrusive sales pressure.'
    }
  ]

  return (
    <div className="about-page">
      {/* 1. HERO SECTION */}
      <section className="about-hero">
        <div className="about-hero__container">
          <span className="about-hero__tag">
            <span>🌟</span> WHO WE ARE
          </span>
          <h1 className="about-hero__title">
            Empowering Every UGC NET & JRF Aspirant <span className="about-hero__title-highlight">Across India</span>
          </h1>
          <p className="about-hero__desc">
            UGC Free Paper is dedicated to making higher education exam preparation transparent, high-yield, and accessible to every learner at zero cost.
          </p>
        </div>
      </section>

      {/* 2. METRICS BAR */}
      <div className="about-metrics">
        <div className="about-metrics__grid">
          {metrics.map((m, idx) => (
            <div key={idx} className="about-metric-card">
              <div className="about-metric__value">{m.value}</div>
              <div className="about-metric__label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="about-content">
        {/* 3. CORE PILLARS */}
        <section className="about-pillars">
          <div className="about-section-head">
            <span className="about-section-head__tag">OUR CORE PILLARS</span>
            <h2 className="about-section-head__title">Built for Serious Academic Success</h2>
            <p className="about-section-head__desc">
              We replaced obsolete PDFs and cluttered quiz apps with a focused, standard-aligned prep ecosystem.
            </p>
          </div>

          <div className="about-pillars__grid">
            {pillars.map((pillar, idx) => (
              <div key={idx} className="about-pillar-card">
                <div className="about-pillar__icon">{pillar.icon}</div>
                <h3 className="about-pillar__title">{pillar.title}</h3>
                <p className="about-pillar__desc">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. STORY & MISSION SPLIT */}
        <section className="about-story">
          <div className="about-story__left">
            <span className="about-section-head__tag" style={{ alignSelf: 'flex-start' }}>OUR MISSION</span>
            <h2 className="about-story__heading">Democratizing UGC NET Test Preparation</h2>
            <p className="about-story__text">
              Every year, over 8 lakh candidates appear for the UGC NET exam aspiring to become Assistant Professors and Junior Research Fellows. Unfortunately, high-quality question banks, realistic mock interfaces, and comprehensive study notes are often monopolized behind expensive subscriptions.
            </p>
            <p className="about-story__text">
              UGC Free Paper was created to level the playing field. Whether you are studying from a metropolitan university or a remote village, you deserve access to identical test simulations, verified question keys, and high-yield study material.
            </p>
          </div>

          <div className="about-story__right">
            <h3 className="about-story__feature-title">The UGC Free Paper Advantage</h3>
            <div className="about-story__feature-item">
              <svg className="about-story__check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Authentic NTA Computer-Based Test (CBT) palette and question navigation.</span>
            </div>
            <div className="about-story__feature-item">
              <svg className="about-story__check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Verified 2021–2024 previous year question papers categorized by year & shift.</span>
            </div>
            <div className="about-story__feature-item">
              <svg className="about-story__check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Unit-wise topic notes with concise summaries and revision tables.</span>
            </div>
            <div className="about-story__feature-item">
              <svg className="about-story__check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Zero pushy sales calls, spam marketing, or hidden paywalls.</span>
            </div>
          </div>
        </section>

        {/* 5. TARGET AUDIENCE */}
        <section className="about-audience">
          <div className="about-section-head">
            <span className="about-section-head__tag">WHO WE SERVE</span>
            <h2 className="about-section-head__title">Tailored for Every Academic Goal</h2>
            <p className="about-section-head__desc">
              Whether you are attempting the exam for the first time or aiming for top JRF rank.
            </p>
          </div>

          <div className="about-audience__grid">
            {audience.map((item, idx) => (
              <div key={idx} className="about-audience-card">
                <h3 className="about-audience__role">{item.role}</h3>
                <p className="about-audience__desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. CTA BANNER */}
        <section className="about-cta">
          <h2 className="about-cta__title">Start Your Free UGC NET Practice Today</h2>
          <p className="about-cta__desc">
            Join thousands of candidates practicing with authentic NTA exam simulations and high-yield revision notes.
          </p>
          <div className="about-cta__actions">
            <Link to="/paper1" className="about-cta__btn-primary">
              Practice Paper 1 PYQs
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link to="/paper1-notes" className="about-cta__btn-secondary">
              Explore Paper 1 Notes
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default About
