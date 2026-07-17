import { Link } from 'react-router-dom'
import './Home.css'

const Home = () => {
  return (
    <div className="home-page">
      {/* 1. Hero Section */}
      <section className="hero-sec">
        <div className="hero-sec__container">
          <div className="hero-sec__content">
            <div className="hero-sec__badge">
              <svg className="hero-sec__badge-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 11l2 2 4-4" />
              </svg>
              <span>NTA-PATTERN COMPLIANT</span>
            </div>
            
            <h1 className="hero-sec__title">
              Master Your UGC NET Preparation with <span className="hero-sec__title--green">Free Mock Tests</span>
            </h1>
            
            <p className="hero-sec__subtitle">
              Experience the real NTA interface, track your progress, and access 15,000+ practice questions for free. Empowering students with the tools to succeed.
            </p>
            
            <div className="hero-sec__actions">
              <Link to="/paper1" className="hero-sec__btn hero-sec__btn--primary">
                Start Free Mock Test <span className="hero-sec__btn-arrow">&rarr;</span>
              </Link>
              <Link to="/paper2" className="hero-sec__btn hero-sec__btn--secondary">
                Browse Papers
              </Link>
            </div>
            
            <div className="hero-sec__social-proof">
              <div className="hero-sec__avatars">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80" alt="Student" className="hero-sec__avatar hero-sec__avatar--1" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" alt="Student" className="hero-sec__avatar hero-sec__avatar--2" />
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80" alt="Student" className="hero-sec__avatar hero-sec__avatar--3" />
              </div>
              <span className="hero-sec__social-text">
                Joined by <strong>100k+ aspirants</strong> this month
              </span>
            </div>
          </div>
          
          <div className="hero-sec__visual">
            <div className="hero-sec__mockup-wrapper">
              <img src="/dashboard_mockup.png" alt="Dashboard Mockup" className="hero-sec__mockup-img" />
              <div className="hero-sec__floating-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M12 2a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Section */}
      <section className="stats-banner">
        <div className="stats-banner__container">
          <div className="stats-banner__item">
            <div className="stats-banner__icon">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="stats-banner__info">
              <span className="stats-banner__number">50+</span>
              <span className="stats-banner__label">Full Mock Tests</span>
            </div>
          </div>
          
          <div className="stats-banner__divider" />
          
          <div className="stats-banner__item">
            <div className="stats-banner__icon">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="stats-banner__info">
              <span className="stats-banner__number">15,000+</span>
              <span className="stats-banner__label">Practice Questions</span>
            </div>
          </div>
          
          <div className="stats-banner__divider" />
          
          <div className="stats-banner__item">
            <div className="stats-banner__icon">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div className="stats-banner__info">
              <span className="stats-banner__number">100+</span>
              <span className="stats-banner__label">Free Study Notes</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="features-sec">
        <div className="features-sec__container">
          <div className="features-sec__header">
            <h2 className="features-sec__title">Designed for Peak Performance</h2>
            <p className="features-sec__subtitle">
              Experience a learning ecosystem that mimics the pressure and precision of the real UGC NET exam.
            </p>
          </div>
          
          <div className="features-sec__grid">
            <div className="feature-card">
              <div className="feature-card__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="feature-card__title">Realistic NTA Interface</h3>
              <p className="feature-card__desc">
                Practice in an environment that matches the actual exam. Master the navigation, timers, and question palette exactly like the real thing.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <line x1="9" y1="18" x2="15" y2="18" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
              </div>
              <h3 className="feature-card__title">Instant Explanations</h3>
              <p className="feature-card__desc">
                Don't just get answers, get insights. Detailed solutions are provided immediately after each question to bridge your knowledge gaps.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon-box">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3 className="feature-card__title">Performance Tracking</h3>
              <p className="feature-card__desc">
                Analyze your accuracy and time management. Advanced dashboards show your strengths and weaknesses subject by subject.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Subjects Section */}
      <section className="subjects-sec">
        <div className="subjects-sec__container">
          <div className="subjects-sec__header">
            <div className="subjects-sec__header-left">
              <h2 className="subjects-sec__title">Explore Subjects for Paper 1 & 2</h2>
              <p className="subjects-sec__subtitle">Comprehensive material curated for all major disciplines.</p>
            </div>
            <Link to="/paper2" className="subjects-sec__view-all">
              View All Subjects &rarr;
            </Link>
          </div>
          
          <div className="subjects-sec__grid">
            <Link to="/paper1" className="subject-card">
              <div className="subject-card__icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
              </div>
              <h3 className="subject-card__title">Teaching Aptitude</h3>
              <span className="subject-card__badge subject-card__badge--p1">Paper 1 Core</span>
            </Link>

            <Link to="/paper1" className="subject-card">
              <div className="subject-card__icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <circle cx="12" cy="5" r="3" />
                  <path d="M12 22V8M5 12h14" />
                </svg>
              </div>
              <h3 className="subject-card__title">Research Aptitude</h3>
              <span className="subject-card__badge subject-card__badge--p1">Paper 1 Core</span>
            </Link>

            <Link to="/paper2" className="subject-card">
              <div className="subject-card__icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="subject-card__title">Sociology</h3>
              <span className="subject-card__badge subject-card__badge--p2">Paper 2</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. CTA Section */}
      <section className="cta-sec">
        <div className="cta-sec__container">
          <div className="cta-sec__box">
            <h2 className="cta-sec__title">Ready to Crack UGC NET?</h2>
            <p className="cta-sec__subtitle">
              Join 100,000+ students preparing with us. Get full access to all mock tests and premium features at zero cost.
            </p>
            <div className="cta-sec__actions">
              <Link to="/signup" className="cta-sec__btn">
                Register Now
              </Link>
              <div className="cta-sec__badge">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" className="cta-sec__badge-icon">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

