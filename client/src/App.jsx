import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import About from './pages/About'
import Blog from './pages/Blog'
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
          <Route path="/admin/edit-note/:unitId" element={<AdminNoteEditor />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
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
