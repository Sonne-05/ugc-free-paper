import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './Paper1Notes.css'

const Paper1Notes = () => {
  const [units, setUnits] = useState([
    { id: '1', name: 'Teaching Aptitude', isAvailable: true },
    { id: '2', name: 'Research Aptitude', isAvailable: true },
    { id: '3', name: 'Comprehension', isAvailable: true },
    { id: '4', name: 'Communication', isAvailable: true },
    { id: '5', name: 'Mathematical Reasoning & Aptitude', isAvailable: true },
    { id: '6', name: 'Logical Reasoning', isAvailable: true },
    { id: '7', name: 'Data Interpretation', isAvailable: true },
    { id: '8', name: 'Information & Communication Technology (ICT)', isAvailable: true },
    { id: '9', name: 'People, Development & Environment', isAvailable: true },
    { id: '10', name: 'Higher Education System', isAvailable: true },
  ])

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/notes`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnits(prevUnits => 
            prevUnits.map(unit => {
              const matchedNote = data.find(n => String(n.id) === String(unit.id));
              return {
                ...unit,
                isAvailable: matchedNote ? matchedNote.isAvailable !== false : true
              };
            })
          );
        }
      })
      .catch(err => console.error('Failed to fetch notes availability:', err))
  }, [])

  return (
    <div className="notes-page">
      <div className="notes-page__container">
        <h1 className="notes-page__title">UGC NET Paper I Notes</h1>
        <p className="notes-page__subtitle">Access comprehensive study notes and guides for all 10 units of the general aptitude paper.</p>

        {/* SEO & AdSense Compliant Rich Introductory Text */}
        <section className="notes-page__intro">
          <h2>About UGC NET Paper 1</h2>
          <p>
            UGC NET Paper 1 is a compulsory General Paper on Teaching and Research Aptitude, designed to assess the cognitive abilities, teaching skills, and research capabilities of candidates aspiring for Lectureship and Junior Research Fellowship (JRF) in Indian universities. The exam consists of 50 objective-type questions, each carrying 2 marks, totaling 100 marks. There is no negative marking.
          </p>
          <p>
            To qualify, candidates must score a minimum aggregate in both Paper 1 and Paper 2. Proper preparation across all 10 core units is key to boosting your overall percentile. Below is the complete unit-wise index of study guides, sample questions, and practice tips.
          </p>
        </section>

        <div className="notes-page__content">
          <table className="notes-table">
            <thead>
              <tr>
                <th className="notes-table__th col-unit">Unit</th>
                <th className="notes-table__th col-name">Unit Name</th>
                <th className="notes-table__th col-action">Prepare</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="notes-table__tr">
                  <td className="notes-table__td font-semibold">Unit {unit.id}</td>
                  <td className="notes-table__td">{unit.name}</td>
                  <td className="notes-table__td">
                    {unit.isAvailable ? (
                      <Link to={`/paper1-notes/unit-${unit.id}`} className="notes-table__btn-link">
                        Prepare
                      </Link>
                    ) : (
                      <button className="notes-table__btn-link notes-table__btn-link--disabled" disabled>
                        Coming Soon
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SEO & AdSense Compliant FAQ Section */}
        <section className="notes-page__faqs">
          <h2 className="faqs-title">Frequently Asked Questions (FAQs)</h2>
          <div className="faq-item">
            <h3 className="faq-question">What is the syllabus pattern of UGC NET Paper 1?</h3>
            <p className="faq-answer">
              Paper 1 contains 10 units: Teaching Aptitude, Research Aptitude, Reading Comprehension, Communication, Mathematical Reasoning, Logical Reasoning, Data Interpretation, Information & Communication Technology (ICT), People & Environment, and Higher Education System.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">Are the study notes aligned with the latest NTA guidelines?</h3>
            <p className="faq-answer">
              Yes, our preparation notes, strategies, and sample practice questions are updated according to the latest National Testing Agency (NTA) guidelines and previous years' question (PYQ) trends.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">How can I download the PDF syllabus?</h3>
            <p className="faq-answer">
              You can access detailed guides and recommended books for each unit by clicking the "Prepare" button next to the respective unit in our table index.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Paper1Notes
