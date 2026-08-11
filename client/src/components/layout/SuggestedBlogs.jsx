import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../services/api'
import './SuggestedBlogs.css'

// Fallback high-yield articles to show if API is offline or during static pre-rendering
const FALLBACK_POSTS = [
  {
    _id: 'default-1',
    title: '30-Day UGC NET Paper 1 JRF Preparation Strategy',
    category: 'Strategy',
    excerpt: 'A complete day-by-day study roadmap, focus areas, and high-yield topics to score 80+ in Paper 1.',
    readTime: '6 min read',
    date: 'Aug 10, 2026'
  },
  {
    _id: 'default-2',
    title: 'Top 5 Mistakes to Avoid in UGC NET CBT Exam',
    category: 'Tips',
    excerpt: 'Learn how to optimize your time, navigate questions, and avoid panic in the computer-based test environment.',
    readTime: '4 min read',
    date: 'Aug 08, 2026'
  },
  {
    _id: 'default-3',
    title: 'How to Master Data Interpretation & Math Aptitude',
    category: 'Study Guide',
    excerpt: 'Visual tricks, core formulas, and shortcut methods to solve DI tables and mathematical questions quickly.',
    readTime: '5 min read',
    date: 'Aug 05, 2026'
  }
]

const SuggestedBlogs = ({ limit = 3 }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/posts`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Shuffle the array randomly and take the first 'limit' posts
          const shuffled = [...data].sort(() => 0.5 - Math.random())
          setPosts(shuffled.slice(0, limit))
        } else {
          const shuffledFallback = [...FALLBACK_POSTS].sort(() => 0.5 - Math.random())
          setPosts(shuffledFallback.slice(0, limit))
        }
        setLoading(false)
      })
      .catch(() => {
        // Fail gracefully to fallback posts
        setPosts(FALLBACK_POSTS.slice(0, limit))
        setLoading(false)
      })
  }, [limit])

  if (loading) {
    return (
      <div className="suggested-blogs">
        <h3 className="suggested-blogs__title">Recommended Preparation Guides</h3>
        <div className="suggested-blogs__loading">Loading recommendations...</div>
      </div>
    )
  }

  return (
    <div className="suggested-blogs">
      <h3 className="suggested-blogs__title">Recommended Preparation Guides</h3>
      <div className="suggested-blogs__list">
        {posts.map(post => {
          const isFallback = post._id.startsWith('default-')
          const linkTarget = isFallback ? '/blog' : `/blog/${post._id}`

          return (
            <article key={post._id} className="suggested-card">
              <span className={`suggested-card__badge suggested-card__badge--${post.category.toLowerCase().replace(/\s+/g, '-')}`}>
                {post.category}
              </span>
              <h4 className="suggested-card__title">
                <Link to={linkTarget}>{post.title}</Link>
              </h4>
              <p className="suggested-card__excerpt">{post.excerpt}</p>
              <div className="suggested-card__meta">
                <span>{post.readTime}</span>
                <span>•</span>
                <span>{post.date}</span>
              </div>
            </article>
          )
        })}
      </div>
      <Link to="/blog" className="suggested-blogs__see-all">
        View All Prep Articles
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  )
}

export default SuggestedBlogs
