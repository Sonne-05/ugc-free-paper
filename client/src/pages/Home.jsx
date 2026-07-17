import { Link } from 'react-router-dom'
import './Home.css'

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__grid" />
        </div>

        <div className="hero__content">
          <h1 className="hero__title">
            Master UGC NET
            <br />
            <span className="hero__title--gradient">Prep Simplified.</span>
          </h1>

          <p className="hero__subtitle">
            Get access to high-yield mock tests, expert study materials, and subject-specific core modules for Paper 1 (General Aptitude) and Paper 2. Designed to help you secure lectureship eligibility & JRF.
          </p>

          <div className="hero__actions">
            <Link to="/paper1" className="hero__btn hero__btn--primary">
              Start Paper 1 Prep
              <span className="hero__btn-arrow">&rarr;</span>
            </Link>
            <Link to="/paper2" className="hero__btn hero__btn--secondary">
              Browse Paper 2 Subjects
            </Link>
          </div>
        </div>

        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-number">50+</span>
            <span className="hero__stat-label">Full Mock Tests</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">15K+</span>
            <span className="hero__stat-label">Practice Questions</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">98.6%</span>
            <span className="hero__stat-label">Qualifying Rate</span>
          </div>
        </div>
      </section>

      {/* Curriculum & Prep Tracks Section */}
      <section className="prep-tracks">
        <div className="section-header">
          <h2 className="section-title">Comprehensive UGC NET Exam Coverage</h2>
          <p className="section-subtitle">Choose your track and start practicing with NTA-aligned mock tests and study guides.</p>
        </div>

        <div className="tracks-grid">
          {/* Paper 1 Card */}
          <div className="track-card track-card--paper1">
            <h3 className="track-card__title">
              <svg className="track-card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Paper 1: General Aptitude
            </h3>
            <p className="track-card__desc">Compulsory for all subjects. Tests teaching & research capabilities, reasoning, and awareness.</p>
            <ul className="track-card__topics">
              <li>Teaching & Research Aptitude</li>
              <li>Mathematical & Logical Reasoning</li>
              <li>Data Interpretation (DI)</li>
              <li>Information & Comm. Technology (ICT)</li>
              <li>People, Development & Environment</li>
            </ul>
            <Link to="/paper1" className="track-card__btn track-card__btn--p1">
              Start Paper 1 Quiz
            </Link>
          </div>

          {/* Paper 2 Card */}
          <div className="track-card track-card--paper2">
            <h3 className="track-card__title">
              <svg className="track-card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Paper 2: Core Subject
            </h3>
            <p className="track-card__desc">Choose your specific post-graduation subject. Tests depth of knowledge and research acumen.</p>
            <ul className="track-card__topics">
              <li>Sociology (Core Practice)</li>
              <li>Computer Science & Applications (Coming Soon)</li>
              <li>Commerce & Management (Coming Soon)</li>
              <li>English & Hindi Literature (Coming Soon)</li>
              <li>Other Subjects (Coming Soon)</li>
            </ul>
            <Link to="/paper2" className="track-card__btn track-card__btn--p2">
              Explore Subjects
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="features-highlights">
        <div className="section-header">
          <h2 className="section-title">Designed for Success</h2>
          <p className="section-subtitle">Features built to replicate the actual testing environment and maximize your JRF chances.</p>
        </div>

        <div className="features-list">
          <div className="feature-item">
            <div className="feature-item__badge">CBT Mode</div>
            <h4 className="feature-item__title">Realistic NTA Interface</h4>
            <p className="feature-item__desc">Practice in a computer-based test interface identical to the actual NTA portal to build speed and reduce exam-day anxiety.</p>
          </div>
          <div className="feature-item">
            <div className="feature-item__badge">Solutions</div>
            <h4 className="feature-item__title">Instant Explanations</h4>
            <p className="feature-item__desc">Get detailed step-by-step solutions, key reference formulas, and subject concepts for every practice problem.</p>
          </div>
          <div className="feature-item">
            <div className="feature-item__badge">Analytics</div>
            <h4 className="feature-item__title">Accuracy Tracking</h4>
            <p className="feature-item__desc">View instant breakdown of your scores, average time spent per question, and strong vs. weak topic areas.</p>
          </div>
        </div>
      </section>

      {/* Overview & Guidelines Section (AdSense Compliance & Rich Text) */}
      <section className="home-overview">
        <div className="section-header">
          <h2 className="section-title">UGC NET Exam Overview & Guidelines</h2>
          <p className="section-subtitle">Understanding the test pattern and requirements is your first step toward lectureship success.</p>
        </div>
        <div className="home-overview__content">
          <div className="home-overview__card">
            <h3>Examination Structure</h3>
            <p className="home-overview__text">
              The University Grants Commission National Eligibility Test (UGC NET) is conducted twice a year by the National Testing Agency (NTA). The test consists of two papers, both containing objective-type multiple-choice questions (MCQs). Candidates are given a total of 3 hours (180 minutes) to solve both papers without any break. There is no negative marking, making it crucial to attempt all questions.
            </p>
            <p className="home-overview__text">
              <strong>Paper 1 (General Aptitude)</strong> contains 50 questions worth 100 marks, focusing on teaching, research ability, comprehension, and general awareness. <strong>Paper 2 (Core Subject)</strong> contains 100 questions worth 200 marks, assessing deep conceptual understanding in the candidate's chosen post-graduation discipline.
            </p>
          </div>
          <div className="home-overview__card">
            <h3>Eligibility & Qualifications</h3>
            <p className="home-overview__text">
              Candidates must secure at least 55% marks (50% for reserved categories) in their Master's Degree to be eligible. Qualifying UGC NET makes you eligible for Assistant Professorship positions across universities in India. Candidates scoring in the highest bracket also qualify for the Junior Research Fellowship (JRF), which offers financial stipends for research.
            </p>
            <p className="home-overview__text">
              Regularly practicing previous year question papers (PYQs) and reviewing syllabus topics by unit is the most recommended study method to secure JRF scores. Our portal provides structured notes and mock tests to guide you through this journey.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section (AdSense & SEO Optimization) */}
      <section className="home-faqs">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions (FAQs)</h2>
          <p className="section-subtitle">Common queries regarding the UGC NET examination and preparation strategies.</p>
        </div>
        <div className="home-faqs__list">
          <div className="home-faq-item">
            <h3 className="home-faq-question">What is the age limit for Junior Research Fellowship (JRF)?</h3>
            <p className="home-faq-answer">
              The JRF age limit is typically 30 years for general category candidates, with relaxations up to 5 years for OBC-NCL, SC, ST, PwD, women candidates, and research experience holders. There is no upper age limit for applying for Assistant Professorship only.
            </p>
          </div>
          <div className="home-faq-item">
            <h3 className="home-faq-question">Is there negative marking in the NTA UGC NET exam?</h3>
            <p className="home-faq-answer">
              No, there is currently no negative marking in UGC NET. Each correct question awards 2 marks, while incorrect or unattempted questions award 0 marks. Aspirants are advised to attempt all 150 questions.
            </p>
          </div>
          <div className="home-faq-item">
            <h3 className="home-faq-question">How does solving mock tests help in preparation?</h3>
            <p className="home-faq-answer">
              Mock tests replicate the real computer-based testing (CBT) environment, helping you build time-management skills, identify weak subject units, and adapt to the exam UI to minimize layout confusion on test day.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

