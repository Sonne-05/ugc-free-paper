import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './BlogPostDetail.css'

const BlogPostDetail = () => {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE_URL}/api/posts/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Post not found')
        }
        return res.json()
      })
      .then(data => {
        setPost(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch blog post:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="blog-detail-page loading-state">
        <div className="spinner"></div>
        <p>Loading article...</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="blog-detail-page error-state">
        <h2>Article Not Found</h2>
        <p>Sorry, the article you are looking for does not exist or has been removed.</p>
        <Link to="/blog" className="back-btn">← Back to Blog</Link>
      </div>
    )
  }

  return (
    <div className="blog-detail-page">
      <div className="blog-detail-container">
        
        {/* Navigation back */}
        <div className="blog-detail-nav">
          <Link to="/blog" className="back-link">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Articles
          </Link>
        </div>

        {/* Layout Wrapper */}
        <div className="blog-detail-layout">
          
          {/* Main content column */}
          <article className="blog-detail-main">
            <span className="detail-badge">{post.category}</span>
            <h1 className="detail-title">{post.title}</h1>
            
            <div className="detail-meta">
              <span className="meta-item">
                <strong>By</strong> {post.author}
              </span>
              <span className="meta-separator">•</span>
              <span className="meta-item">{post.date}</span>
              <span className="meta-separator">•</span>
              <span className="meta-item">{post.readTime}</span>
            </div>

            <div className="detail-divider" />
            
            {/* HTML Article content */}
            <div className="detail-body" dangerouslySetInnerHTML={{ __html: post.content }} />

            <div className="detail-divider" />

            {/* Bottom Advertisement Placeholder */}
            <div className="blog-ad-placeholder bottom-ad">
              <div className="ad-label">Advertisement</div>
              <div className="ad-content">
                <p>Google AdSense / custom banner ad space (horizontal banner)</p>
                <span className="ad-hint">Paste your ad snippet code here in <code>BlogPostDetail.jsx</code></span>
              </div>
            </div>
          </article>

          {/* Sidebar column with advertisement */}
          <aside className="blog-detail-sidebar">
            <div className="sidebar-sticky-wrapper">
              
              {/* Sidebar Advertisement Placeholder */}
              <div className="blog-ad-placeholder sidebar-ad">
                <div className="ad-label">Advertisement</div>
                <div className="ad-content">
                  <p>Google AdSense / custom display ad space (skyscraper/square format)</p>
                  <span className="ad-hint">Paste your sidebar ad snippet code here in <code>BlogPostDetail.jsx</code></span>
                </div>
              </div>

              {/* Related/Newsletter block */}
              <div className="sidebar-promo-box">
                <h3>Want NET Study Guides?</h3>
                <p>Subscribe to our free newsletter to get high-yield PDFs, study planners, and study materials directly in your inbox.</p>
                <Link to="/blog" className="promo-btn">Go to Subscribe</Link>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}

export default BlogPostDetail
