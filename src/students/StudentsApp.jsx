import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';
import StudentsGrid from './StudentsGrid.jsx';
import StudentProfile from './StudentProfile.jsx';

// Public student showcase, served at /students (see vercel.json + vite.config).
// Anyone can browse; a student signs in at /community with the email on their
// roster row, and this app then lets them edit their own profile, upload media,
// and submit homework.
const STUDENTS_BASE = '/students';

function SiteHeader({ session }) {
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
          {session ? (
            <button
              className="linklike"
              onClick={() => supabase.auth.signOut()}
              title={`Signed in as ${session.user.email} — sign out`}
            >
              <LogOut size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /> Sign out
            </button>
          ) : (
            <a href="/community" title="Students: sign in to edit your profile" className="nav-hide-sm">
              <LogIn size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /> Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function StudentsApp() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router basename={STUDENTS_BASE}>
      <div className="site-shell">
        <SiteHeader session={session} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<StudentsGrid />} />
            <Route path="/:slug" element={<StudentProfile session={session} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
