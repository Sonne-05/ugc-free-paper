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
    { path: '/', title: 'UGC NET Free Mock Test & Solved PYQs (2020–2025) - UGC Free Paper', desc: 'Free UGC NET mock tests and solved previous year question papers (2020–2025). Practice Paper 1 general aptitude and Paper 2 core subjects on authentic NTA CBT simulator.' },
    { path: '/paper1', title: 'UGC NET Paper 1 Mock Test & Solved PYQs (2020–2025 CBT) Free - UGC Free Paper', desc: 'Attempt free UGC NET Paper 1 mock tests and solved previous year question papers (2020–2025). 100% authentic NTA CBT pattern with detailed academic explanations.' },
    { path: '/paper1-unit-pyq', title: 'UGC NET Paper 1 Unit Wise PYQ Practice & Mock Tests (All 10 Units) - UGC Free Paper', desc: 'Topic-wise UGC NET Paper 1 previous year questions for Teaching Aptitude, Research, ICT, Higher Education, and all 10 syllabus units. 100% free CBT tests.' },
    { path: '/paper2', title: 'UGC NET Paper 2 Previous Year Questions & CBT Mock Tests Free - UGC Free Paper', desc: 'Free UGC NET Paper 2 subject-specific mock tests and full 100-question solved previous year papers for Sociology, Sindhi, and core disciplines.' },
    { path: '/paper1-notes', title: 'UGC NET Paper 1 Notes PDF (All 10 Units) - Free Study Material 2025 - UGC Free Paper', desc: 'Download and read free UGC NET Paper 1 revision notes, concept summaries, and short study guides for all 10 units. High-yield JRF exam preparation.' },
    { path: '/about', title: 'About Us - UGC Free Paper', desc: 'Learn about the mission and the team behind UGC Free Paper. We democratize UGC NET exam preparation resources.' },
    { path: '/blog', title: 'UGC NET 2025 Prep Blog - Syllabus, Cutoffs & Study Strategy - UGC Free Paper', desc: 'Read the latest UGC NET exam syllabus updates, category cutoffs analysis, topic weightage, and high-yield preparation tips to crack JRF.' },
    { path: '/contact', title: 'Contact Us - UGC Free Paper', desc: 'Have questions, suggestions, or feedback? Get in touch with the UGC Free Paper team.' },
    { path: '/support', title: 'Help & Support - UGC Free Paper', desc: 'Get help and support for using UGC Free Paper mock tests, study materials, and account issues.' },
    { path: '/privacy', title: 'Privacy Policy - UGC Free Paper', desc: 'Read the Privacy Policy of UGC Free Paper to understand how we collect, use, and protect your data.' },
    { path: '/terms', title: 'Terms of Service - UGC Free Paper', desc: 'Read the Terms of Service and user agreement for accessing UGC Free Paper mock tests and notes.' },
    { path: '/refund-policy', title: 'Refund Policy - UGC Free Paper', desc: 'Read the Refund Policy for UGC Free Paper mock tests and premium materials.' },
    { path: '/mocktest', title: 'NTA UGC NET CBT Mock Test Free Simulator (2025 Pattern) - UGC Free Paper', desc: 'Take a realistic, timed UGC NET Computer Based Test (CBT) mock exam to simulate the real NTA test environment with official palette and scoring.' },
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

    // Inject accurate per-route canonical URL
    const pageCanonical = `https://ugcfreepaper.com${r.path === '/' ? '/' : r.path}`
    const canonicalRegex = /<link rel="canonical" href=".*?" \/>/
    const newCanonical = `<link rel="canonical" href="${pageCanonical}" />`
    if (canonicalRegex.test(html)) {
      html = html.replace(canonicalRegex, newCanonical)
    } else {
      html = html.replace('</head>', `  ${newCanonical}\n  </head>`)
    }

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

  // 6. Generate dynamic sitemap.xml in dist/ with all routes and questions
  try {
    const sitemapPath = toAbsolute('dist/sitemap.xml');
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const today = new Date().toISOString().split('T')[0];

    // Core and prerendered static/dynamic pages
    routes.forEach(r => {
      if (r.path === '/404') return;
      const isCore = ['/', '/paper1', '/paper1-unit-pyq', '/paper2', '/paper1-notes'].includes(r.path);
      xml += '  <url>\n';
      xml += `    <loc>https://ugcfreepaper.com${r.path === '/' ? '' : r.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${isCore ? 'daily' : 'weekly'}</changefreq>\n`;
      xml += `    <priority>${r.path === '/' ? '1.0' : (isCore ? '0.9' : '0.75')}</priority>\n`;
      xml += '  </url>\n';
    });

    // Fetch dynamic questions from backend
    try {
      const qRes = await fetch(`${API_BASE_URL}/api/questions/sitemap-ids`);
      if (qRes.ok) {
        const qList = await qRes.json();
        qList.forEach(q => {
          const lastmod = q.updatedAt ? new Date(q.updatedAt).toISOString().split('T')[0] : today;
          xml += '  <url>\n';
          xml += `    <loc>https://ugcfreepaper.com/question/${q._id || q.id}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += '    <changefreq>monthly</changefreq>\n';
          xml += '    <priority>0.75</priority>\n';
          xml += '  </url>\n';
        });
        console.log(`Generated sitemap with ${qList.length} question pages!`);
      }
    } catch (qErr) {
      console.warn('Could not fetch questions list for static sitemap:', qErr.message);
    }

    xml += '</urlset>';
    fs.writeFileSync(sitemapPath, xml);
    console.log('Saved updated dist/sitemap.xml successfully!');
  } catch (smErr) {
    console.warn('Could not generate dist/sitemap.xml:', smErr.message);
  }

  console.log('Prerendering completed successfully!')
}

run()
