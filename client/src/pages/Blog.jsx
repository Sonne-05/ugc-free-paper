import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './Blog.css'

const Blog = () => {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [subscribed, setSubscribed] = useState(false)
  const [email, setEmail] = useState('')
  const [showMobileAd, setShowMobileAd] = useState(true)

  const categories = ['All', 'Strategy', 'Study Guide', 'Tips']

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE_URL}/api/posts`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPosts(data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch blog posts:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!loading && window.location.hash === '#subscribe') {
      setTimeout(() => {
        const element = document.querySelector('.newsletter-box');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [loading])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (email) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        if (res.ok) {
          setSubscribed(true)
          setEmail('')
        } else {
          const errData = await res.json()
          alert(errData.message || 'Failed to subscribe. Please try again.')
        }
      } catch (err) {
        console.error('Subscription error:', err)
        alert('Network error. Please check your connection and try again.')
      }
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Find the featured post (fallback to first post if none marked featured)
  const featuredPost = filteredPosts.find(p => p.isFeatured) || filteredPosts[0]
  const otherPosts = filteredPosts.filter(p => p._id !== (featuredPost ? featuredPost._id : null))
  const popularPosts = posts.slice(0, 3)

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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            Loading articles...
          </div>
        ) : (
          <div className="blog-index-layout">
            
            {/* Main Content Column */}
            <div className="blog-index-main">
              
              {/* Featured Post (only shown when 'All' is selected and search is empty) */}
              {selectedCategory === 'All' && !searchTerm && featuredPost && (
                <section className="featured-post">
                  <div className="featured-content">
                    <span className="post-badge">{featuredPost.category}</span>
                    <h2 className="featured-title" onClick={() => navigate(`/blog/${featuredPost._id}`)}>{featuredPost.title}</h2>
                    <p className="featured-excerpt">{featuredPost.excerpt}</p>
                    <div className="post-meta">
                      <span>By {featuredPost.author}</span>
                      <span>•</span>
                      <span>{featuredPost.date}</span>
                      <span>•</span>
                      <span>{featuredPost.readTime}</span>
                    </div>
                    <button className="read-more-btn" onClick={() => navigate(`/blog/${featuredPost._id}`)}>
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
                {(selectedCategory !== 'All' || searchTerm) && filteredPosts.map((post, idx) => (
                  <div key={post._id} style={{ display: 'contents' }}>
                    <article className="post-card">
                      <div className="post-card-content">
                        <span className="post-badge">{post.category}</span>
                        <h3 className="post-card-title" onClick={() => navigate(`/blog/${post._id}`)}>{post.title}</h3>
                        <p className="post-card-excerpt">{post.excerpt}</p>
                        <div className="post-meta">
                          <span>{post.date}</span>
                          <span>•</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </article>
                    {/* Native In-Feed Ad Slot after the 3rd post */}
                    {idx === 2 && (
                      <div className="post-card native-ad-card">
                        <div className="post-card-content ad-card-content">
                          <span className="ad-badge">Sponsored</span>
                          <h4 className="ad-card-title">Free JRF Study Planner</h4>
                          <p className="ad-card-excerpt">Get our expert-approved 30-day timetable, revision trackers, and syllabus checklist. Download the PDF for free!</p>
                          <div className="ad-placeholder-box in-grid-ad-box">
                            <span className="ad-placeholder-text">AdSense Native Ad Unit</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Normal grid of other posts when no active filters */}
                {selectedCategory === 'All' && !searchTerm && otherPosts.map((post, idx) => (
                  <div key={post._id} style={{ display: 'contents' }}>
                    <article className="post-card">
                      <div className="post-card-content">
                        <span className="post-badge">{post.category}</span>
                        <h3 className="post-card-title" onClick={() => navigate(`/blog/${post._id}`)}>{post.title}</h3>
                        <p className="post-card-excerpt">{post.excerpt}</p>
                        <div className="post-meta">
                          <span>{post.date}</span>
                          <span>•</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </article>
                    {/* Native In-Feed Ad Slot after the 3rd post */}
                    {idx === 2 && (
                      <div className="post-card native-ad-card">
                        <div className="post-card-content ad-card-content">
                          <span className="ad-badge">Sponsored</span>
                          <h4 className="ad-card-title">Free JRF Study Planner</h4>
                          <p className="ad-card-excerpt">Get our expert-approved 30-day timetable, revision trackers, and syllabus checklist. Download the PDF for free!</p>
                          <div className="ad-placeholder-box in-grid-ad-box">
                            <span className="ad-placeholder-text">AdSense Native Ad Unit</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>

              {filteredPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%' }}>
                  <h3 style={{ marginBottom: '8px' }}>No articles found</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search queries or filter selections.</p>
                </div>
              )}
            </div>

            {/* Sidebar Column */}
            <aside className="blog-index-sidebar">
              <div className="sidebar-sticky-wrapper">
                
                {/* 300x250 Display Ad Block */}
                <div className="sidebar-ad-card">
                  <span className="ad-badge-top">Advertisement</span>
                  <div className="sidebar-ad-box display-ad-300">
                    <span className="ad-placeholder-text">Display Ad (300 x 250)</span>
                  </div>
                </div>

                {/* Popular Posts list */}
                {popularPosts.length > 0 && (
                  <div className="sidebar-widget popular-posts-widget">
                    <h3>Popular Articles</h3>
                    <div className="sidebar-popular-list">
                      {popularPosts.map(p => (
                        <div key={p._id} className="popular-item" onClick={() => navigate(`/blog/${p._id}`)}>
                          <span className="popular-category">{p.category}</span>
                          <h4 className="popular-title">{p.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newsletter Subscription inside Sidebar */}
                <div className="sidebar-widget newsletter-widget">
                  <h3>NetPrep Insights</h3>
                  <p>Subscribe to get high-yield revision trackers and PDF guides.</p>
                  {subscribed ? (
                    <p style={{ color: '#16a34a', fontSize: '0.88rem', fontWeight: 600 }}>✓ Subscribed!</p>
                  ) : (
                    <form onSubmit={handleSubscribe} className="sidebar-newsletter-form">
                      <input 
                        type="email" 
                        placeholder="Your email address" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <button type="submit">Subscribe</button>
                    </form>
                  )}
                </div>

                {/* 300x600 Half-page sticky ad box */}
                <div className="sidebar-ad-card">
                  <span className="ad-badge-top">Advertisement</span>
                  <div className="sidebar-ad-box display-ad-600">
                    <span className="ad-placeholder-text">Sticky Half-Page Ad (300 x 600)</span>
                  </div>
                </div>

              </div>
            </aside>

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

      </div>

      {/* Sticky Bottom Anchor Ad for Mobile */}
      {showMobileAd && (
        <div className="mobile-sticky-ad-banner">
          <button className="mobile-ad-close" onClick={() => setShowMobileAd(false)}>×</button>
          <span className="mobile-ad-label">Advertisement</span>
          <div className="mobile-ad-content-placeholder">
            <span>Google AdSense Anchor Ad (320x50)</span>
          </div>
        </div>
      )}

    </div>
  )
}

export default Blog
