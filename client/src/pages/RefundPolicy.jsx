import './InfoPages.css'

const RefundPolicy = () => {
  return (
    <div className="info-page">
      <div className="info-page__container">
        <h1 className="info-page__title">Refund & Cancellation Policy</h1>
        <p className="info-page__subtitle">Please read our policy regarding donations and services.</p>

        <div className="info-page__content">
          <p>
            Thank you for visiting <strong>UGC Free Paper</strong>. We are committed to providing high-quality, free educational resources to help candidates prepare for their UGC NET/JRF examinations.
          </p>

          <h2>1. Free Educational Services</h2>
          <p>
            All core services provided by UGC Free Paper—including online mock tests, year-wise and unit-wise practice questionnaires, syllabus guides, and revision study notes—are <strong>100% free of charge</strong>. We do not sell subscriptions, courses, or premium access, and we do not charge users any fees to access our platform.
          </p>

          <h2>2. Voluntary Donations & Contributions</h2>
          <p>
            To help cover server hosting, database storage, api expenses, and website maintenance, we accept voluntary donations (contributions) from users who wish to support our mission. 
          </p>
          <p>
            By making a contribution, you acknowledge and agree that:
          </p>
          <ul>
            <li>Donations are completely voluntary and do not entitle you to any commercial goods, premium features, or exclusive services.</li>
            <li>No physical or digital products are shipped or delivered as a result of a donation.</li>
          </ul>

          <h2>3. No Refund Policy</h2>
          <p>
            Because all contributions made to UGC Free Paper are voluntary donations to keep our educational resources free for everyone, <strong>all donations are non-refundable</strong>. 
          </p>
          <p>
            Once a donation is successfully processed, it cannot be refunded, reversed, or cancelled. We kindly request that you contribute only if you are fully willing and able to support our free educational platform.
          </p>

          <h2>4. Cancellation of Donations</h2>
          <p>
            Since we do not offer monthly subscriptions, recurring payments, or auto-renewals, there are no recurring subscription charges to cancel. Every donation made on our platform is a one-time transaction.
          </p>

          <h2>5. Contact Us</h2>
          <p>
            If you have any questions, concerns, or feedback regarding our platform, support contributions, or this policy, please feel free to reach out to us:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:support@ugcfreepaper.com" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>support@ugcfreepaper.com</a></li>
            <li><strong>Contact Page:</strong> Click on our <a href="/contact" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Contact Us</a> page to send a message.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RefundPolicy
