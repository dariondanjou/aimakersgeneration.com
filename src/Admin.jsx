import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, CheckCircle2, GraduationCap, KeyRound, Presentation, BookOpen } from 'lucide-react';

// Cohort admin: the full roster (every application + every students row),
// served by /api/admin-roster, which allows only the user IDs in the
// ADMIN_USER_IDS env var. Names link to the student's public profile page.
const STATUS_STYLES = {
  paid: 'text-[#0F7B3F] bg-[#3E9E28]/10 border-[#3E9E28]/25',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  canceled: 'text-[#1A1A1A]/50 bg-[#1A1A1A]/5 border-[#1A1A1A]/15',
  refunded: 'text-red-700 bg-red-50 border-red-200',
  'roster-only': 'text-[#5C5C5C] bg-white border-[#E3E3DF]',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// Anyone with the shared admin password gets in (checked server-side against
// the ADMIN_KEY env var); allowlisted signed-in admins skip the prompt. The
// accepted password is kept in localStorage so refreshes and new tabs
// (e.g. decks opening in their own tab) don't re-ask.
const KEY_STORAGE = 'aimg-admin-key';

export default function Admin({ session }) {
  const [roster, setRoster] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (adminKey) => {
    try {
      const headers = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      if (adminKey) headers['x-admin-key'] = adminKey;
      const res = await fetch('/api/admin-roster', { headers });
      const data = await res.json();
      if (res.ok) {
        if (adminKey) localStorage.setItem(KEY_STORAGE, adminKey);
        setRoster(data.roster);
        setNeedsKey(false);
        return true;
      }
      if (res.status === 401 || res.status === 403) {
        setNeedsKey(true);
        return false;
      }
      setError(data.error || 'Something went wrong.');
      return false;
    } catch {
      setError("Couldn't reach the server. Please try again.");
      return false;
    }
  };

  useEffect(() => {
    load(localStorage.getItem(KEY_STORAGE) || undefined);
  }, [session?.access_token]);

  // Cohort sessions (deck links) — loads once the roster unlocked us.
  useEffect(() => {
    if (roster === null) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = {};
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        const stored = localStorage.getItem(KEY_STORAGE);
        if (stored) headers['x-admin-key'] = stored;
        const res = await fetch('/api/decks', { headers });
        const data = await res.json();
        if (!cancelled && res.ok) setSessions(data.decks);
      } catch { /* sessions list is optional chrome */ }
    })();
    return () => { cancelled = true; };
  }, [roster, session?.access_token]);

  const submitKey = async (e) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key || busy) return;
    setBusy(true);
    setKeyError(null);
    const ok = await load(key);
    if (!ok) setKeyError('Wrong password — try again.');
    setBusy(false);
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <ShieldCheck size={32} className="text-[#1A1A1A]/30" />
        <p className="text-[#5C5C5C]">{error}</p>
      </div>
    );
  }

  if (needsKey) {
    return (
      <div className="flex-1 flex items-start justify-center p-6 pt-16">
        <div className="glass-panel w-full max-w-sm flex flex-col gap-3">
          <h1 className="text-xl uppercase text-center flex items-center justify-center gap-2">
            <KeyRound size={20} className="text-[#3E9E28]" /> Cohort Admin
          </h1>
          <p className="text-sm text-[#5C5C5C] text-center">Enter the admin password to see the roster.</p>
          <form onSubmit={submitKey} className="flex flex-col gap-2">
            <input
              type="password" required autoFocus autoComplete="current-password"
              placeholder="Admin password"
              value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
              className="w-full rounded-full border border-[#E3E3DF] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-black/40 focus:outline-none focus:border-[#3E9E28] transition-colors"
            />
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Checking…' : 'Open the roster'}
            </button>
          </form>
          {keyError && <p className="text-xs text-center text-red-600">{keyError}</p>}
        </div>
      </div>
    );
  }

  if (roster === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // The roster shows enrolled students only — pending (unpaid) applications are
  // hidden so they don't clutter the student roster. They still exist in the DB
  // and reappear here the moment they're marked paid.
  const shown = roster.filter((r) => r.status !== 'pending');
  const paid = shown.filter((r) => r.status === 'paid').length;

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6 mt-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-1 flex items-center gap-2">
              <ShieldCheck size={15} /> Cohort Admin
            </p>
            <h1 className="text-2xl sm:text-3xl uppercase">Summer 2026 Roster</h1>
            <p className="text-sm text-[#5C5C5C] mt-1">
              {paid} paid · {shown.length} on roster · 20 seats
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/curriculum" target="_blank" rel="noopener" className="btn !text-sm" title="The 8-week curriculum — inline editable">
              <BookOpen size={16} /> Curriculum
            </Link>
            <a href="/students" target="_blank" rel="noopener" className="btn !text-sm" title="The public cohort showcase">
              <GraduationCap size={16} /> Students overview page <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <div className="glass-panel !p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 border-b border-[#E3E3DF]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Preferred</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold text-center" title="Student has signed in and claimed their profile">Claimed</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} className="border-b border-[#E3E3DF]/60 last:border-0 hover:bg-[#F7F8F5]">
                  <td className="px-4 py-3 font-semibold">
                    {r.slug ? (
                      <a
                        href={`/students/${r.slug}`}
                        target="_blank" rel="noopener"
                        className="hover:underline inline-flex items-center gap-1.5"
                        title={`Open ${r.full_name}'s profile page`}
                      >
                        {r.full_name} <ExternalLink size={12} className="text-[#3E9E28]" />
                      </a>
                    ) : (
                      <span title="No student profile yet — add them to the students table">{r.full_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5C5C5C]">{r.preferred_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${STATUS_STYLES[r.status] || STATUS_STYLES['roster-only']}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5C5C5C]">{r.city || '—'}</td>
                  <td className="px-4 py-3 text-[#5C5C5C]">
                    {r.email ? <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a> : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#5C5C5C] whitespace-nowrap">
                    {r.phone ? <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a> : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#5C5C5C] whitespace-nowrap">{fmtDate(r.paid_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {r.claimed && <CheckCircle2 size={16} className="text-[#0F7B3F] inline" />}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#1A1A1A]/40 italic">No enrolled students yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#1A1A1A]/40 mt-4">
          Enrolled (paid) students only — pending applications are hidden and appear here once they pay. A linked
          name means the student has a public profile at /students/&lt;name&gt;. “Claimed” means the student has
          signed in and can edit their own profile.
        </p>

        {/* Cohort sessions — click straight into the deck you're presenting */}
        {sessions && (
          <div className="mt-8">
            <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
              <Presentation size={16} className="text-[#3E9E28]" /> Cohort Sessions — slide decks
            </h2>
            <div className="glass-panel !p-0 overflow-hidden">
              {sessions.map((s) => (
                <div key={s.week} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#E3E3DF]/60 last:border-0 hover:bg-[#F7F8F5]">
                  <div className="min-w-[240px]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0F7B3F] mr-2">
                      Week {s.week} · {new Date(s.session_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-semibold">{s.title}</span>
                    {s.dirty && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
                        title="Curriculum edited since this deck was last regenerated">
                        edits pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/admin/curriculum?week=${s.week}`} target="_blank" rel="noopener" className="btn !text-xs !py-1 !px-3"><BookOpen size={12} /> Curriculum</Link>
                    <Link to={`/admin/deck/${s.week}`} target="_blank" rel="noopener" className="btn btn-primary !text-xs !py-1 !px-3"><Presentation size={12} /> Open slide deck</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
