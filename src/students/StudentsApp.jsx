import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import StudentsGrid from './StudentsGrid.jsx';
import StudentProfile from './StudentProfile.jsx';

// Public student showcase, served at /students (see vercel.json + vite.config).
// Deliberately auth-free: anyone who visits can browse AND edit profiles —
// there is no sign-in anywhere on this page (per the program's choice; the
// database still protects email/user_id/slug and homework deadlines).
const STUDENTS_BASE = '/students';

function SiteHeader() {
  return (
    <header className="site-nav">
      <div className="site-nav-in">
        <a className="site-mark" href="/" title="aimakersgeneration.com">
          <img src="/brand/aimg-mark-256.png" width="256" height="254" alt="" />
          AIMG
        </a>
        <nav className="site-nav-links">
          <a href="/" className="nav-hide-sm">Home</a>
          <Link to="/" className="community-tab active" style={{ color: 'var(--green-deep)', fontWeight: 700 }}>Students</Link>
          <a href="/community" className="nav-hide-sm">Community</a>
          <a href="/apply" className="site-cta">Apply to the Cohort</a>
        </nav>
      </div>
    </header>
  );
}

export default function StudentsApp() {
  return (
    <Router basename={STUDENTS_BASE}>
      <div className="site-shell">
        <SiteHeader />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<StudentsGrid />} />
            <Route path="/:slug" element={<StudentProfile />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
