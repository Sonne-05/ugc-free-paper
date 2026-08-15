import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

// Mock DOM globals for server-side rendering compatibility of browser-only packages (like Jodit)
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'https://ugcfreepaper.com'
})

// Copy JSDOM window properties to globalThis so DOM classes (Node, HTMLElement, etc.) are available globally
Object.getOwnPropertyNames(dom.window).forEach(prop => {
  if (
    prop !== 'undefined' &&
    prop !== 'NaN' &&
    prop !== 'Infinity' &&
    prop !== 'global' &&
    prop !== 'globalThis' &&
    !(prop in globalThis)
  ) {
    try {
      Object.defineProperty(globalThis, prop, {
        get: () => dom.window[prop],
        configurable: true
      })
    } catch (e) {
      // Ignore properties that cannot be defined
    }
  }
})

Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true, writable: true })
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true, writable: true })
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  },
  configurable: true,
  writable: true
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

async function run() {
  console.log('Starting prerendering process...')
  
  // 1. Read index.html template
  const templatePath = toAbsolute('dist/index.html')
  if (!fs.existsSync(templatePath)) {
    console.error('Error: dist/index.html template not found. Build the client project first.')
    process.exit(1)
  }
  const template = fs.readFileSync(templatePath, 'utf-8')

  // Save the original clean, unrendered template to fallback.html for SPA fallback routing
  fs.writeFileSync(toAbsolute('dist/fallback.html'), template)

  // 2. Import server entry
  const serverBundlePath = toAbsolute('dist/server/entry-server.js')
  if (!fs.existsSync(serverBundlePath)) {
    console.error('Error: dist/server/entry-server.js server bundle not found. Run vite build --ssr first.')
    process.exit(1)
  }
  const { render } = await import(pathToFileURL(serverBundlePath).href)

  // 3. Define routes
  const staticRoutes = [
    { path: '/', title: 'UGC Free Paper - Free UGC NET Paper 1 & 2 PYQ Practice & Mock Tests', desc: 'Practice UGC NET Paper 1 (General Aptitude) and Paper 2 previous year questions (PYQs) and realistic CBT mock tests. Study notes, detailed explanations, completely free.' },
    { path: '/paper1', title: 'UGC NET Paper 1 PYQ Practice - UGC Free Paper', desc: 'Practice UGC NET Paper 1 (General Paper on Teaching & Research Aptitude) previous year questions by year and unit. Free mock tests and answers.' },
    { path: '/paper1-unit-pyq', title: 'UGC NET Paper 1 (Unit Wise) PYQ Practice - UGC Free Paper', desc: 'Practice UGC NET Paper 1 previous year questions unit-wise. Completely free CBT practice tests for all 10 general aptitude syllabus units.' },
    { path: '/paper2', title: 'UGC NET Paper 2 PYQ Practice - UGC Free Paper', desc: 'Practice UGC NET Paper 2 subject-specific previous year questions. Free online CBT mock tests and detailed explanations for your subject.' },
    { path: '/paper1-notes', title: 'UGC NET Paper 1 Study Notes - UGC Free Paper', desc: 'Access free unit-wise study notes, revision guides, and short summaries for UGC NET Paper 1. Boost your preparation with expert resources.' },
    { path: '/about', title: 'About Us - UGC Free Paper', desc: 'Learn about the mission and the team behind UGC Free Paper. We democratize UGC NET exam preparation resources.' },
    { path: '/blog', title: 'UGC NET Prep Blog - UGC Free Paper', desc: 'Read the latest news, prep strategies, syllabus updates, and tips to crack UGC NET / JRF.' },
    { path: '/contact', title: 'Contact Us - UGC Free Paper', desc: 'Have questions, suggestions, or feedback? Get in touch with the UGC Free Paper team.' },
    { path: '/support', title: 'Help & Support - UGC Free Paper', desc: 'Get help and support for using UGC Free Paper mock tests, study materials, and account issues.' },
    { path: '/privacy', title: 'Privacy Policy - UGC Free Paper', desc: 'Read the Privacy Policy of UGC Free Paper to understand how we collect, use, and protect your data.' },
    { path: '/terms', title: 'Terms of Service - UGC Free Paper', desc: 'Read the Terms of Service and user agreement for accessing UGC Free Paper mock tests and notes.' },
    { path: '/refund-policy', title: 'Refund Policy - UGC Free Paper', desc: 'Read the Refund Policy for UGC Free Paper mock tests and premium materials.' },
    { path: '/mocktest', title: 'Free UGC NET CBT Mock Test - UGC Free Paper', desc: 'Take a realistic, timed UGC NET Computer Based Test (CBT) mock exam to simulate the real NTA test environment.' },
    { path: '/404', title: '404 - Page Not Found | UGC Free Paper', desc: 'The requested page could not be found on UGC Free Paper.' }
  ]

  const routes = [...staticRoutes]

  // 4. Dynamically fetch blog posts & notes from local API if server is running
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000'
  
  console.log(`Fetching dynamic data from backend API at ${API_BASE_URL}...`)
  try {
    const postsRes = await fetch(`${API_BASE_URL}/api/posts`)
    if (postsRes.ok) {
      const posts = await postsRes.json()
      posts.forEach(post => {
        routes.push({
          path: `/blog/${post.id || post._id}`,
          title: `${post.title} - UGC Free Paper`,
          desc: post.excerpt || 'Read this article on UGC Free Paper.'
        })
      })
      console.log(`Loaded ${posts.length} blog posts.`)
    }
  } catch (err) {
    console.warn('Could not fetch blog posts from API (is backend server running?). Skipping dynamic blog posts.')
  }

  try {
    const notesRes = await fetch(`${API_BASE_URL}/api/notes`)
    if (notesRes.ok) {
      const notes = await notesRes.json()
      notes.forEach(note => {
        routes.push({
          path: `/paper1-notes/unit-${note.id || note.unitId}`,
          title: `${note.title || (note.unitTitle || `Unit ${note.unitId}`)} Notes - UGC Free Paper`,
          desc: note.subtitle || `Practice and read notes for UGC NET Paper 1 - ${note.unitTitle || `Unit ${note.unitId}`}.`
        })
      })
      console.log(`Loaded ${notes.length} notes units.`)
    }
  } catch (err) {
    console.warn('Could not fetch notes from API. Skipping dynamic notes.')
  }

  // 5. Prerender each route
  for (const r of routes) {
    console.log(`Prerendering ${r.path}...`)
    
    // Render HTML
    let appHtml = ''
    try {
      appHtml = render(r.path)
    } catch (err) {
      console.error(`Error rendering path ${r.path}:`, err)
      continue
    }
    
    // Inject HTML & SEO tags into template
    let html = template.replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`)
    
    // Replace title
    html = html.replace(/<title>.*?<\/title>/, `<title>${r.title}</title>`)
    
    // Replace description meta tag
    const descMetaRegex = /<meta name="description" content=".*?" \/>/
    const newDescMeta = `<meta name="description" content="${r.desc}" />`
    if (descMetaRegex.test(html)) {
      html = html.replace(descMetaRegex, newDescMeta)
    } else {
      html = html.replace('</head>', `  ${newDescMeta}\n  </head>`)
    }

    // Replace Open Graph and Twitter title/desc/url tags
    html = html.replace(/<meta property="og:title" content=".*?" \/>/g, `<meta property="og:title" content="${r.title}" />`)
    html = html.replace(/<meta property="og:description" content=".*?" \/>/g, `<meta property="og:description" content="${r.desc}" />`)
    html = html.replace(/<meta property="og:url" content=".*?" \/>/g, `<meta property="og:url" content="https://ugcfreepaper.com${r.path === '/' ? '' : r.path}" />`)
    
    html = html.replace(/<meta property="twitter:title" content=".*?" \/>/g, `<meta property="twitter:title" content="${r.title}" />`)
    html = html.replace(/<meta property="twitter:description" content=".*?" \/>/g, `<meta property="twitter:description" content="${r.desc}" />`)
    html = html.replace(/<meta property="twitter:url" content=".*?" \/>/g, `<meta property="twitter:url" content="https://ugcfreepaper.com${r.path === '/' ? '' : r.path}" />`)

    // Save index.html and .html to file system for direct server resolution
    const routeFolder = r.path === '/' ? '' : r.path
    const destDir = toAbsolute(`dist${routeFolder}`)
    
    if (routeFolder) {
      fs.mkdirSync(destDir, { recursive: true })
      // Write dist/about.html for direct clean-URL server routing
      fs.writeFileSync(toAbsolute(`dist${routeFolder}.html`), html)
    }
    
    // Write dist/about/index.html for directory-based routing
    fs.writeFileSync(path.join(destDir, 'index.html'), html)
  }

  console.log('Prerendering completed successfully!')
}

run()
