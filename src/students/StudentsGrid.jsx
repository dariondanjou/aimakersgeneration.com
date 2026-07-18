import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Target, Backpack, ChevronDown, Calculator } from 'lucide-react';
import { supabase } from '../supabaseClient';

const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// Public read-only curriculum outline (objective / covered / homework per
// session — the sanitized view served by /api/curriculum?public=1).
function CurriculumSection() {
  const [weeks, setWeeks] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch('/api/curriculum?public=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setWeeks(data?.weeks || []))
      .catch(() => setWeeks([]));
  }, []);

  if (!weeks || weeks.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto w-full pb-16">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <BookOpen size={16} /> The Curriculum
        </p>
        <h2 className="text-2xl sm:text-3xl uppercase">Eight Sessions</h2>
        <p className="text-[#5C5C5C] mt-3 max-w-xl mx-auto text-sm">
          Saturdays 1:00–4:00 PM ET at RICE, Atlanta. Tap a week to see what we cover.
        </p>
      </div>
      <div className="space-y-3">
        {weeks.map((w) => {
          const isOpen = open === w.week;
          return (
            <div key={w.week} className="glass-panel !p-0 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : w.week)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#3E9E28]/5 transition-colors"
              >
                <span className="text-xs font-bold text-[#0F7B3F] tabular-nums shrink-0 w-24">
                  Wk {w.week} · {fmtDate(w.session_date)}
                </span>
                <span className="flex-1 font-semibold text-sm sm:text-base">{w.title}</span>
                <ChevronDown size={16} className={`shrink-0 text-[#1A1A1A]/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 space-y-4">
                  {w.objective && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 flex items-center gap-1.5">
                        <Target size={12} className="text-[#3E9E28]" /> Objective
                      </p>
                      <p className="text-sm text-[#1A1A1A]/85 leading-relaxed">{w.objective}</p>
                    </div>
                  )}
                  {w.covered.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 flex items-center gap-1.5">
                        <BookOpen size={12} className="text-[#3E9E28]" /> What gets covered
                      </p>
                      <ul className="space-y-1.5">
                        {w.covered.map((t, i) => (
                          <li key={i} className="text-sm text-[#1A1A1A]/85 leading-relaxed flex gap-2">
                            <span className="text-[#3E9E28] font-bold shrink-0">—</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {w.homework.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 flex items-center gap-1.5">
                        <Backpack size={12} className="text-[#3E9E28]" /> Homework
                      </p>
                      <ul className="space-y-1.5">
                        {w.homework.map((t, i) => (
                          <li key={i} className="text-sm text-[#1A1A1A]/85 leading-relaxed flex gap-2">
                            <span className="text-[#3E9E28] font-bold shrink-0">—</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// A really simple four-function calculator.
function CalculatorSection() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState(null);      // pending left operand
  const [op, setOp] = useState(null);        // pending operator
  const [fresh, setFresh] = useState(true);  // next digit starts a new number

  const apply = (a, b, o) => {
    if (o === '+') return a + b;
    if (o === '−') return a - b;
    if (o === '×') return a * b;
    if (o === '÷') return b === 0 ? NaN : a / b;
    return b;
  };
  const show = (n) => {
    if (!Number.isFinite(n)) return 'Error';
    const s = String(Math.round(n * 1e10) / 1e10);
    return s.length > 12 ? n.toExponential(6) : s;
  };

  const digit = (d) => {
    if (fresh) { setDisplay(d === '.' ? '0.' : d); setFresh(false); return; }
    if (d === '.' && display.includes('.')) return;
    setDisplay(display.length < 12 ? display + d : display);
  };
  const operator = (o) => {
    const cur = parseFloat(display);
    if (op != null && acc != null && !fresh) {
      const r = apply(acc, cur, op);
      setAcc(r); setDisplay(show(r));
    } else {
      setAcc(cur);
    }
    setOp(o); setFresh(true);
  };
  const equals = () => {
    if (op == null || acc == null) return;
    const r = apply(acc, parseFloat(display), op);
    setDisplay(show(r)); setAcc(null); setOp(null); setFresh(true);
  };
  const clear = () => { setDisplay('0'); setAcc(null); setOp(null); setFresh(true); };

  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', 'C', '+'];
  const press = (k) => {
    if (k === 'C') return clear();
    if ('+−×÷'.includes(k)) return operator(k);
    digit(k);
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-16">
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <Calculator size={16} /> Calculator
        </p>
      </div>
      <div className="glass-panel !p-5 max-w-[280px] mx-auto">
        <div className="bg-[#F4F4F2] border border-[#E3E3DF] rounded-xl px-4 py-3 mb-3 text-right text-2xl font-extrabold tabular-nums overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ fontFamily: 'Poppins, sans-serif' }}>
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className={`rounded-xl py-2.5 text-lg font-bold transition-colors border ${
                'C+−×÷'.includes(k)
                  ? 'bg-white text-[#0F7B3F] border-[#E3E3DF] hover:border-[#3E9E28]'
                  : 'bg-white text-[#1A1A1A] border-[#E3E3DF] hover:border-[#3E9E28]'
              } ${op === k && acc != null ? '!bg-[#3E9E28]/10 !border-[#3E9E28]' : ''}`}
            >
              {k}
            </button>
          ))}
          <button
            onClick={equals}
            className="col-span-4 rounded-xl py-2.5 text-lg font-bold bg-[#0F7B3F] text-white border border-[#0F7B3F] hover:bg-[#3E9E28] transition-colors"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsGrid() {
  const [students, setStudents] = useState(null);

  useEffect(() => {
    supabase
      .from('students')
      .select('id, slug, full_name, headline, goal, avatar_url, city')
      .order('sort_order', { ascending: true })
      .order('full_name', { ascending: true })
      .then(({ data }) => setStudents(data || []));
  }, []);

  if (students === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-center mb-10 mt-4">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
            <GraduationCap size={16} /> Summer 2026 Cohort
          </p>
          <h1 className="text-3xl sm:text-4xl uppercase">Meet the Students</h1>
          <p className="text-[#5C5C5C] mt-3 max-w-xl mx-auto">
            Eight Saturdays, Life Changing.
          </p>
        </div>

        {students.length === 0 ? (
          <p className="text-center text-[#5C5C5C] italic">The cohort roster is coming soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pb-10">
            {students.map((s) => (
              <Link
                key={s.id}
                to={`/${s.slug}`}
                className="glass-panel flex flex-col items-center text-center !p-6 hover:-translate-y-1 hover:shadow-lg hover:border-[#3E9E28]/50 transition-all"
              >
                <div className="w-24 h-24 rounded-full bg-[#F4F4F2] border-4 border-[#3E9E28]/30 overflow-hidden flex items-center justify-center text-3xl font-bold text-[#3E9E28] mb-4">
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                    : (s.full_name?.[0]?.toUpperCase() || '?')}
                </div>
                <h2 className="text-lg">{s.full_name}</h2>
                <p className="text-sm text-[#3E9E28] font-semibold mt-1">
                  {s.headline || 'AI Maker — Summer 2026 Cohort'}
                </p>
                {s.city && <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{s.city}</p>}
                {s.goal && (
                  <p className="text-sm text-[#5C5C5C] mt-3 line-clamp-3">{s.goal}</p>
                )}
                <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/40">
                  View profile →
                </span>
              </Link>
            ))}
          </div>
        )}

        <CurriculumSection />

        <CalculatorSection />
      </div>
    </div>
  );
}
