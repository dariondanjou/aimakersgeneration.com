import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LogIn, BookOpen, Menu, X } from 'lucide-react';
import useSession from '../students/useSession';
import GlossarySidebar from './GlossarySidebar.jsx';
import GlossaryHome from './GlossaryHome.jsx';
import TermPage from './TermPage.jsx';
import './terminology.css';
import '../shell/aimg-nav.js'; // the shared site nav: <aimg-nav>

// The terminology glossaries, served at /terminology (see vercel.json +
// vite.config). Open to any signed-in member (not just cohort students) —
// a lightweight logged-in gate, not the cohort-member gate used by /students.
const BASE = '/terminology';

const signInHref = () => `/community?next=${encodeURIComponent(location.pathname + location.search)}`;

function LoggedInGate({ children }) {
  const session = useSession();

  if (session === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="glass-panel max-w-md w-full text-center !p-8">
          <div className="w-12 h-12 rounded-full bg-[#3E9E28]/10 text-[#3E9E28] flex items-center justify-center mx-auto mb-4">
            <BookOpen size={22} />
          </div>
          <h1 className="text-xl uppercase mb-2">Members only</h1>
          <p className="text-sm text-[#5C5C5C] mb-6">
            The terminology glossary is for signed-in members. Log in to look up the language of traditional and AI filmmaking.
          </p>
          <a href={signInHref()} className="btn btn-primary inline-flex items-center gap-2">
            <LogIn size={16} /> Log in
          </a>
        </div>
      </div>
    );
  }
  return children;
}

function Glossary() {
  const [open, setOpen] = useState(false); // mobile term-list drawer
  return (
    <div className="glossary">
      <button type="button" className="gl-mobile-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? <X size={16} /> : <Menu size={16} />} {open ? 'Close terms' : 'Browse terms'}
      </button>
      <div className={`glossary-side-wrap${open ? ' is-open' : ''}`}>
        <GlossarySidebar onPick={() => setOpen(false)} />
      </div>
      <div className="glossary-main custom-scrollbar">
        <Routes>
          <Route path="/" element={<GlossaryHome />} />
          <Route path="/:slug" element={<TermPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function TerminologyApp() {
  return (
    <Router basename={BASE}>
      <div className="site-shell">
        <aimg-nav active="terminology" live-auth=""></aimg-nav>
        <main className="main-content">
          <LoggedInGate>
            <Glossary />
          </LoggedInGate>
        </main>
      </div>
    </Router>
  );
}
