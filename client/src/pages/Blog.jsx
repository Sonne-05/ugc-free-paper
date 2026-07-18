import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import './Blog.css'

const Blog = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPost, setSelectedPost] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [email, setEmail] = useState('')

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

  // Find the featured post (fallback to first post if none marked featured)
  const featuredPost = filteredPosts.find(p => p.isFeatured) || filteredPosts[0]
  const otherPosts = filteredPosts.filter(p => p._id !== (featuredPost ? featuredPost._id : null))

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
          <>
            {/* Featured Post (only shown when 'All' is selected and search is empty) */}
            {selectedCategory === 'All' && !searchTerm && featuredPost && (
              <section className="featured-post">
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
                <article key={post._id} className="post-card">
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
                <article key={post._id} className="post-card">
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
              <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%' }}>
                <h3 style={{ marginBottom: '8px' }}>No articles found</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search queries or filter selections.</p>
              </div>
            )}
          </>
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
                <div className="blog-modal-body" dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Blog
