import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import './Auth.css'

const SignIn = () => {
  const navigate = useNavigate()
  const [view, setView] = useState('signin') // 'signin' or 'forgot'
  const [isResetSent, setIsResetSent] = useState(false)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaUrl, setCaptchaUrl] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')

  const fetchCaptcha = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/captcha`)
      const data = await res.json()
      setCaptchaId(data.id)
      setCaptchaUrl(data.dataUrl)
      setCaptchaInput('')
    } catch (err) {
      console.error('Failed to fetch captcha:', err)
    }
  }

  useEffect(() => {
    fetchCaptcha()
  }, [])

  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: "438632821836-08ksq83bin8347l052n7i29083c2fnr9.apps.googleusercontent.com",
        callback: handleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || 'Google login failed');
        return;
      }
      
      const user = await res.json();
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('hasAccount', 'true')
      localStorage.setItem('userName', user.name)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userId', user.id || user._id)
      localStorage.setItem('userEmail', user.email)
      
      navigate('/profile')
      window.location.reload()
    } catch (err) {
      console.error(err);
      alert('Network error during Google login');
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    const email = e.target.elements[0].value
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaId, captchaValue: captchaInput })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || 'Login failed');
        fetchCaptcha();
        return;
      }
      
      const user = await res.json();
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('hasAccount', 'true')
      localStorage.setItem('userName', user.name)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userEmail', user.email)
      
      navigate('/profile')
      window.location.reload()
    } catch (err) {
      console.error(err);
      alert('Network error during login');
      fetchCaptcha();
    }
  }

  const handleResetSubmit = (e) => {
    e.preventDefault()
    setIsResetSent(true)
  }

  return (
    <section className="auth">
      <div className="auth__card">
        {/* Left Side: Premium Branding Illustration (Visible on Desktop) */}
        <div className="auth__side">
          <div className="auth__side-bg" />
          
          <div className="auth__side-wrapper">
            <div className="auth__side-content">
              <h2>Your Gateway to Lectureship & JRF</h2>
              <p>Access high-yield study notes, year-wise PYQs, and interactive prep quizzes designed by exam experts.</p>
            </div>

            <div className="auth__side-features">
              <div className="auth__side-feature">
                <svg className="auth__side-feature-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>100% NTA-Aligned Mock Tests</span>
              </div>
              <div className="auth__side-feature">
                <svg className="auth__side-feature-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Detailed Study Notes for all 10 Units</span>
              </div>
              <div className="auth__side-feature">
                <svg className="auth__side-feature-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Year-wise PYQs with Explanations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Entry Form */}
        <div className="auth__main">
          <div className="auth__form-wrapper">
            {view === 'signin' ? (
              <>
                <h1 className="auth__title">Welcome back</h1>
                <p className="auth__subtitle">Sign in to continue your preparation</p>

                {/* Google Social SSO Button */}
                <div id="google-signin-btn" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}></div>

                <div className="auth__separator">
                  <span>or continue with email</span>
                </div>

                <form className="auth__form" onSubmit={handleSignIn}>
                  <div className="auth__field">
                    <label>Email Address</label>
                    <input type="email" required placeholder="name@example.com" />
                  </div>
                  <div className="auth__field">
                    <div className="auth__field-header">
                      <label>Password</label>
                      <span 
                        className="auth__forgot-link" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setView('forgot');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        Forgot password?
                      </span>
                    </div>
                    <input type="password" required placeholder="Enter your password" />
                  </div>

                  <div className="auth__field">
                    <label>Security Code (CAPTCHA)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', marginBottom: '8px' }}>
                      {captchaUrl ? (
                        <img 
                          src={captchaUrl} 
                          alt="CAPTCHA" 
                          style={{ height: '40px', border: '1px solid var(--border)', borderRadius: '4px' }} 
                        />
                      ) : (
                        <div style={{ height: '40px', width: '120px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading...</div>
                      )}
                      <button 
                        type="button" 
                        onClick={fetchCaptcha} 
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '4px 8px'
                        }}
                        title="Get a new code"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                    <input 
                      type="text" 
                      required 
                      placeholder="Enter verification code" 
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="auth__submit">Sign In</button>
                </form>

                <p className="auth__footer">
                  Don't have an account yet? <Link to="/signup">Create one now</Link>
                </p>
              </>
            ) : (
              <>
                <h1 className="auth__title">Reset Password</h1>
                <p className="auth__subtitle">Enter your email address to receive a recovery link</p>

                {isResetSent ? (
                  <div className="auth__success-box">
                    <svg className="auth__success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p>We've sent a password recovery link to your email address.</p>
                  </div>
                ) : (
                  <form className="auth__form" onSubmit={handleResetSubmit}>
                    <div className="auth__field">
                      <label>Email Address</label>
                      <input type="email" required placeholder="name@example.com" />
                    </div>
                    <button type="submit" className="auth__submit">Send Reset Link</button>
                  </form>
                )}

                <p className="auth__footer">
                  <span 
                    className="auth__back-btn" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setView('signin');
                      setIsResetSent(false);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    &larr; Back to Sign In
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default SignIn
