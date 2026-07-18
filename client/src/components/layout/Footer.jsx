import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__info">
          <div className="footer__brand">
            <div className="navbar__logo-icon" style={{ width: '52px', height: '52px' }}>
              <img src="/logo.svg" alt="UGC Free Paper Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span className="footer__logo-text" style={{ color: '#1C2355', marginLeft: '-5px' }}>GC Free Paper</span>
          </div>
          <p className="footer__desc" style={{ marginBottom: '16px' }}>
            Empowering NTA NET Aspirants with world-class free education tools.
          </p>
          <div className="footer__socials" style={{ display: 'flex', gap: '8px' }}>
            <a href="/support" className="footer__social-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', textDecoration: 'none' }} aria-label="Share">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </a>
            <a href="mailto:support@ugcfreepaper.com" className="footer__social-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', textDecoration: 'none' }} aria-label="Email">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer__links-section">
          <div className="footer__links-column">
            <h4 className="footer__links-title">Platform</h4>
            <Link to="/paper1" className="footer__link">Mock Tests</Link>
            <Link to="/paper1-notes" className="footer__link">Study Material</Link>
            <Link to="/paper2" className="footer__link">Subjects</Link>
          </div>

          <div className="footer__links-column">
            <h4 className="footer__links-title">Support</h4>
            <Link to="/support" className="footer__link">FAQ</Link>
            <Link to="/contact" className="footer__link">Contact Support</Link>
            <Link to="/terms" className="footer__link">Terms of Service</Link>
            <Link to="/privacy" className="footer__link">Privacy Policy</Link>
          </div>

          <div className="footer__links-column">
            <h4 className="footer__links-title">About</h4>
            <Link to="/about" className="footer__link">About Us</Link>
            <Link to="/about" className="footer__link">Student Stories</Link>
            <Link to="/about" className="footer__link">Mission</Link>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="footer__bottom-container">
          <p className="footer__copyright">
            &copy; {currentYear} UGC Free Paper. All rights reserved.
          </p>
          <p className="footer__disclaimer">
            Disclaimer: This portal is an educational prep resource and is not affiliated with the National Testing Agency (NTA) or UGC.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
