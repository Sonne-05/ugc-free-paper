import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import './Auth.css'

const SignUp = () => {
  const navigate = useNavigate()

  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: "438632821836-08ksq83bin8347l052n7i29083c2fnr9.apps.googleusercontent.com",
        callback: handleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("google-signup-btn"),
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
        alert(errData.message || 'Google signup failed');
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
      alert('Network error during Google signup');
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    const name = e.target.elements[0].value
    const email = e.target.elements[1].value // full name is 0, email is 1
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || 'Registration failed');
        return;
      }
      
      const user = await res.json();
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('hasAccount', 'true')
      localStorage.setItem('userName', user.name)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userEmail', user.email)
      
      // Redirect to profile dashboard
      navigate('/profile')
      // Trigger header state reload
      window.location.reload()
    } catch (err) {
      console.error(err);
      alert('Network error during registration');
    }
  }

  return (
    <section className="auth">
      <div className="auth__card">
        {/* Left Side: Premium Branding Illustration (Visible on Desktop) */}
        <div className="auth__side">
          <div className="auth__side-bg" />
          
          <div className="auth__side-wrapper">
            <div className="auth__side-content">
              <h2>Start Your Prep Journey Today</h2>
              <p>Join thousands of aspirants preparing to qualify for lectureship eligibility and JRF grants.</p>
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
            <h1 className="auth__title">Create an account</h1>
            <p className="auth__subtitle">Get instant access to all mock papers</p>

            {/* Google Social SSO Button */}
            <div id="google-signup-btn" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}></div>

            <div className="auth__separator">
              <span>or continue with email</span>
            </div>

            <form className="auth__form" onSubmit={handleSignUp}>
              <div className="auth__field">
                <label>Full Name</label>
                <input type="text" required placeholder="Drishti" />
              </div>
              <div className="auth__field">
                <label>Email Address</label>
                <input type="email" required placeholder="name@example.com" />
              </div>
              <div className="auth__field">
                <label>Password</label>
                <input type="password" required placeholder="Create a password" />
              </div>

              <button type="submit" className="auth__submit">Create Account</button>
            </form>

            <p className="auth__footer">
              Already have an account? <Link to="/signin">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SignUp
