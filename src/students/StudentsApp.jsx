import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentsGrid from './StudentsGrid.jsx';
import StudentProfile from './StudentProfile.jsx';
import QuizBuilder from './QuizBuilder.jsx';
import QuizTake from './QuizTake.jsx';
import Deck from '../Deck.jsx';
import MembersGate from './MembersGate.jsx';
import '../shell/aimg-nav.js'; // the shared site nav: <aimg-nav>

// The cohort student showcase, served at /students (see vercel.json + vite.config).
// Members only: signed-in cohort students and admins (MembersGate, enforced in
// the database by public.is_cohort_member()). Students edit only their own profile.
const STUDENTS_BASE = '/students';

export default function StudentsApp() {
  return (
    <Router basename={STUDENTS_BASE}>
      <div className="site-shell">
        <aimg-nav active="students" live-auth=""></aimg-nav>
        <main className="main-content">
          <MembersGate>
          <Routes>
            <Route path="/" element={<StudentsGrid />} />
            <Route path="/quiz-builder" element={<QuizBuilder />} />
            <Route path="/quiz/:id" element={<QuizTake />} />
            {/* Read-only session slide decks — every week, past and upcoming */}
            <Route path="/deck/:week" element={<Deck publicView />} />
            <Route path="/:slug" element={<StudentProfile />} />
          </Routes>
          </MembersGate>
        </main>
      </div>
    </Router>
  );
}
