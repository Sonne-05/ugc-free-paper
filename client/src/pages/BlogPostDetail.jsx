import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../services/api'
import './BlogPostDetail.css'

const BlogPostDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMobileAd, setShowMobileAd] = useState(true)
  const [suggestedPosts, setSuggestedPosts] = useState([])

  // Scroll to top when loading a new post
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Fetch dynamic blog post details
    const fetchPost = fetch(`${API_BASE_URL}/api/posts/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Post not found')
        }
        return res.json()
      })
      .then(data => {
        setPost(data)
      })

    // Fetch other posts to select recommendations
    const fetchAllPosts = fetch(`${API_BASE_URL}/api/posts`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch articles')
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          // Exclude the current active post
          const filtered = data.filter(p => p._id !== id).slice(0, 3)
          setSuggestedPosts(filtered)
        }
      })
      .catch(err => {
        console.error('Failed to load related articles:', err)
      })

    Promise.all([fetchPost, fetchAllPosts])
      .catch(err => {
        console.error('Failed to load blog detail content:', err)
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (post) {
      const postUrl = `https://ugcfreepaper.com/blog/${post._id || id}`;
      const postTitle = `${post.title} - UGC Free Paper`;
      const postDesc = post.excerpt || 'Read this UGC NET preparation article and study guide on UGC Free Paper.';

      // Title & Meta Description
      document.title = postTitle;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', postDesc);

      // Canonical URL
      let canonicalLink = document.querySelector("link[rel='canonical']");
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', postUrl);

      // Open Graph Tags
      let ogUrl = document.querySelector("meta[property='og:url']");
      if (ogUrl) ogUrl.setAttribute('content', postUrl);
      let ogTitle = document.querySelector("meta[property='og:title']");
      if (ogTitle) ogTitle.setAttribute('content', postTitle);
      let ogDesc = document.querySelector("meta[property='og:description']");
      if (ogDesc) ogDesc.setAttribute('content', postDesc);

      // Twitter Tags
      let twUrl = document.querySelector("meta[property='twitter:url']");
      if (twUrl) twUrl.setAttribute('content', postUrl);
      let twTitle = document.querySelector("meta[property='twitter:title']");
      if (twTitle) twTitle.setAttribute('content', postTitle);
      let twDesc = document.querySelector("meta[property='twitter:description']");
      if (twDesc) twDesc.setAttribute('content', postDesc);

      // Inject Schema.org BlogPosting Structured Data
      let scriptTag = document.getElementById('blog-schema-ld');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'blog-schema-ld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': post.title,
        'description': postDesc,
        'author': {
          '@type': 'Person',
          'name': post.author || 'UGC Free Paper Team'
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'UGC Free Paper',
          'url': 'https://ugcfreepaper.com/',
          'logo': {
            '@type': 'ImageObject',
            'url': 'https://ugcfreepaper.com/logo.svg'
          }
        },
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': postUrl
        }
      });
    }
  }, [post, id]);

  // Helper to dynamically inject an in-article ad after the second paragraph of dynamic HTML content
  const injectInArticleAd = (htmlContent) => {
    if (!htmlContent) return ''
    const paragraphs = htmlContent.split('</p>')
    if (paragraphs.length > 2) {
      const firstPart = paragraphs.slice(0, 2).join('</p>') + '</p>'
      const secondPart = paragraphs.slice(2).join('</p>')
      
      const adSlotHtml = `
        <div class="in-article-ad-container">
          <span class="ad-label">Advertisement</span>
          <div class="ad-placeholder-box in-article-ad-box">
            <span class="ad-placeholder-text">Responsive AdSense Inline Banner</span>
          </div>
        </div>
      `
      return firstPart + adSlotHtml + secondPart
    }
    return htmlContent
  }

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
            
            {/* HTML Article content with dynamically injected in-article ad slot */}
            <div className="detail-body" dangerouslySetInnerHTML={{ __html: injectInArticleAd(post.content) }} />

            <div className="detail-divider" />

            {/* Suggested Reads Section */}
            {suggestedPosts.length > 0 && (
              <section className="suggested-reads-container">
                <h3 className="suggested-section-title">You Might Also Like</h3>
                <div className="suggested-reads-grid">
                  {suggestedPosts.map(item => (
                    <article key={item._id} className="suggested-item-card" onClick={() => navigate(`/blog/${item._id}`)}>
                      <span className="suggested-item-badge">{item.category}</span>
                      <h4 className="suggested-item-title">{item.title}</h4>
                      <div className="suggested-item-meta">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span>{item.readTime}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

          </article>

          {/* Sidebar column with advertisement */}
          <aside className="blog-detail-sidebar">
            {/* These widgets scroll normally */}
            <div className="sidebar-scroll-wrapper">
              
              {/* Related/Newsletter block */}
              <div className="sidebar-promo-box">
                <h3>Want NET Study Guides?</h3>
                <p>Subscribe to our free newsletter to get high-yield PDFs, study planners, and study materials directly in your inbox.</p>
                <Link to="/blog#subscribe" className="promo-btn">Go to Subscribe</Link>
              </div>

              {/* Ad Slot 1: Top Sidebar Ad (300x250) */}
              <div className="sidebar-ad-card">
                <span className="ad-badge-top">Advertisement</span>
                <div className="sidebar-ad-box display-ad-300">
                  <span className="ad-placeholder-text">Display Ad 1 (300 x 250)</span>
                </div>
              </div>

              {/* Ad Slot 2: Middle Sidebar Ad (300x250) */}
              <div className="sidebar-ad-card">
                <span className="ad-badge-top">Advertisement</span>
                <div className="sidebar-ad-box display-ad-300">
                  <span className="ad-placeholder-text">Display Ad 2 (300 x 250)</span>
                </div>
              </div>

            </div>

            {/* Only this bottom slot becomes sticky as the user scrolls further down */}
            <div className="sidebar-sticky-wrapper">
              {/* Ad Slot 3: Bottom Sticky Sidebar Ad (300x600) */}
              <div className="sidebar-ad-card">
                <span className="ad-badge-top">Advertisement</span>
                <div className="sidebar-ad-box display-ad-600">
                  <span className="ad-placeholder-text">Sticky Half-Page Ad (300 x 600)</span>
                </div>
              </div>
            </div>
          </aside>

        </div>
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

export default BlogPostDetail
