import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import './QuestionSolution.css';

const QuestionSolution = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedOption(null);
    setShowExplanation(false);
    setCopied(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/questions/public/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Question not found or server error');
        return res.json();
      })
      .then(result => {
        setData(result);
      })
      .catch(err => {
        console.error('Error fetching question solution:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Dynamic SEO Tags & Schema.org JSON-LD injection
  useEffect(() => {
    if (!data || !data.question) return;

    const q = data.question;
    const set = data.set || {};
    
    // Generate clean text snippet for SEO (max 90 chars)
    const cleanText = (q.text || 'UGC NET Question')
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const previewText = cleanText.length > 80 ? cleanText.substring(0, 80) + '...' : cleanText;
    const paperName = set.paper === 'paper2' ? (set.subject || 'Paper 2') : 'Paper 1';
    const yearStr = set.year ? `${set.year} ` : '';
    
    const pageTitle = `${previewText} | UGC NET ${paperName} ${yearStr}Solved Question & Solution`;
    const pageDesc = `Detailed step-by-step solution, correct answer, and explanation for UGC NET ${paperName} (${yearStr}Exam). Practice this question and full CBT mock tests free on UGC Free Paper.`;
    const canonicalUrl = `https://ugcfreepaper.com/question/${q.id || id}`;

    // Title
    document.title = pageTitle;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', pageDesc);

    // Canonical Link
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // OpenGraph Tags
    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    const ogDesc = document.querySelector("meta[property='og:description']");
    if (ogDesc) ogDesc.setAttribute('content', pageDesc);
    const ogUrl = document.querySelector("meta[property='og:url']");
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    // Inject Rich Schema.org (Quiz, Question, BreadcrumbList)
    let schemaTag = document.getElementById('question-schema-ld');
    if (!schemaTag) {
      schemaTag = document.createElement('script');
      schemaTag.id = 'question-schema-ld';
      schemaTag.type = 'application/ld+json';
      document.head.appendChild(schemaTag);
    }

    const correctIndex = parseInt(q.correct, 10) || 1;
    const optionsArray = Array.isArray(q.options) ? q.options : [];
    const correctOptionText = optionsArray[correctIndex - 1] || `Option ${correctIndex}`;

    const schemaData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Home',
              'item': 'https://ugcfreepaper.com/'
            },
            {
              '@type': 'ListItem',
              'position': 2,
              'name': `UGC NET ${paperName}`,
              'item': set.paper === 'paper2' ? `https://ugcfreepaper.com/paper2?subject=${encodeURIComponent(set.subject || '')}` : 'https://ugcfreepaper.com/paper1'
            },
            {
              '@type': 'ListItem',
              'position': 3,
              'name': set.title || 'Previous Year Questions',
              'item': canonicalUrl
            }
          ]
        },
        {
          '@type': 'Quiz',
          'name': pageTitle,
          'description': pageDesc,
          'hasPart': {
            '@type': 'Question',
            'name': cleanText,
            'text': cleanText,
            'suggestedAnswer': optionsArray.map((opt, idx) => ({
              '@type': 'Answer',
              'position': idx + 1,
              'text': opt
            })),
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': correctOptionText,
              'comment': {
                '@type': 'Comment',
                'text': q.explanation || 'Verified UGC NET Official Answer'
              }
            }
          }
        }
      ]
    };

    schemaTag.textContent = JSON.stringify(schemaData);

    return () => {
      if (schemaTag) schemaTag.remove();
    };
  }, [data, id]);

  const formatContent = (str) => {
    if (!str || typeof str !== 'string') return '';
    if (/<[a-z][\s\S]*>/i.test(str)) {
      return <div className="qs-rich-text" dangerouslySetInnerHTML={{ __html: str }} />;
    }
    const formatted = str
      .replace(/\^([a-zA-Z0-9\-+∞\(\)]+)/g, '<sup>$1</sup>')
      .replace(/_([a-zA-Z0-9\-+∞\(\)]+)/g, '<sub>$1</sub>')
      .replace(/\[bar\/([^\]]+)\]/g, '<span style="text-decoration: overline;">$1</span>')
      .replace(/!=/g, '≠')
      .replace(/=>/g, '⇒')
      .replace(/->/g, '→');

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShareWhatsApp = () => {
    const text = `Check out this UGC NET Solved Question on UGC Free Paper:\n${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="qs-page-container">
        <div className="qs-loading-skeleton">
          <div className="qs-skeleton-line short"></div>
          <div className="qs-skeleton-line title"></div>
          <div className="qs-skeleton-box"></div>
          <div className="qs-skeleton-line"></div>
          <div className="qs-skeleton-line"></div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.question) {
    return (
      <div className="qs-page-container">
        <div className="qs-error-card">
          <h2>Question Not Found</h2>
          <p>We could not locate this question. It might have been updated or removed.</p>
          <div className="qs-error-actions">
            <Link to="/paper1" className="qs-btn-primary">Browse Paper 1 PYQs</Link>
            <Link to="/paper2" className="qs-btn-secondary">Browse Paper 2 PYQs</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = data.question;
  const set = data.set || {};
  const prevQ = data.prevQuestion;
  const nextQ = data.nextQuestion;
  const related = data.relatedQuestions || [];

  const correctIndex = parseInt(q.correct, 10) || 1;
  const options = Array.isArray(q.options) ? q.options : [];

  return (
    <div className="qs-page-container">
      {/* Breadcrumb navigation for SEO & Crawlers */}
      <nav className="qs-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="qs-bc-separator">/</span>
        <Link to={set.paper === 'paper2' ? `/paper2?subject=${encodeURIComponent(set.subject || '')}` : '/paper1'}>
          {set.paper === 'paper2' ? (set.subject || 'Paper 2') : 'Paper 1'}
        </Link>
        {set.title && (
          <>
            <span className="qs-bc-separator">/</span>
            <span className="qs-bc-current">{set.title}</span>
          </>
        )}
      </nav>

      {/* Main Content Layout */}
      <div className="qs-layout">
        <main className="qs-main-card">
          {/* Header Badges */}
          <div className="qs-meta-badges">
            {set.year && <span className="qs-badge qs-badge-year">📅 {set.year}</span>}
            {set.subject && <span className="qs-badge qs-badge-subject">📚 {set.subject}</span>}
            {q.unit && <span className="qs-badge qs-badge-unit">🎯 {q.unit}</span>}
            {q.qIndex && <span className="qs-badge qs-badge-num">Q. No: {q.qIndex}</span>}
            {q.ntaQuestionId && <span className="qs-badge qs-badge-nta">NTA ID: {q.ntaQuestionId}</span>}
          </div>

          {/* Reading Comprehension Passage (Type: comprehension) */}
          {q.passage && q.passage.trim() !== '' && (
            <div className="qs-passage-box">
              <h4 className="qs-passage-title">📖 Read the following passage carefully:</h4>
              <div className="qs-passage-body">{formatContent(q.passage)}</div>
            </div>
          )}

          {/* Question Text */}
          <div className="qs-question-text">
            <h3>{formatContent(q.text)}</h3>
          </div>

          {/* Assertion & Reason (Type: assertion-reason) */}
          {((q.assertion && q.assertion.trim() !== '') || (q.reason && q.reason.trim() !== '')) && (
            <div className="qs-assertion-box">
              {q.assertion && q.assertion.trim() !== '' && (
                <div className="qs-ar-item">
                  <span className="qs-ar-label">Assertion (A):</span>
                  <span className="qs-ar-text">{formatContent(q.assertion)}</span>
                </div>
              )}
              {q.reason && q.reason.trim() !== '' && (
                <div className="qs-ar-item">
                  <span className="qs-ar-label">Reason (R):</span>
                  <span className="qs-ar-text">{formatContent(q.reason)}</span>
                </div>
              )}
            </div>
          )}

          {/* Multiple Statements / Arrangement (Type: multiple-statement) */}
          {Array.isArray(q.statements) && q.statements.some(s => s && s.trim() !== '') && (
            <div className="qs-statements-box">
              <span className="qs-stmt-header">Given the statements:</span>
              <ul className="qs-stmt-list">
                {q.statements.filter(s => s && s.trim() !== '').map((stmt, idx) => (
                  <li key={idx}><strong>({String.fromCharCode(65 + idx)})</strong> {formatContent(stmt)}</li>
                ))}
              </ul>
              {q.subPrompt && <div className="qs-subprompt">{formatContent(q.subPrompt)}</div>}
            </div>
          )}

          {/* Match the Following Column Grid (Type: match-column) */}
          {(q.type === 'match-column' || (q.list1Header && q.list2Header)) && 
           Array.isArray(q.list1) && q.list1.some(item => item && item.trim() !== '') && (
            <div className="qs-match-grid">
              <div className="qs-match-col">
                <div className="qs-match-header">{q.list1Header || 'List I'}</div>
                {q.list1.filter(item => item && item.trim() !== '').map((item, idx) => (
                  <div key={idx} className="qs-match-item">
                    <span className="qs-match-tag">({String.fromCharCode(65 + idx)})</span> {formatContent(item)}
                  </div>
                ))}
              </div>
              <div className="qs-match-col">
                <div className="qs-match-header">{q.list2Header || 'List II'}</div>
                {(q.list2 || []).filter(item => item && item.trim() !== '').map((item, idx) => (
                  <div key={idx} className="qs-match-item">
                    <span className="qs-match-tag">({idx + 1})</span> {formatContent(item)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Options List (MCQ / All Types) */}
          <div className="qs-options-container">
            <span className="qs-options-title">Select an option to test your answer:</span>
            <div className="qs-options-list">
              {options.map((opt, idx) => {
                const optNum = idx + 1;
                const isSelected = selectedOption === optNum;
                const isCorrect = optNum === correctIndex;
                
                let optClass = 'qs-option-item';
                if (showExplanation || selectedOption !== null) {
                  if (isCorrect) optClass += ' correct-opt';
                  else if (isSelected && !isCorrect) optClass += ' wrong-opt';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    className={optClass}
                    onClick={() => {
                      setSelectedOption(optNum);
                      setShowExplanation(true);
                    }}
                  >
                    <span className="qs-opt-number">({optNum})</span>
                    <span className="qs-opt-content">{formatContent(opt)}</span>
                    {(showExplanation || selectedOption !== null) && isCorrect && (
                      <span className="qs-opt-badge-correct">✓ Correct</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="qs-actions-bar">
            <button
              type="button"
              className="qs-btn-toggle-solution"
              onClick={() => setShowExplanation(prev => !prev)}
            >
              {showExplanation ? '👁️ Hide Detailed Solution' : '💡 Show Detailed Solution & Answer'}
            </button>

            <div className="qs-share-buttons">
              <button type="button" className="qs-btn-share" onClick={handleCopyLink} title="Copy Link">
                {copied ? '✅ Link Copied!' : '🔗 Copy Link'}
              </button>
              <button type="button" className="qs-btn-whatsapp" onClick={handleShareWhatsApp} title="Share on WhatsApp">
                💬 Share
              </button>
            </div>
          </div>

          {/* Detailed Solution / Academic Explanation */}
          {showExplanation && (
            <div className="qs-solution-box">
              <div className="qs-sol-header">
                <span className="qs-sol-icon">🎯</span>
                <div>
                  <strong>Official Correct Answer: Option ({correctIndex})</strong>
                  <div className="qs-correct-text">{formatContent(options[correctIndex - 1])}</div>
                </div>
              </div>

              <div className="qs-sol-body">
                <h4 className="qs-sol-title">📖 Detailed Academic Explanation:</h4>
                <div className="qs-explanation-content">
                  {q.explanation ? (
                    formatContent(q.explanation)
                  ) : (
                    <p className="qs-no-exp">
                      The official key issued by the National Testing Agency (NTA) confirms <strong>Option ({correctIndex})</strong> as the correct answer.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Previous & Next Navigation */}
          <div className="qs-nav-footer">
            {prevQ ? (
              <Link to={`/question/${prevQ._id || prevQ.id}`} className="qs-nav-btn qs-nav-prev">
                ← Previous (Q{prevQ.qIndex || ''})
              </Link>
            ) : <div />}

            {nextQ ? (
              <Link to={`/question/${nextQ._id || nextQ.id}`} className="qs-nav-btn qs-nav-next">
                Next Question (Q{nextQ.qIndex || ''}) →
              </Link>
            ) : <div />}
          </div>
        </main>

        {/* Sidebar: Conversion CTA & Related Questions Mesh */}
        <aside className="qs-sidebar">
          {/* Mock Test Conversion Box */}
          <div className="qs-card qs-cta-card">
            <span className="qs-cta-tag">🔥 100% Free Practice</span>
            <h4>Attempt Full CBT Mock Test</h4>
            <p>Practice this complete {set.year || ''} {set.title || 'question paper'} in authentic NTA exam interface with timer & analytics.</p>
            <Link to="/paper1" className="qs-btn-cta">
              🚀 Start Full Mock Test
            </Link>
          </div>

          {/* Related Questions Internal Linking Mesh */}
          {related.length > 0 && (
            <div className="qs-card qs-related-card">
              <h4 className="qs-related-title">📌 Related {q.unit || 'Exam'} Questions</h4>
              <div className="qs-related-list">
                {related.map((rq, idx) => (
                  <Link
                    key={rq._id || rq.id || idx}
                    to={`/question/${rq._id || rq.id}`}
                    className="qs-related-item"
                  >
                    <span className="qs-rq-num">Q{rq.qIndex || idx + 1}</span>
                    <span className="qs-rq-text">{rq.text ? rq.text.substring(0, 75) + '...' : 'View Question'}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Subject Links */}
          <div className="qs-card qs-links-card">
            <h4 className="qs-links-title">⚡ Quick Study Links</h4>
            <ul className="qs-quick-links">
              <li><Link to="/paper1">📝 UGC NET Paper 1 Mock Tests</Link></li>
              <li><Link to="/paper1-unit-pyq">🎯 Unit-wise Paper 1 Practice</Link></li>
              <li><Link to="/paper1-notes">📚 Free Paper 1 Revision Notes</Link></li>
              <li><Link to="/paper2">📖 Paper 2 Core Subjects</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuestionSolution;
