import './InfoPages.css'

const About = () => {
  return (
    <div className="info-page">
      <div className="info-page__container">
        <h1 className="info-page__title">About Us</h1>
        <p className="info-page__subtitle">Learn about our mission and the team behind UGC Free Paper.</p>
        
        <div className="info-page__content">
          <p>
            Welcome to <strong>UGC Free Paper</strong>, a premier educational portal dedicated to helping lecturing and research fellowship aspirants in India crack the National Eligibility Test (UGC NET) with confidence.
          </p>

          <h2>Our Mission</h2>
          <p>
            Our mission is simple: to democratize high-quality test preparation resources. We understand the challenges aspirants face when preparing for Paper 1 (General Aptitude) and subject-specific Paper 2 examinations. We aim to provide structured syllabus guides, highly realistic mock exams, and instant performance metrics completely free.
          </p>

          <h2>Why Prep With Us?</h2>
          <ul>
            <li><strong>Expert Curriculum:</strong> All questions, quizzes, and revision guides are created by educators who have cleared UGC NET/JRF themselves.</li>
            <li><strong>Replicated CBT Interface:</strong> We simulate the Computer-Based Test environment of NTA so you get used to the interface before the actual exam.</li>
            <li><strong>Topic-Wise Analysis:</strong> Pinpoint your exact strengths and weaknesses using our detailed solution breakdown dashboard.</li>
          </ul>

          <h2>Get in Touch</h2>
          <p>
            We are constantly improving our mock test library and adding subject materials. If you have any suggestions, feedback, or would like to contribute study notes, feel free to visit our contact page or email us at support@ugcfreepaper.com.
          </p>
        </div>
      </div>
    </div>
  )
}

export default About
