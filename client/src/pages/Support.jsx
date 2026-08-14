import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdSensePlaceholder from '../components/layout/AdSensePlaceholder'
import { API_BASE_URL } from '../services/api'
import './Support.css'

const Support = () => {
  const [settings, setSettings] = useState(null)
  const [openFaq, setOpenFaq] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.settings) setSettings(data.settings)
      })
      .catch(() => {})

    // Load Razorpay checkout script dynamically
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleDonation = async (amount) => {
    let finalAmount = amount
    if (amount === 'Custom') {
      const userAmount = prompt("Enter contribution amount (₹):")
      if (!userAmount) return
      const numAmount = Number(userAmount)
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid positive number.")
        return
      }
      finalAmount = numAmount
    }

    try {
      // 1. Create order on the backend
      const response = await fetch(`${API_BASE_URL}/api/payment/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: finalAmount })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.message || "Failed to initiate payment. Make sure payment keys are configured.")
        return
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: 'INR',
        name: 'UGC Free Paper',
        description: 'Support Free Quality Education',
        image: window.location.origin + '/logo.svg',
        order_id: data.order_id,
        handler: function (rzpResponse) {
          alert(`Thank you for your support! Payment ID: ${rzpResponse.razorpay_payment_id}`)
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#2563eb'
        }
      }

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options)
        rzp.open()
      } else {
        alert("Payment gateway SDK failed to load. Please refresh the page.")
      }
    } catch (err) {
      console.error('Payment error:', err)
      alert("Connection error. Could not initiate payment.")
    }
  }

  const faqs = [
    {
      q: 'Are all mock tests and PYQs completely free?',
      a: 'Yes. Every full-length mock test, unit-wise practice quiz, and official previous year paper on UGC Free Paper is completely free for all aspirants across India. We believe higher education prep should be universally accessible.'
    },
    {
      q: 'How does the CBT exam simulator match NTA standards?',
      a: 'Our mock test engine accurately emulates the official NTA Computer-Based Test (CBT) palette colors (Not Visited, Not Answered, Answered, Marked for Review), countdown timer, section navigation, and bilingual question views to give you real exam confidence.'
    },
    {
      q: 'How are voluntary community contributions utilized?',
      a: '100% of community contributions go toward high-bandwidth cloud servers, database indexing for thousands of questions, domain hosting, and keeping the platform free and operational for all aspirants.'
    },
    {
      q: 'Are payments and donation transactions secure?',
      a: 'Yes. All payments are encrypted and processed through standard, bank-grade PCI-DSS compliant payment gateways (Razorpay). We never store any credit card, debit card, or UPI credentials.'
    },
    {
      q: 'Can I access UGC Free Paper on mobile browsers?',
      a: 'Yes. The entire platform is built with a responsive mobile-first architecture. You can practice tests, read unit notes, and review solutions seamlessly on smartphones, tablets, and desktops.'
    }
  ]

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? -1 : idx)
  }

  return (
    <div className="support-page">
      {/* 1. HERO SECTION */}
      <section className="support-hero">
        <div className="support-hero__container">
          <span className="support-hero__tag">
            <span>🛡️</span> COMMUNITY & SUPPORT
          </span>
          <h1 className="support-hero__title">
            Help & Support <span className="support-hero__title-highlight">Center</span>
          </h1>
          <p className="support-hero__desc">
            Explore frequently asked questions, learn how our free ecosystem operates, or voluntarily support our server and database infrastructure.
          </p>
        </div>
      </section>

      {/* AdSense Placement 1: Top Leaderboard Banner */}
      <div className="ad-container" style={{ maxWidth: '1100px', margin: '24px auto 0 auto', padding: '0 24px', textAlign: 'center' }}>
        <AdSensePlaceholder format="horizontal" config={settings} />
      </div>

      <div className="support-container">
        {/* 2. COMMUNITY SUSTAINER TIERS */}
        <section className="support-tiers">
          <div className="support-section-head">
            <span className="support-section-head__tag">VOLUNTARY BACKING</span>
            <h2 className="support-section-head__title">Keep UGC Free Paper Accessible</h2>
            <p className="support-section-head__desc">
              We are a self-funded initiative. Voluntary student and faculty contributions help cover cloud servers and ongoing syllabus maintenance.
            </p>
          </div>

          <div className="support-tiers__grid">
            {/* TIER 1 */}
            <div className="support-tier-card">
              <div>
                <div className="support-tier__icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="support-tier__title">Chai Supporter</h3>
                <div className="support-tier__price">
                  <span className="support-tier__amount">₹29</span>
                  <span className="support-tier__period">one-time</span>
                </div>
                <p className="support-tier__desc">
                  A micro-contribution to keep our academic team energized with cutting chai while compiling solutions and verified notes.
                </p>
              </div>
              <button
                type="button"
                className="support-tier__btn"
                onClick={() => handleDonation(29)}
              >
                Contribute ₹29
              </button>
            </div>

            {/* TIER 2 (HIGHLIGHTED) */}
            <div className="support-tier-card support-tier-card--highlight">
              <span className="support-tier__badge">Most Popular</span>
              <div>
                <div className="support-tier__icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <h3 className="support-tier__title">Server & Hosting Backer</h3>
                <div className="support-tier__price">
                  <span className="support-tier__amount">₹99</span>
                  <span className="support-tier__period">one-time</span>
                </div>
                <p className="support-tier__desc">
                  Covers web server hosting bandwidth, high-speed database queries, and test session sync for hundreds of student test-takers.
                </p>
              </div>
              <button
                type="button"
                className="support-tier__btn support-tier__btn--primary"
                onClick={() => handleDonation(99)}
              >
                Contribute ₹99
              </button>
            </div>

            {/* TIER 3 */}
            <div className="support-tier-card">
              <div>
                <div className="support-tier__icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="support-tier__title">Custom Patron</h3>
                <div className="support-tier__price">
                  <span className="support-tier__amount">Custom</span>
                  <span className="support-tier__period">any amount</span>
                </div>
                <p className="support-tier__desc">
                  Choose any custom amount you wish to contribute towards our mission of zero-cost, high-quality test preparation.
                </p>
              </div>
              <button
                type="button"
                className="support-tier__btn"
                onClick={() => handleDonation('Custom')}
              >
                Contribute Custom
              </button>
            </div>
          </div>
        </section>

        {/* AdSense Placement 2: Mid-Content Ad Unit */}
        <div className="ad-container" style={{ margin: '0 auto', textAlign: 'center' }}>
          <AdSensePlaceholder format="horizontal" config={settings} />
        </div>

        {/* 3. INTERACTIVE FAQ ACCORDION */}
        <section className="support-faqs">
          <div className="support-section-head" style={{ marginBottom: '20px' }}>
            <span className="support-section-head__tag">FAQ GUIDE</span>
            <h2 className="support-section-head__title">Frequently Asked Questions</h2>
            <p className="support-section-head__desc">
              Answers to common queries about using our mock tests, study materials, and platform access.
            </p>
          </div>

          <div className="support-accordion">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className={`support-faq-item ${isOpen ? 'support-faq-item--open' : ''}`}
                >
                  <button
                    type="button"
                    className="support-faq-header"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="support-faq-title">{faq.q}</span>
                    <svg
                      className="support-faq-icon"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="support-faq-body">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 4. BOTTOM CONTACT STRIP */}
        <div className="support-contact-card">
          <div>
            <h3 className="support-contact-card__title">Still Need Help or Have a Question?</h3>
            <p className="support-contact-card__desc">
              Our academic and technical support team is here to assist you with any questions or issues.
            </p>
          </div>
          <Link to="/contact" className="support-contact-card__btn">
            Contact Support Team
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Support
