import { useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import './Support.css'

const Support = () => {
  useEffect(() => {
    // Load Razorpay checkout script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Clean up script when component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleDonation = async (amount) => {
    let finalAmount = amount;
    if (amount === 'Custom') {
      const userAmount = prompt("Enter donation amount (₹):");
      if (!userAmount) return;
      const numAmount = Number(userAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid positive number.");
        return;
      }
      finalAmount = numAmount;
    }

    try {
      // 1. Create order on the backend
      const response = await fetch(`${API_BASE_URL}/api/payment/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: finalAmount })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        alert(data.message || "Failed to initiate payment. Make sure Razorpay keys are configured.");
        return;
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: 'INR',
        name: 'UGC Free Paper',
        description: 'Support Free Quality Education',
        order_id: data.order_id,
        handler: function (rzpResponse) {
          alert(`Payment Successful! Payment ID: ${rzpResponse.razorpay_payment_id}`);
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#3BBED0' // Matches your brand's sky light blue!
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay SDK failed to load. Please refresh the page.");
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert("Connection error. Could not initiate payment.");
    }
  }

  return (
    <div className="support-page">
      <div className="support-page__container">
        <h1 className="support-page__title">Support UGC Free Paper</h1>
        <p className="support-page__subtitle">Help us keep our study materials, syllabus guides, and mock tests free for everyone.</p>

        <main className="support-content">
          <section className="support-intro">
            <h2>Why Support Us?</h2>
            <p>
              UGC Free Paper is a self-funded educational resource dedicated to helping candidates across India prepare for Lectureship eligibility and Junior Research Fellowships (JRF). We believe that high-quality exam preparation should be open, high-yield, and accessible to all, regardless of financial barriers.
            </p>
            <p>
              Your contributions go directly toward covering hosting servers, database maintenance, and developing new mock quiz engines. Supporting us is entirely voluntary, and we appreciate any contribution to keep this project running.
            </p>
          </section>

          <div className="donation-grid">
            <div className="donation-card">
              <h3>Buy Us a Chai</h3>
              <p className="donation-amount">₹29</p>
              <p className="donation-desc">A micro-contribution to keep our team energized with a warm cup of cutting chai while writing guides.</p>
              <button className="donation-btn" onClick={() => handleDonation(29)}>Donate ₹29</button>
            </div>

            <div className="donation-card donation-card--highlight">
              <span className="card-badge">Popular</span>
              <h3>Hosting Contribution</h3>
              <p className="donation-amount">₹99</p>
              <p className="donation-desc">Helps cover server hosting bandwith and cloud database queries for a full week.</p>
              <button className="donation-btn" onClick={() => handleDonation(99)}>Donate ₹99</button>
            </div>

            <div className="donation-card">
              <h3>Custom Support</h3>
              <p className="donation-amount">Any</p>
              <p className="donation-desc">Choose any custom amount to support our mission of free quality education.</p>
              <button className="donation-btn" onClick={() => handleDonation('Custom')}>Donate Custom</button>
            </div>
          </div>

          {/* Support FAQs Section (AdSense & SEO Optimization) */}
          <section className="support-faqs">
            <h2 className="faqs-title">Support & Donation FAQs</h2>
            
            <div className="faq-item">
              <h3 className="faq-question">Will the study materials always remain free?</h3>
              <p className="faq-answer">
                Yes, our core mission is to provide free, high-yield study notes, previous year question papers (PYQs), and aptitude practice quizzes for all candidates. Donations help us keep the portal accessible without locking content behind paywalls.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">How are the contributed funds utilized?</h3>
              <p className="faq-answer">
                Every contribution is directly allocated toward platform maintenance costs, including secure web hosting servers, database query resources, syllabus updates, and interactive user interface development.
              </p>
            </div>
            
            <div className="faq-item">
              <h3 className="faq-question">Are contributions secure?</h3>
              <p className="faq-answer">
                Yes, we do not store any payment card information. All transactions are securely processed through standard, industry-compliant third-party gateways to ensure student data safety.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Support
