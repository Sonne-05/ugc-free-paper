import { useState } from 'react'
import { API_BASE_URL } from '../services/api'
import './InfoPages.css'

const Contact = () => {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.message) {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${API_BASE_URL}/api/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        const data = await res.json()
        if (res.ok) {
          setSubmitted(true)
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
    <div className="info-page">
      <div className="info-page__container">
        <h1 className="info-page__title">Contact Us</h1>
        <p className="info-page__subtitle">Have a question or feedback? Drop us a message.</p>

        <div className="info-page__content">
          <p>
            We would love to hear from you. For support queries, feedback on mock exams, advertisement opportunities, or feature suggestions, fill out the form below or email us directly at <a href="mailto:support@ugcfreepaper.com" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>support@ugcfreepaper.com</a>.
          </p>

          {submitted ? (
            <div className="contact-success">
              Thank you for contacting us! We have received your message and will respond within 24 to 48 hours.
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form__group">
                <label className="contact-form__label">Full Name</label>
                <input
                  type="text"
                  required
                  className="contact-form__input"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="contact-form__group">
                <label className="contact-form__label">Email Address</label>
                <input
                  type="email"
                  required
                  className="contact-form__input"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="contact-form__group">
                <label className="contact-form__label">Your Message</label>
                <textarea
                  required
                  className="contact-form__textarea"
                  placeholder="How can we help you?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              {error && <div className="contact-error" style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</div>}
              <button type="submit" className="contact-form__submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Contact
