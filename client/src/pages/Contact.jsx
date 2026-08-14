import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './Contact.css'

const Contact = () => {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General Feedback / Inquiry',
    message: ''
  })

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@ugcfreepaper.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.message) {
      setLoading(true)
      setError('')
      try {
        const payload = {
          name: formData.name,
          email: formData.email,
          message: `[Category: ${formData.category}]\n\n${formData.message}`
        }

        const res = await fetch(`${API_BASE_URL}/api/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (res.ok) {
          setSubmitted(true)
          if (window.gtag) {
            window.gtag('event', 'generate_lead', {
              event_category: 'contact',
              event_label: `Contact Form Submission - ${formData.category}`
            })
          }
        } else {
          setError(data.message || 'Failed to send message. Please try again.')
        }
      } catch (err) {
        console.error('Error submitting contact form:', err)
        setError('Connection error. Please check your internet connection and try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="contact-page">
      {/* 1. HERO SECTION */}
      <section className="contact-hero">
        <div className="contact-hero__container">
          <span className="contact-hero__tag">
            <span>✉️</span> GET IN TOUCH
          </span>
          <h1 className="contact-hero__title">
            We'd Love to <span className="contact-hero__title-highlight">Hear From You</span>
          </h1>
          <p className="contact-hero__desc">
            Have questions about UGC NET syllabus guides, found an issue in a question explanation, or want to explore collaboration? Reach out to our academic and technical team.
          </p>
        </div>
      </section>

      {/* 2. MAIN 2-COLUMN SECTION */}
      <div className="contact-container">
        <div className="contact-grid">
          {/* LEFT: INFO PANEL */}
          <div className="contact-info">
            <div className="contact-card">
              <h2 className="contact-card__title">Direct Communication</h2>
              <p className="contact-card__desc">
                Email us directly or use the quick form. We read and respond to every aspirant message.
              </p>

              <div className="contact-email-box">
                <div className="contact-email-box__info">
                  <div className="contact-email-box__icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <a href="mailto:support@ugcfreepaper.com" className="contact-email-box__address">
                    support@ugcfreepaper.com
                  </a>
                </div>
                <button
                  type="button"
                  className="contact-email-box__copy-btn"
                  onClick={handleCopyEmail}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="contact-card">
              <h3 className="contact-card__title">What You Can Contact Us For</h3>
              <div className="contact-topics">
                <div className="contact-topic-item">
                  <div className="contact-topic-item__bullet" />
                  <div>
                    <strong>Question / Key Correction:</strong> Report any typo, question discrepancy, or challenge an answer key with reference.
                  </div>
                </div>
                <div className="contact-topic-item">
                  <div className="contact-topic-item__bullet" />
                  <div>
                    <strong>Study Material & Notes:</strong> Submit notes, revision tables, or suggest topic additions for Paper 1 units.
                  </div>
                </div>
                <div className="contact-topic-item">
                  <div className="contact-topic-item__bullet" />
                  <div>
                    <strong>Technical & CBT Feedback:</strong> Report any issue with mock test timers, responsive palettes, or account sync.
                  </div>
                </div>
                <div className="contact-topic-item">
                  <div className="contact-topic-item__bullet" />
                  <div>
                    <strong>Partnerships & Advertisements:</strong> Inquire about institutional collaboration or advertising opportunities.
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-response-badge">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Typical Response Time: Within 24–48 Business Hours</span>
            </div>
          </div>

          {/* RIGHT: FORM PANEL */}
          <div className="contact-form-card">
            <h2 className="contact-form-card__title">Send Us a Message</h2>
            <p className="contact-form-card__subtitle">
              Fill out the form below and our team will get back to your email.
            </p>

            {submitted ? (
              <div className="contact-success-box">
                <div className="contact-success-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="contact-success-title">Message Received!</h3>
                <p className="contact-success-desc">
                  Thank you for reaching out to UGC Free Paper. We have safely logged your inquiry and will reply to <strong>{formData.email}</strong> shortly.
                </p>
                <button
                  type="button"
                  className="contact-success-reset"
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({
                      name: '',
                      email: '',
                      category: 'General Feedback / Inquiry',
                      message: ''
                    })
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-form__row">
                  <div className="contact-form__group">
                    <label className="contact-form__label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="contact-form__input"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="contact-form__group">
                    <label className="contact-form__label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="contact-form__input"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="contact-form__group">
                  <label className="contact-form__label">Inquiry Category</label>
                  <select
                    className="contact-form__select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="General Feedback / Inquiry">General Feedback / Inquiry</option>
                    <option value="Question / Answer Key Discrepancy">Question / Answer Key Discrepancy</option>
                    <option value="Paper 1 Notes / Content Suggestion">Paper 1 Notes / Content Suggestion</option>
                    <option value="CBT Mock Test Technical Issue">CBT Mock Test Technical Issue</option>
                    <option value="Partnership & Advertising">Partnership & Advertising</option>
                  </select>
                </div>

                <div className="contact-form__group">
                  <label className="contact-form__label">Your Message *</label>
                  <textarea
                    required
                    className="contact-form__textarea"
                    placeholder="Describe your inquiry, question number, or suggestion in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                {error && (
                  <div className="contact-error">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="contact-form__submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="contact-spinner" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
