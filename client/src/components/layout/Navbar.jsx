import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobilePracticeOpen, setMobilePracticeOpen] = useState(false)
  const [mobileNotesOpen, setMobileNotesOpen] = useState(false)
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false)
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const profileDropdownRef = useRef(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
    setHasAccount(localStorage.getItem('hasAccount') === 'true')
    setIsAdmin(localStorage.getItem('userRole') === 'admin')
    setUserName(localStorage.getItem('userName') || 'Student')
  }, [location])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setDesktopProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    setIsLoggedIn(false)
    setIsAdmin(false)
    setMenuOpen(false)
    setDesktopProfileOpen(false)
    navigate('/')
  }

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <nav className="navbar">
      <div className="navbar__container">
        {/* Brand Logo & Name */}
        <Link to="/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <div className="navbar__logo-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span className="navbar__logo-text">UGC Free Paper</span>
        </Link>

        {/* Desktop Center Navigation Menus (ZeptoMail Dropdown Style) */}
        <div className="navbar__center">
          <div className="navbar__nav">
            
            {/* PYQ Practice Dropdown */}
            <div className="navbar__nav-dropdown">
              <button className="navbar__nav-item navbar__dropdown-trigger">
                <span>Practice (PYQ)</span>
                <svg className="navbar__chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="navbar__dropdown-menu">
                <Link to="/paper1" className={`navbar__dropdown-item ${isActive('/paper1') ? 'navbar__dropdown-item--active' : ''}`}>
                  <div className="navbar__dropdown-icon">I</div>
                  <div className="navbar__dropdown-content">
                    <span className="navbar__dropdown-title">Paper I</span>
                    <span className="navbar__dropdown-desc">General Aptitude & Teaching PYQs</span>
                  </div>
                </Link>
                <Link to="/paper2" className={`navbar__dropdown-item ${isActive('/paper2') ? 'navbar__dropdown-item--active' : ''}`}>
                  <div className="navbar__dropdown-icon">II</div>
                  <div className="navbar__dropdown-content">
                    <span className="navbar__dropdown-title">Paper II</span>
                    <span className="navbar__dropdown-desc">Subject Specific Syllabus PYQs</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Study Material Dropdown */}
            <div className="navbar__nav-dropdown">
              <button className="navbar__nav-item navbar__dropdown-trigger">
                <span>Study Notes</span>
                <svg className="navbar__chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="navbar__dropdown-menu">
                <Link to="/paper1-notes" className={`navbar__dropdown-item ${isActive('/paper1-notes') ? 'navbar__dropdown-item--active' : ''}`}>
                  <div className="navbar__dropdown-icon">N</div>
                  <div className="navbar__dropdown-content">
                    <span className="navbar__dropdown-title">Paper I Notes</span>
                    <span className="navbar__dropdown-desc">Unit-wise study resources & summaries</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Direct Links instead of Dropdown */}
            <Link to="/about" className={`navbar__dropdown-trigger ${isActive('/about') ? 'navbar__dropdown-trigger--active' : ''}`} style={{ textDecoration: 'none' }}>
              About Us
            </Link>
            <Link to="/contact" className={`navbar__dropdown-trigger ${isActive('/contact') ? 'navbar__dropdown-trigger--active' : ''}`} style={{ textDecoration: 'none' }}>
              Contact Us
            </Link>
            <Link to="/support" className={`navbar__dropdown-trigger ${isActive('/support') ? 'navbar__dropdown-trigger--active' : ''}`} style={{ textDecoration: 'none' }}>
              Help & Support
            </Link>

          </div>
        </div>

        {/* Desktop Right Actions Menu */}
        <div className="navbar__right">
          {isLoggedIn ? (
            <div className="navbar__profile-container" ref={profileDropdownRef}>
              {/* Circular Avatar */}
              <button 
                className={`navbar__avatar-btn ${desktopProfileOpen ? 'navbar__avatar-btn--active' : ''}`}
                onClick={() => setDesktopProfileOpen(!desktopProfileOpen)}
                aria-label="Toggle profile menu"
              >
                {userName.charAt(0).toUpperCase()}
              </button>

              {/* Profile Dropdown Menu */}
              {desktopProfileOpen && (
                <div className="navbar__profile-dropdown">
                  <div className="navbar__profile-header">
                    <span className="navbar__profile-name">{userName}</span>
                    <span className="navbar__profile-role">{isAdmin ? 'Administrator' : 'Student'}</span>
                  </div>
                  <div className="navbar__profile-menu-divider" />
                  
                  <Link to="/profile" className="navbar__profile-item" onClick={() => setDesktopProfileOpen(false)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="9" />
                      <rect x="14" y="3" width="7" height="5" />
                      <rect x="14" y="12" width="7" height="9" />
                      <rect x="3" y="16" width="7" height="5" />
                    </svg>
                    <span>Student Dashboard</span>
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" className="navbar__profile-item" onClick={() => setDesktopProfileOpen(false)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <div className="navbar__profile-menu-divider" />
                  
                  <button className="navbar__profile-logout-btn" onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/signin" className="navbar__login-btn">
                Sign In
              </Link>
              {!hasAccount && (
                <Link to="/signup" className="navbar__signup-btn">
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile Drawer (Nested Accordion Selection) */}
      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
        <div className="navbar__mobile-links">
          
          {/* Mobile Practice Header */}
          <div className="navbar__mobile-group">
            <button 
              className="navbar__mobile-group-trigger"
              onClick={() => setMobilePracticeOpen(!mobilePracticeOpen)}
            >
              <span>Practice (PYQ)</span>
              <svg className={`navbar__chevron ${mobilePracticeOpen ? 'navbar__chevron--rotated' : ''}`} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {mobilePracticeOpen && (
              <div className="navbar__mobile-group-menu">
                <Link to="/paper1" className={`navbar__mobile-group-item ${isActive('/paper1') ? 'navbar__mobile-group-item--active' : ''}`} onClick={() => setMenuOpen(false)}>
                  Paper I (General Aptitude)
                </Link>
                <Link to="/paper2" className={`navbar__mobile-group-item ${isActive('/paper2') ? 'navbar__mobile-group-item--active' : ''}`} onClick={() => setMenuOpen(false)}>
                  Paper II (Subject Specific)
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Notes Header */}
          <div className="navbar__mobile-group">
            <button 
              className="navbar__mobile-group-trigger"
              onClick={() => setMobileNotesOpen(!mobileNotesOpen)}
            >
              <span>Study Notes</span>
              <svg className={`navbar__chevron ${mobileNotesOpen ? 'navbar__chevron--rotated' : ''}`} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {mobileNotesOpen && (
              <div className="navbar__mobile-group-menu">
                <Link to="/paper1-notes" className={`navbar__mobile-group-item ${isActive('/paper1-notes') ? 'navbar__mobile-group-item--active' : ''}`} onClick={() => setMenuOpen(false)}>
                  Paper I Study Notes
                </Link>
              </div>
            )}
          </div>

          {/* Direct Mobile Links instead of Group */}
          <Link to="/about" className={`navbar__mobile-link ${isActive('/about') ? 'navbar__mobile-link--active' : ''}`} onClick={() => setMenuOpen(false)}>
            About Us
          </Link>
          <Link to="/contact" className={`navbar__mobile-link ${isActive('/contact') ? 'navbar__mobile-link--active' : ''}`} onClick={() => setMenuOpen(false)}>
            Contact Us
          </Link>
          <Link to="/support" className={`navbar__mobile-link ${isActive('/support') ? 'navbar__mobile-link--active' : ''}`} onClick={() => setMenuOpen(false)}>
            Help & Support
          </Link>

        </div>

        {/* Mobile Action Drawer CTAs */}
        <div className="navbar__mobile-actions">
          {isLoggedIn ? (
            <>
              <div className="navbar__mobile-profile-info">
                <span className="navbar__mobile-profile-name">{userName}</span>
                <span className="navbar__mobile-profile-role">{isAdmin ? 'Administrator' : 'Student'}</span>
              </div>
              <Link to="/profile" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              {isAdmin && (
                <Link to="/admin" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Admin Panel
                </Link>
              )}
              <button className="navbar__mobile-cta navbar__mobile-cta--logout" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              {!hasAccount && (
                <Link to="/signup" className="navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
