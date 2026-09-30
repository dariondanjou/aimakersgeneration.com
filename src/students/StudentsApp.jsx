import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentsGrid from './StudentsGrid.jsx';
import StudentProfile from './StudentProfile.jsx';
import QuizBuilder from './QuizBuilder.jsx';
import QuizTake from './QuizTake.jsx';
import Deck from '../Deck.jsx';
import '../shell/aimg-nav.js'; // the shared site nav: <aimg-nav>

// Public student showcase, served at /students (see vercel.json + vite.config).
// Deliberately auth-free: anyone who visits can browse AND edit profiles —
// there is no sign-in anywhere on this page (per the program's choice; the
// database still protects email/user_id/slug and homework deadlines).
const STUDENTS_BASE = '/students';

export default function StudentsApp() {
  return (
    <Router basename={STUDENTS_BASE}>
      <div className="site-shell">
        <aimg-nav active="students" live-auth=""></aimg-nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<StudentsGrid />} />
            <Route path="/quiz-builder" element={<QuizBuilder />} />
            <Route path="/quiz/:id" element={<QuizTake />} />
            {/* Read-only session slide decks — every week, past and upcoming */}
            <Route path="/deck/:week" element={<Deck publicView />} />
            <Route path="/:slug" element={<StudentProfile />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
