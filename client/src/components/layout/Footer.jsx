import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__info">
          <div className="footer__brand">
            <svg
              className="footer__logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </svg>
            <span className="footer__logo-text">UGC Free Paper</span>
          </div>
          <p className="footer__desc">
            Your comprehensive online platform for UGC NET & JRF preparation. Master Paper 1 and Paper 2 with mock tests, practice quizzes, and high-quality revision materials.
          </p>
        </div>

        <div className="footer__links-section">
          <div className="footer__links-column">
            <h4 className="footer__links-title">Preparation</h4>
            <Link to="/paper1" className="footer__link">Paper 1 (Aptitude)</Link>
            <Link to="/paper2" className="footer__link">Paper 2 (Subjects)</Link>
          </div>

          <div className="footer__links-column">
            <h4 className="footer__links-title">Support</h4>
            <Link to="/contact" className="footer__link">Contact Us</Link>
            <Link to="/about" className="footer__link">About Us</Link>
            <Link to="/support" className="footer__link">Support Us</Link>
          </div>

          <div className="footer__links-column">
            <h4 className="footer__links-title">Legal</h4>
            <Link to="/privacy" className="footer__link">Privacy Policy</Link>
            <Link to="/terms" className="footer__link">Terms of Service</Link>
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
