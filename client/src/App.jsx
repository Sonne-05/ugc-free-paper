import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import About from './pages/About'
import Blog from './pages/Blog'
import BlogPostDetail from './pages/BlogPostDetail'
import Contact from './pages/Contact'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'
import RefundPolicy from './pages/RefundPolicy'
import Paper1Notes from './pages/Paper1Notes'
import UnitNotes from './pages/UnitNotes'
import Paper1PYQ from './pages/Paper1PYQ'
import Paper2PYQ from './pages/Paper2PYQ'
import Paper1UnitPYQ from './pages/Paper1UnitPYQ'
import Profile from './pages/Profile'
import ManageSet from './pages/ManageSet'
import AdminNoteEditor from './pages/AdminNoteEditor'
import Support from './pages/Support'
import MockTest from './pages/MockTest'
import NotFound from './pages/NotFound'
import { API_BASE_URL } from './services/api'
import './App.css'

function App() {
  const location = useLocation()
  const isFullPage = location.pathname === '/signin' || location.pathname === '/signup' || location.pathname === '/mocktest' || location.pathname.startsWith('/admin/edit-note')

  useEffect(() => {
    // Dynamic Canonical URL setup
    let path = location.pathname;
    // Strip trailing slash if it exists and path is not root '/'
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Preserve allowed indexed query parameters (e.g. ?subject=Sociology on /paper2)
    let search = '';
    if (path === '/paper2' && location.search.includes('subject=')) {
      const searchParams = new URLSearchParams(location.search);
      const subjectParam = searchParams.get('subject');
      if (subjectParam) {
        search = `?subject=${encodeURIComponent(subjectParam)}`;
      }
    }

    const canonicalUrl = `https://ugcfreepaper.com${path}${search}`;
    
    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);

    // Dynamic Title & Meta Description setup based on path
    let title = 'UGC Free Paper - Crack JRF';
    let description = 'Free online preparation platform for UGC NET. Practice Paper 1 (General Aptitude) and Paper 2 previous year questions (PYQs) and realistic CBT mock tests.';

    // Matches for static paths
    if (path === '/') {
      title = 'UGC NET Free Mock Test & Solved PYQs (2020–2025) - UGC Free Paper';
      description = 'Free UGC NET mock tests and solved previous year question papers (2020–2025). Practice Paper 1 general aptitude and Paper 2 core subjects on authentic NTA CBT simulator.';
    } else if (path === '/paper1') {
      title = 'UGC NET Paper 1 Mock Test & Solved PYQs (2020–2025 CBT) Free - UGC Free Paper';
      description = 'Attempt free UGC NET Paper 1 mock tests and solved previous year question papers (2020–2025). 100% authentic NTA CBT pattern with detailed academic explanations.';
    } else if (path === '/paper1-unit-pyq') {
      title = 'UGC NET Paper 1 Unit Wise PYQ Practice & Mock Tests (All 10 Units) - UGC Free Paper';
      description = 'Topic-wise UGC NET Paper 1 previous year questions for Teaching Aptitude, Research, ICT, Higher Education, and all 10 syllabus units. 100% free CBT tests.';
    } else if (path === '/paper2') {
      const searchParams = new URLSearchParams(location.search);
      const subjectParam = searchParams.get('subject');
      if (subjectParam) {
        title = `UGC NET ${subjectParam} Paper 2 PYQ & CBT Mock Tests Free (2020–2025) - UGC Free Paper`;
        description = `Practice free UGC NET ${subjectParam} Paper 2 previous year questions (PYQs) and realistic CBT mock tests. Solved question papers with detailed academic solutions.`;
      } else {
        title = 'UGC NET Paper 2 Previous Year Questions & CBT Mock Tests Free - UGC Free Paper';
        description = 'Free UGC NET Paper 2 subject-specific mock tests and full 100-question solved previous year papers for Sociology, Sindhi, and core disciplines.';
      }
    } else if (path === '/paper1-notes') {
      title = 'UGC NET Paper 1 Notes PDF (All 10 Units) - Free Study Material 2025 - UGC Free Paper';
      description = 'Download and read free UGC NET Paper 1 revision notes, concept summaries, and short study guides for all 10 units. High-yield JRF exam preparation.';
    } else if (path === '/signin') {
      title = 'Sign In - UGC Free Paper';
      description = 'Log in to your UGC Free Paper account to track your mock test progress and study history.';
    } else if (path === '/signup') {
      title = 'Register - UGC Free Paper';
      description = 'Create a free account on UGC Free Paper to practice PYQs, take mock tests, and save notes.';
    } else if (path === '/about') {
      title = 'About Us - UGC Free Paper';
      description = 'Learn about the mission and the team behind UGC Free Paper. We democratize UGC NET exam preparation resources.';
    } else if (path === '/blog') {
      title = 'UGC NET 2025 Prep Blog - Syllabus, Cutoffs & Study Strategy - UGC Free Paper';
      description = 'Read the latest UGC NET exam syllabus updates, category cutoffs analysis, topic weightage, and high-yield preparation tips to crack JRF.';
    } else if (path === '/contact') {
      title = 'Contact Us - UGC Free Paper';
      description = 'Have questions, suggestions, or feedback? Get in touch with the UGC Free Paper team.';
    } else if (path === '/support') {
      title = 'Help & Support - UGC Free Paper';
      description = 'Get help and support for using UGC Free Paper mock tests, study materials, and account issues.';
    } else if (path === '/privacy') {
      title = 'Privacy Policy - UGC Free Paper';
      description = 'Read the Privacy Policy of UGC Free Paper to understand how we collect, use, and protect your data.';
    } else if (path === '/terms') {
      title = 'Terms of Service - UGC Free Paper';
      description = 'Read the Terms of Service and user agreement for accessing UGC Free Paper mock tests and notes.';
    } else if (path === '/mocktest') {
      title = 'NTA UGC NET CBT Mock Test Free Simulator (2025 Pattern) - UGC Free Paper';
      description = 'Take a realistic, timed UGC NET Computer Based Test (CBT) mock exam to simulate the real NTA test environment with official palette and scoring.';
    } else if (path === '/profile') {
      title = 'Student Dashboard - UGC Free Paper';
      description = 'View your UGC NET practice progress, mock test scores, and performance analytics.';
    } else if (path === '/admin') {
      title = 'Admin Console - UGC Free Paper';
      description = 'Manage mock test sets, study notes, questions, and users for the UGC Free Paper platform.';
    }

    // Set title if it is not a dynamic route (dynamic routes set title in their own components)
    const isDynamicRoute = path.startsWith('/blog/') || path.startsWith('/paper1-notes/') || path.startsWith('/admin/manage-set') || path.startsWith('/admin/edit-note');
    if (!isDynamicRoute) {
      document.title = title;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);

      // Manage robots meta tag: de-index policy pages from sitelinks while allowing crawlers
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (['/privacy', '/terms', '/refund-policy'].includes(path)) {
        if (!metaRobots) {
          metaRobots = document.createElement('meta');
          metaRobots.setAttribute('name', 'robots');
          document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, follow');
      } else if (metaRobots) {
        metaRobots.setAttribute('content', 'index, follow');
      }
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      if (!window.gtag) {
        const scriptId = 'google-analytics';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
          script.id = scriptId;
          document.head.appendChild(script);

          window.dataLayer = window.dataLayer || [];
          window.gtag = function () {
            window.dataLayer.push(arguments);
          };
          window.gtag('js', new Date());
          window.gtag('config', gaId);
        }
      } else {
        window.gtag('config', gaId, {
          page_path: location.pathname
        });
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search]);

  return (
    <div className="app">
      {!isFullPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/paper1" element={<Paper1PYQ />} />
          <Route path="/paper1-unit-pyq" element={<Paper1UnitPYQ />} />
          <Route path="/paper2" element={<Paper2PYQ />} />
          <Route path="/paper1-notes" element={<Paper1Notes />} />
          <Route path="/paper1-notes/:unitId" element={<UnitNotes />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Profile />} />
          <Route path="/admin/manage-set/:setId" element={<ManageSet />} />
          <Route path="/admin/manage-set" element={<ManageSet />} />
          <Route path="/admin/edit-note/:unitId" element={<AdminNoteEditor />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPostDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/mocktest" element={<MockTest />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isFullPage && !location.pathname.startsWith('/admin') && <Footer />}
    </div>
  )
}

export default App
