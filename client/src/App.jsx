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
import Paper1Notes from './pages/Paper1Notes'
import UnitNotes from './pages/UnitNotes'
import Paper1PYQ from './pages/Paper1PYQ'
import Paper2PYQ from './pages/Paper2PYQ'
import Profile from './pages/Profile'
import ManageSet from './pages/ManageSet'
import AdminNoteEditor from './pages/AdminNoteEditor'
import Support from './pages/Support'
import MockTest from './pages/MockTest'
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
    const canonicalUrl = `https://ugcfreepaper.com${path}`;
    
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
      title = 'UGC Free Paper - Free UGC NET Paper 1 & 2 PYQ Practice & Mock Tests';
      description = 'Practice UGC NET Paper 1 (General Aptitude) and Paper 2 previous year questions (PYQs) and realistic CBT mock tests. Study notes, detailed explanations, completely free.';
    } else if (path === '/paper1') {
      title = 'UGC NET Paper 1 PYQ Practice - UGC Free Paper';
      description = 'Practice UGC NET Paper 1 (General Paper on Teaching & Research Aptitude) previous year questions by year and unit. Free mock tests and answers.';
    } else if (path === '/paper2') {
      title = 'UGC NET Paper 2 PYQ Practice - UGC Free Paper';
      description = 'Practice UGC NET Paper 2 subject-specific previous year questions. Free online CBT mock tests and detailed explanations for your subject.';
    } else if (path === '/paper1-notes') {
      title = 'UGC NET Paper 1 Study Notes - UGC Free Paper';
      description = 'Access free unit-wise study notes, revision guides, and short summaries for UGC NET Paper 1. Boost your preparation with expert resources.';
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
      title = 'UGC NET Prep Blog - UGC Free Paper';
      description = 'Read the latest news, prep strategies, syllabus updates, and tips to crack UGC NET / JRF.';
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
      title = 'Free UGC NET CBT Mock Test - UGC Free Paper';
      description = 'Take a realistic, timed UGC NET Computer Based Test (CBT) mock exam to simulate the real NTA test environment.';
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
    }
  }, [location.pathname]);

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

  return (
    <div className="app">
      {!isFullPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/paper1" element={<Paper1PYQ />} />
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
          <Route path="/mocktest" element={<MockTest />} />
        </Routes>
      </main>
      {!isFullPage && <Footer />}
    </div>
  )
}

export default App
