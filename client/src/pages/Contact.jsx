import { useState } from 'react'
import './InfoPages.css'

const Contact = () => {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true)
    }
  }

  return (
    <div className="info-page">
      <div className="info-page__container">
        <h1 className="info-page__title">Contact Us</h1>
        <p className="info-page__subtitle">Have a question or feedback? Drop us a message.</p>

        <div className="info-page__content">
          <p>
            We would love to hear from you. For support queries, feedback on mock exams, advertisement opportunities, or feature suggestions, fill out the form below or email us directly at <strong>support@ugcfreepaper.com</strong>.
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

              <button type="submit" className="contact-form__submit">
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Contact
