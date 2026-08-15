import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Target, Backpack, ChevronDown, ListChecks, Sparkles, Activity, Check, PartyPopper, Linkedin, TrendingUp, Users } from 'lucide-react';
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

// ── Published quizzes, listed at the bottom of the page ─────────────────────
function QuizzesSection() {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    supabase
      .from('quizzes')
      .select('id, quiz_number, title, params, questions, published_at')
      .eq('status', 'published')
      .order('quiz_number', { ascending: true })
      .then(({ data }) => setQuizzes(data || []));
  }, []);

  return (
    <div className="max-w-3xl mx-auto w-full pb-16">
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <ListChecks size={16} /> Quizzes
        </p>
        <p className="text-sm text-[#5C5C5C]">Test yourself on the AI topics of the moment. Pick your name, and your scores are saved.</p>
      </div>
      {quizzes.length === 0 ? (
        <p className="text-center text-sm text-[#1A1A1A]/40 italic">No quizzes published yet.</p>
      ) : (
        <div className="space-y-3">
          {quizzes.map((qz) => {
            const p = qz.params || {};
            const n = (qz.questions || []).length;
            return (
              <Link key={qz.id} to={`/quiz/${qz.id}`}
                className="glass-panel !p-5 flex items-center justify-between gap-4 hover:border-[#3E9E28]/50 hover:-translate-y-0.5 transition-all">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#0F7B3F] rounded-full px-2.5 py-0.5">
                    Quiz #{qz.quiz_number}
                  </span>
                  <h3 className="text-base mt-1.5 truncate">{qz.title}</h3>
                  <p className="text-xs text-[#5C5C5C] mt-0.5">
                    {n} questions · {p.timed
                      ? (p.allow_back ? `${Math.round((p.time_per_question * n) / 60)} min total` : `${p.time_per_question}s per question`)
                      : 'untimed'}
                    {p.allow_back ? ' · free navigation' : ''}
                  </p>
                </div>
                <span className="btn !py-2 !px-4 !text-sm shrink-0">Take the quiz →</span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="text-center mt-6">
        <Link to="/quiz-builder" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1A]/40 hover:text-[#3E9E28] transition-colors">
          <Sparkles size={13} /> Build a new quiz
        </Link>
      </p>
    </div>
  );
}

// ── Live quiz session dashboard ─────────────────────────────────────────────
// Polls quiz_progress every few seconds so the instructor can watch a quiz
// session unfold: who is still busy (and on which question), who has finished
// (with their score), and who hasn't started. Activity older than the session
// window is ignored, so the dashboard goes quiet between sessions.
// ── LinkedIn connections across the cohort ──────────────────────────────────
// One small sparkline per student (weeks 1–8, each on its own scale so a
// 30-connection climb reads as clearly as a 6,000 one) plus cohort totals.
// Counts are self-reported on each profile; the section re-draws itself as
// students log new weeks. Students without a LinkedIn on file are left out.
const LI_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

function ConnectionSparkline({ points, name }) {
  const W = 220, H = 64, padX = 6, padT = 8, padB = 8;
  const rec = points.filter((p) => p.connections != null);
  if (rec.length === 0) return null;
  const vals = rec.map((p) => p.connections);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, Math.max(4, Math.round(hi * 0.04)));
  const yMin = Math.max(0, lo - span * 0.15), yMax = hi + span * 0.15;
  const xFor = (w) => padX + ((w - 1) / 7) * (W - padX * 2);
  const yFor = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const d = rec.map((p, i) => `${i ? 'L' : 'M'} ${xFor(p.week).toFixed(1)} ${yFor(p.connections).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${name}: LinkedIn connections by week`}
      style={{ display: 'block', height: 'auto' }}>
      {/* recessive week ticks along the baseline */}
      {LI_WEEKS.map((w) => (
        <line key={w} x1={xFor(w)} y1={H - padB + 2} x2={xFor(w)} y2={H - padB + 5} stroke="#E3E3DF" strokeWidth="1" />
      ))}
      {rec.length > 1 && <path d={d} fill="none" stroke="#0F7B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {rec.map((p) => (
        <circle key={p.week} cx={xFor(p.week)} cy={yFor(p.connections)} r="4" fill="#0F7B3F" stroke="#FFFFFF" strokeWidth="2">
          <title>{`Week ${p.week} · ${p.connections.toLocaleString()} connections`}</title>
        </circle>
      ))}
    </svg>
  );
}

function LinkedInTrajectorySection({ students }) {
  const [stats, setStats] = useState(null);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: st }, { data: pr }] = await Promise.all([
        supabase.from('student_linkedin_stats').select('student_id, week, connections'),
        supabase.from('students').select('id, linkedin_url'),
      ]);
      if (cancelled) return;
      setStats(st || []);
      setProfiles(pr || []);
    };
    load();
    // Re-pull every minute so the trajectories keep growing as students log weeks.
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (stats === null) return null;

  const withLinkedIn = new Set(profiles.filter((p) => p.linkedin_url).map((p) => p.id));
  const rows = students
    .filter((s) => withLinkedIn.has(s.id))
    .map((s) => {
      const byWeek = new Map(stats.filter((x) => x.student_id === s.id).map((x) => [x.week, x.connections]));
      const points = LI_WEEKS.map((w) => ({ week: w, connections: byWeek.has(w) ? byWeek.get(w) : null }));
      const rec = points.filter((p) => p.connections != null);
      const first = rec[0]?.connections ?? null;
      const last = rec[rec.length - 1] ?? null;
      return {
        ...s, points, recorded: rec.length,
        firstWeek: rec[0]?.week ?? null, latest: last?.connections ?? null, latestWeek: last?.week ?? null,
        growth: rec.length > 1 ? last.connections - first : null,
      };
    })
    // Most connections first; students who haven't logged yet sink to the end.
    .sort((a, b) => (b.latest ?? -1) - (a.latest ?? -1));

  if (rows.length === 0) return null;

  const logging = rows.filter((r) => r.latest != null);
  const total = logging.reduce((a, r) => a + r.latest, 0);
  const gained = logging.reduce((a, r) => a + (r.growth || 0), 0);
  const firstName = (n) => (n || '').split(' ')[0];

  return (
    <div className="mb-14">
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#0A66C2] mb-2 flex items-center justify-center gap-2">
          <Linkedin size={16} /> LinkedIn Growth
        </p>
        <h2 className="text-2xl sm:text-3xl uppercase">Connections, week by week</h2>
        <p className="text-[#5C5C5C] mt-2 max-w-xl mx-auto text-sm">
          Every student logs their connection count each week on their profile. Each line is one student's
          trajectory across the eight weeks — the whole cohort's climb, at a glance.
        </p>
      </div>

      {/* Cohort headline tiles */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {[
          { icon: <Users size={12} />, label: 'Cohort connections', value: total.toLocaleString(), accent: '#0F7B3F' },
          { icon: <TrendingUp size={12} />, label: 'Gained this cohort', value: `${gained >= 0 ? '+' : ''}${gained.toLocaleString()}`, accent: '#3E9E28' },
          { icon: <Linkedin size={12} />, label: 'Students logging', value: `${logging.length} / ${rows.length}`, accent: '#0A66C2' },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-[#E3E3DF] bg-white px-5 py-3 min-w-[150px]">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
              {t.icon} {t.label}
            </div>
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: t.accent, fontFamily: 'Poppins, sans-serif' }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>

      {/* Small multiples: one sparkline per student */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Link key={r.id} to={`/${r.slug}`}
            className="glass-panel !p-4 hover:-translate-y-0.5 hover:border-[#3E9E28]/50 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#F4F4F2] border-2 border-[#3E9E28]/30 overflow-hidden flex items-center justify-center text-sm font-bold text-[#3E9E28] shrink-0">
                {r.avatar_url
                  ? <img src={r.avatar_url} alt={r.full_name} className="w-full h-full object-cover" />
                  : (r.full_name?.[0]?.toUpperCase() || '?')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{r.full_name}</p>
                <p className="text-[11px] text-[#1A1A1A]/40 uppercase tracking-wider">
                  {r.latest != null ? `Week ${r.latestWeek}` : 'Not logged yet'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold tabular-nums leading-none" style={{ color: '#0F7B3F', fontFamily: 'Poppins, sans-serif' }}>
                  {r.latest != null ? r.latest.toLocaleString() : '—'}
                </p>
                {r.growth != null && (
                  <p className={`text-[11px] font-semibold tabular-nums mt-0.5 ${r.growth >= 0 ? 'text-[#3E9E28]' : 'text-red-600'}`}>
                    {r.growth >= 0 ? '+' : ''}{r.growth.toLocaleString()} since W{r.firstWeek}
                  </p>
                )}
              </div>
            </div>
            {r.recorded > 0 ? (
              <ConnectionSparkline points={r.points} name={firstName(r.full_name)} />
            ) : (
              <div className="h-16 rounded-lg border border-dashed border-[#E3E3DF] flex items-center justify-center text-xs text-[#1A1A1A]/35">
                No weeks logged yet
              </div>
            )}
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-[#1A1A1A]/35 mt-1">
              <span>W1</span><span>W8</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const SESSION_WINDOW_MS = 3 * 60 * 60 * 1000;
const POLL_MS = 5000;

function timeAgo(iso, now) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function QuizLiveDashboard({ students }) {
  const [rows, setRows] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const quizRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      const since = new Date(Date.now() - SESSION_WINDOW_MS).toISOString();
      const { data } = await supabase
        .from('quiz_progress')
        .select('quiz_id, student_name, status, current_question, answered, total, score, started_at, updated_at')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false });
      if (!alive) return;
      const all = data || [];
      // The active session = the quiz with the most recent activity.
      const quizId = all[0]?.quiz_id || null;
      setRows(all.filter((r) => r.quiz_id === quizId));
      setNow(Date.now());
      if (!quizId) {
        quizRef.current = null;
        setQuiz(null);
      } else if (quizRef.current?.id !== quizId) {
        const { data: q } = await supabase
          .from('quizzes').select('id, quiz_number, title').eq('id', quizId).maybeSingle();
        if (!alive) return;
        quizRef.current = q;
        setQuiz(q);
      }
    };
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const taking = rows.filter((r) => r.status === 'taking').sort((a, b) => a.student_name.localeCompare(b.student_name));
  const done = rows.filter((r) => r.status === 'completed')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.student_name.localeCompare(b.student_name));
  const activeNames = new Set(rows.map((r) => r.student_name));
  const notStarted = (students || []).map((s) => s.full_name).filter((n) => !activeNames.has(n));

  return (
    <div className="max-w-3xl mx-auto w-full pb-16">
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <Activity size={16} /> Live Quiz Session
        </p>
        {rows.length > 0 && quiz && (
          <p className="text-sm text-[#5C5C5C]">
            Quiz #{quiz.quiz_number} — {quiz.title} · {taking.length} in progress · {done.length} completed
            {notStarted.length > 0 && ` · ${notStarted.length} not started`}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-[#1A1A1A]/40 italic">
          No active quiz session right now — this dashboard lights up while a quiz is being taken.
        </p>
      ) : (
        <div className="space-y-4">
          {taking.length === 0 && (
            <div className="rounded-xl border border-[#3E9E28]/40 bg-[#3E9E28]/10 text-[#0F7B3F] text-sm font-semibold px-4 py-3 flex items-center gap-2">
              <PartyPopper size={16} className="shrink-0" />
              {notStarted.length === 0
                ? 'Everyone has finished the quiz!'
                : `No one is mid-quiz — all ${done.length} active student${done.length === 1 ? '' : 's'} have finished.`}
            </div>
          )}

          {taking.length > 0 && (
            <div className="glass-panel">
              <h3 className="text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="relative flex w-2.5 h-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3E9E28] opacity-60" />
                  <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-[#3E9E28]" />
                </span>
                Still busy ({taking.length})
              </h3>
              <div className="space-y-3">
                {taking.map((r) => {
                  const idleMs = now - new Date(r.updated_at).getTime();
                  return (
                    <div key={r.student_name}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold truncate">{r.student_name}</span>
                        <span className="text-xs text-[#5C5C5C] tabular-nums shrink-0">
                          Q{Math.min(r.current_question + 1, r.total)} of {r.total} · {r.answered} answered ·{' '}
                          <span className={idleMs > 120000 ? 'text-amber-600 font-semibold' : ''}>{timeAgo(r.updated_at, now)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1A1A1A]/10 overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-[#3E9E28] transition-[width] duration-500"
                          style={{ width: `${Math.min(100, ((r.current_question + 1) / Math.max(1, r.total)) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="glass-panel">
              <h3 className="text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Check size={15} className="text-[#0F7B3F]" /> Completed ({done.length})
              </h3>
              <div className="space-y-2">
                {done.map((r) => (
                  <div key={r.student_name} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold truncate">{r.student_name}</span>
                    <span className="text-xs text-[#5C5C5C] tabular-nums shrink-0">
                      <span className="font-bold text-[#0F7B3F]">{r.score}/{r.total}</span>
                      {' '}· {Math.round(((r.score ?? 0) / Math.max(1, r.total)) * 100)}% · finished {timeAgo(r.updated_at, now)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notStarted.length > 0 && (
            <p className="text-xs text-[#5C5C5C] text-center">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-[#1A1A1A]/40 mr-1.5">Not started</span>
              {notStarted.join(' · ')}
            </p>
          )}
        </div>
      )}
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

        <LinkedInTrajectorySection students={students} />

        <CurriculumSection />

        <QuizzesSection />

        <QuizLiveDashboard students={students} />
      </div>
    </div>
  );
}
