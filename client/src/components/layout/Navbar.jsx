import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navLinks = [
    { path: '/paper1', label: 'Paper I (PYQ)' },
    { path: '/paper2', label: 'Paper II (PYQ)' },
    { path: '/paper1-notes', label: 'Paper I (Notes)' },
  ]

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
    setHasAccount(localStorage.getItem('hasAccount') === 'true')
    setIsAdmin(localStorage.getItem('userRole') === 'admin')
  }, [location])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    setIsLoggedIn(false)
    setIsAdmin(false)
    setMenuOpen(false)
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
        <Link to="/" className="navbar__brand">
          <span className="navbar__logo-text">UGC Free Paper</span>
        </Link>

        <div className="navbar__center">
          <div className="navbar__nav">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`navbar__nav-item ${isActive(link.path) ? 'navbar__nav-item--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="navbar__right">
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`navbar__admin-btn ${isActive('/admin') ? 'navbar__admin-btn--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              {isAdmin && <div className="navbar__divider" />}
              <Link
                to="/profile"
                className={`navbar__profile-link ${isActive('/profile') ? 'navbar__profile-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
                aria-label="View Dashboard"
              >
                Dashboard
              </Link>
              <div className="navbar__divider" />
              <button className="navbar__logout-btn" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="navbar__login-btn" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              {!hasAccount && (
                <Link to="/signup" className="navbar__signup-btn" onClick={() => setMenuOpen(false)}>
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>

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

      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
        <div className="navbar__mobile-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar__mobile-link ${isActive(link.path) ? 'navbar__mobile-link--active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="navbar__mobile-actions">
          <Link to="/about" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
            About Us
          </Link>
          <Link to="/contact" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
            Contact Us
          </Link>
          <div className="navbar__divider" style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="navbar__mobile-link" style={{ fontWeight: '700', color: 'var(--primary)' }} onClick={() => setMenuOpen(false)}>
                  Admin Panel
                </Link>
              )}
              <Link to="/profile" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <button className="navbar__mobile-cta" onClick={handleLogout} style={{ width: '100%', border: 'none', cursor: 'pointer' }}>
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
