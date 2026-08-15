import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './NotFound.css'

function NotFound() {
  useEffect(() => {
    document.title = '404 - Page Not Found | UGC Free Paper'
    
    // De-index 404 pages from search engines
    let metaRobots = document.querySelector('meta[name="robots"]')
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.setAttribute('name', 'robots')
      document.head.appendChild(metaRobots)
    }
    metaRobots.setAttribute('content', 'noindex, follow')

    return () => {
      if (metaRobots) {
        metaRobots.setAttribute('content', 'index, follow')
      }
    }
  }, [])

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <span className="notfound-badge">
          <span>⚠️</span> ERROR 404
        </span>
        <div className="notfound-number">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-desc">
          The page or study resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <Link to="/" className="notfound-primary-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Back to Homepage
        </Link>

        <div className="notfound-suggestions">
          <h2 className="notfound-suggestions__title">Popular Resources You May Be Looking For</h2>
          <div className="notfound-grid">
            <Link to="/paper1" className="notfound-link-card">
              <div className="notfound-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div className="notfound-link-content">
                <span className="notfound-link-title">Paper 1 PYQs</span>
                <span className="notfound-link-subtitle">Year-wise Full Papers (2020–2025)</span>
              </div>
            </Link>

            <Link to="/paper1-unit-pyq" className="notfound-link-card">
              <div className="notfound-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </div>
              <div className="notfound-link-content">
                <span className="notfound-link-title">Unit-Wise PYQs</span>
                <span className="notfound-link-subtitle">Topic-focused practice tests</span>
              </div>
            </Link>

            <Link to="/paper1-notes" className="notfound-link-card">
              <div className="notfound-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div className="notfound-link-content">
                <span className="notfound-link-title">Study Notes</span>
                <span className="notfound-link-subtitle">Comprehensive revision guides</span>
              </div>
            </Link>

            <Link to="/paper2" className="notfound-link-card">
              <div className="notfound-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div className="notfound-link-content">
                <span className="notfound-link-title">Core Paper 2</span>
                <span className="notfound-link-subtitle">Subject-specific question sets</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
