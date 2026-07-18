import { useState } from 'react'
import './Blog.css'

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPost, setSelectedPost] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [email, setEmail] = useState('')

  const categories = ['All', 'Strategy', 'Study Guide', 'Tips']

  const posts = [
    {
      id: 1,
      title: "UGC NET Paper 1 Preparation Strategy: Scoring 80+ Marks",
      category: "Strategy",
      date: "July 15, 2026",
      readTime: "6 min read",
      author: "Aditi Sharma",
      image: "/blog/ugc_net_prep.png",
      excerpt: "Learn the exact unit-wise strategy, topic weights, and mock test routines to score more than 80 marks in the General Paper I.",
      content: (
        <>
          <p>Scoring high in UGC NET Paper 1 is one of the most reliable ways to secure your Junior Research Fellowship (JRF). While many candidates focus heavily on their subject-specific Paper 2, Paper 1 consists of 50 questions that can easily push your overall percentage past the cutoff if prepared correctly.</p>
          
          <h3>1. Understand the Weightage</h3>
          <p>Paper 1 has 10 units, and NTA guidelines state that 5 questions are asked from each unit. However, in reality, the distribution can vary slightly. Units like Data Interpretation (DI), Reading Comprehension (RC), and Mathematical Reasoning are "sure-shot" units where you can score 100% accuracy with practice.</p>
          
          <h3>2. Unit-Wise Master Plan</h3>
          <ul>
            <li><strong>Teaching & Research Aptitude:</strong> Focus on levels of teaching, learner characteristics, research methodologies, and thesis/ethics structures.</li>
            <li><strong>Communication:</strong> Understand barriers to effective communication, classroom communication dynamics, and types of communication.</li>
            <li><strong>ICT & People-Environment:</strong> Keep short notes on digital initiatives in higher education, MDGs & SDGs, pollutants, and international protocols (Paris Agreement, Kyoto Protocol).</li>
          </ul>

          <h3>3. The Mock Test Routine</h3>
          <p>Do not wait until you finish the syllabus to start mock tests. Attempting previous years' questions (PYQ) under simulated time limits is crucial. Spend at least 1 hour reviewing your mistakes after each test to build conceptual clarity.</p>
        </>
      )
    },
    {
      id: 2,
      title: "Cracking Research Aptitude: Key Methodologies & Ethics",
      category: "Study Guide",
      date: "July 10, 2026",
      readTime: "8 min read",
      author: "Dr. Rajesh Verma",
      image: "/blog/research_aptitude.png",
      excerpt: "Research Aptitude is one of the most high-yield units in Paper 1. Master qualitative vs. quantitative methods, positivism, and publication ethics.",
      content: (
        <>
          <p>Research Aptitude forms the backbone of postgraduate scholarship and is a core component of the UGC NET exam. Many students struggle with the abstract nature of research philosophy. Here is a simplified breakdown to help you master this unit.</p>
          
          <h3>1. Research Paradigms: Positivism vs. Post-Positivism</h3>
          <p><strong>Positivism:</strong> Advocates for scientific, objective methods. It assumes there is a single, objective reality that can be measured.</p>
          <p><strong>Post-Positivism:</strong> Assumes that our knowledge of reality is always incomplete and subjective. It relies more on qualitative methods and recognizes observer bias.</p>
          
          <h3>2. Types of Research</h3>
          <ul>
            <li><strong>Experimental Research:</strong> Establishes cause-and-effect relationships by manipulating independent variables.</li>
            <li><strong>Descriptive Research:</strong> Describes characteristics of a population or phenomenon without manipulation.</li>
            <li><strong>Fundamental vs. Applied:</strong> Fundamental research aims to add theory, while Applied research solves immediate, practical problems.</li>
          </ul>

          <h3>3. Research Ethics</h3>
          <p>Ethical violations in research are frequently queried by NTA. Be thorough with concepts of plagiarism, fabrication, falsification, and citation guidelines. Remember that research ethics are critical at both data collection and reporting stages.</p>
        </>
      )
    },
    {
      id: 3,
      title: "Effective Time Management Secrets for Exam Day",
      category: "Tips",
      date: "July 05, 2026",
      readTime: "5 min read",
      author: "Vikram Malhotra",
      image: "/blog/time_management.png",
      excerpt: "Time is your biggest enemy in UGC NET. Discover how to allocate your 180 minutes across Paper 1 and Paper 2 to avoid leaving questions unanswered.",
      content: (
        <>
          <p>UGC NET is a continuous 3-hour (180 minutes) computer-based test with no breaks. With 150 questions to solve, you get an average of 1.2 minutes per question. Poor time management is the number one reason candidates miss out on qualifying, even when they know the syllabus.</p>
          
          <h3>1. The Two-Pass Strategy</h3>
          <p>Never get stuck on a single question. If a math or logic question takes more than 2 minutes, mark it for review and move on. In the first pass, answer all direct and theoretical questions. In the second pass, tackle the remaining marked questions.</p>
          
          <h3>2. Time Allocation Plan</h3>
          <ul>
            <li><strong>First 60 Minutes:</strong> Dedicate this to Paper 1. Complete RCs, Communication, ICT, and Teaching Aptitude. Leave the complex DI and Math questions for the end of this hour.</li>
            <li><strong>Next 100 Minutes:</strong> Solve Paper 2 (your core subject). Since these questions require deep domain knowledge, stay focused and try to complete them with 20 minutes to spare.</li>
            <li><strong>Last 20 Minutes:</strong> Revisit marked questions in both papers and review your answers. Since there is no negative marking, ensure all 150 questions have an option selected!</li>
          </ul>
        </>
      )
    },
    {
      id: 4,
      title: "How to Solve Data Interpretation (DI) Without Fear",
      category: "Tips",
      date: "June 28, 2026",
      readTime: "7 min read",
      author: "Priya Nair",
      image: "/blog/data_interpretation.png",
      excerpt: "Data Interpretation doesn't have to be hard. Learn the shortcut tricks for ratio, percentage, and averages that solve any table chart in under 2 minutes.",
      content: (
        <>
          <p>Data Interpretation is a guaranteed source of 10 marks (5 questions) in UGC NET Paper 1. Many candidates fear DI due to a lack of math confidence, but net prep DI relies on basic mathematical arithmetic rather than high-level algebra. Master these simple tricks to score full marks.</p>
          
          <h3>1. Learn Percentages & Ratios</h3>
          <p>The majority of DI questions ask for percentage increase/decrease, ratios between columns, or average values. Memorize fraction-to-percentage conversions (e.g., 1/8 = 12.5%, 1/6 = 16.67%) to calculate values in your head instead of using long division.</p>
          
          <h3>2. Use Approximation</h3>
          <p>NTA options are often spaced far enough apart. If you need to calculate 2345 as a percentage of 5689, approximate it as 2300 / 5700. This saves valuable scratchpad time and points you straight to the correct option.</p>
          
          <h3>3. Read Table Headers Carefully</h3>
          <p>Always check the units (e.g., "in lakhs", "in millions", "percentage of total"). A common mistake is selecting an option that has the right digit value but incorrect decimal scale due to ignoring header units.</p>
        </>
      )
    }
  ]

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredPost = posts[0]
  const otherPosts = filteredPosts.filter(p => p.id !== featuredPost.id)

  return (
    <div className="blog-page">
      <div className="blog-container">
        
        {/* Header */}
        <header className="blog-header">
          <h1 className="blog-title">NET Preparation Blog</h1>
          <p className="blog-subtitle">Expert strategies, high-yield syllabus breakdowns, and exam tips to boost your UGC NET score.</p>
        </header>

        {/* Filter Bar */}
        <section className="blog-filter-bar">
          <div className="blog-categories">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`category-btn ${selectedCategory === cat ? 'category-btn--active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <input 
            type="text" 
            placeholder="Search articles..." 
            className="blog-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </section>

        {/* Featured Post (only shown when 'All' or 'Strategy' is selected and search is empty) */}
        {selectedCategory === 'All' && !searchTerm && (
          <section className="featured-post">
            <div className="featured-image-wrapper">
              <img src={featuredPost.image} alt={featuredPost.title} className="featured-image" />
            </div>
            <div className="featured-content">
              <span className="post-badge">{featuredPost.category}</span>
              <h2 className="featured-title" onClick={() => setSelectedPost(featuredPost)}>{featuredPost.title}</h2>
              <p className="featured-excerpt">{featuredPost.excerpt}</p>
              <div className="post-meta">
                <span>By {featuredPost.author}</span>
                <span>•</span>
                <span>{featuredPost.date}</span>
                <span>•</span>
                <span>{featuredPost.readTime}</span>
              </div>
              <button className="read-more-btn" onClick={() => setSelectedPost(featuredPost)}>
                Read Article 
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* Posts Grid */}
        <section className="posts-grid">
          {/* Include featured post in the grid if category/search active */}
          {(selectedCategory !== 'All' || searchTerm) && filteredPosts.map(post => (
            <article key={post.id} className="post-card">
              <div className="post-card-image-wrapper">
                <img src={post.image} alt={post.title} className="post-card-image" />
              </div>
              <div className="post-card-content">
                <span className="post-badge">{post.category}</span>
                <h3 className="post-card-title" onClick={() => setSelectedPost(post)}>{post.title}</h3>
                <p className="post-card-excerpt">{post.excerpt}</p>
                <div className="post-meta">
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </article>
          ))}

          {/* Normal grid of other posts when no active filters */}
          {selectedCategory === 'All' && !searchTerm && otherPosts.map(post => (
            <article key={post.id} className="post-card">
              <div className="post-card-image-wrapper">
                <img src={post.image} alt={post.title} className="post-card-image" />
              </div>
              <div className="post-card-content">
                <span className="post-badge">{post.category}</span>
                <h3 className="post-card-title" onClick={() => setSelectedPost(post)}>{post.title}</h3>
                <p className="post-card-excerpt">{post.excerpt}</p>
                <div className="post-meta">
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        {filteredPosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <h3 style={{ marginBottom: '8px' }}>No articles found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search queries or filter selections.</p>
          </div>
        )}

        {/* Newsletter Subscription */}
        <section className="newsletter-box">
          <h2 className="newsletter-title">Subscribe to NetPrep Insights</h2>
          <p className="newsletter-desc">Get high-yield study guides, previous year question analyses, and cut-off updates directly in your inbox.</p>
          {subscribed ? (
            <p style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Thank you for subscribing! Check your email for study resources.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="newsletter-form">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="newsletter-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="newsletter-btn">Subscribe</button>
            </form>
          )}
        </section>

        {/* Detail Modal Overlay */}
        {selectedPost && (
          <div className="blog-modal-overlay" onClick={() => setSelectedPost(null)}>
            <div className="blog-modal" onClick={(e) => e.stopPropagation()}>
              <button className="blog-modal-close" onClick={() => setSelectedPost(null)}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="blog-modal-image-wrapper">
                <img src={selectedPost.image} alt={selectedPost.title} className="blog-modal-image" />
              </div>
              <div className="blog-modal-content">
                <span className="post-badge">{selectedPost.category}</span>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginTop: '12px', lineHeight: '1.3' }}>{selectedPost.title}</h2>
                <div className="post-meta" style={{ marginTop: '16px', marginBottom: '24px' }}>
                  <span>By {selectedPost.author}</span>
                  <span>•</span>
                  <span>{selectedPost.date}</span>
                  <span>•</span>
                  <span>{selectedPost.readTime}</span>
                </div>
                <div className="blog-modal-menu-divider" style={{ borderBottom: '1px solid var(--border)', marginBottom: '24px' }} />
                <div className="blog-modal-body">
                  {selectedPost.content}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Blog
