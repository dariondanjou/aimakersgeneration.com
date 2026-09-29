import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ExternalLink, CheckCircle2, GraduationCap, Presentation, BookOpen, Users } from 'lucide-react';
import { COHORTS, CURRENT_COHORT, cohortById } from './cohorts';
import { adminHeaders } from './adminAuth';
import AdminSignIn from './AdminSignIn';

// Cohort admin: the full roster (every application + every students row),
// served by /api/admin-roster to signed-in admins only (their own account;
// no shared password — see api/_lib/admin-auth.js). Names link to the student's public profile page.
// One cohort at a time (?cohort=<id>, default CURRENT_COHORT) so the Summer
// and October programs are never mixed; rows without a `cohort` (older API
// responses) land in an "Unassigned" bucket.
const UNASSIGNED = 'unassigned';
const STATUS_STYLES = {
  paid: 'text-[#0F7B3F] bg-[#3E9E28]/10 border-[#3E9E28]/25',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  canceled: 'text-[#1A1A1A]/50 bg-[#1A1A1A]/5 border-[#1A1A1A]/15',
  refunded: 'text-red-700 bg-red-50 border-red-200',
  'roster-only': 'text-[#5C5C5C] bg-white border-[#E3E3DF]',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function Admin({ session }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [roster, setRoster] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/admin-roster', { headers: adminHeaders(session) });
      const data = await res.json();
      if (res.ok) {
        setRoster(data.roster);
        setDenied(false);
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setDenied(true);
        return;
      }
      setError(data.error || 'Something went wrong.');
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
  };

  useEffect(() => {
    load();
  }, [session?.access_token]);

  // Cohort sessions (deck links) — loads once the roster has loaded.
  useEffect(() => {
    if (roster === null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/decks', { headers: adminHeaders(session) });
        const data = await res.json();
        if (!cancelled && res.ok) setSessions(data.decks);
      } catch { /* sessions list is optional chrome */ }
    })();
    return () => { cancelled = true; };
  }, [roster, session?.access_token]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <ShieldCheck size={32} className="text-[#1A1A1A]/30" />
        <p className="text-[#5C5C5C]">{error}</p>
      </div>
    );
  }

  if (denied) return <AdminSignIn title="Cohort Admin" session={session} />;

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
  const enrolled = roster.filter((r) => r.status !== 'pending');
  const bucketOf = (r) => (cohortById(r.cohort) ? r.cohort : UNASSIGNED);
  const countFor = (id) => enrolled.filter((r) => bucketOf(r) === id).length;
  const hasUnassigned = countFor(UNASSIGNED) > 0;
  const tabs = [
    ...COHORTS.map((c) => ({ id: c.id, label: c.short })),
    ...(hasUnassigned ? [{ id: UNASSIGNED, label: 'Unassigned' }] : []),
  ];
  const requested = searchParams.get('cohort');
  const selectedId = tabs.some((t) => t.id === requested) ? requested : CURRENT_COHORT;
  const cohort = cohortById(selectedId); // null for the Unassigned bucket
  const selectCohort = (id) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('cohort', id);
    return next;
  });

  const shown = enrolled.filter((r) => bucketOf(r) === selectedId);
  const paid = shown.filter((r) => r.status === 'paid').length;

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6 mt-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-1 flex items-center gap-2">
              <ShieldCheck size={15} /> Cohort Admin
            </p>
            <h1 className="text-2xl sm:text-3xl uppercase">{cohort ? `${cohort.label} Roster` : 'Unassigned Students'}</h1>
            <p className="text-sm text-[#5C5C5C] mt-1">
              {cohort ? `${cohort.dates} · ` : 'No cohort on record — fix these rows in the database · '}
              {paid} paid · {shown.length} on roster
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/users" className="btn !text-sm" title="Every account on the site — make or remove admins">
              <Users size={16} /> Users &amp; admins
            </Link>
            {cohort?.materials && <Link to="/admin/curriculum" target="_blank" rel="noopener" className="btn !text-sm" title="The 8-week curriculum — inline editable">
              <BookOpen size={16} /> Curriculum
            </Link>}
            <a href={cohort ? `/students?cohort=${encodeURIComponent(cohort.id)}` : '/students'} target="_blank" rel="noopener" className="btn !text-sm" title="The public cohort showcase">
              <GraduationCap size={16} /> Students overview page <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <div role="tablist" aria-label="Cohort"
          className="inline-flex flex-wrap gap-1 rounded-full border border-[#E3E3DF] bg-white p-1 mb-4">
          {tabs.map((t) => {
            const active = t.id === selectedId;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => selectCohort(t.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active ? 'bg-[#3E9E28] text-white' : t.id === UNASSIGNED ? 'text-amber-700 hover:text-amber-800' : 'text-[#1A1A1A]/50 hover:text-[#0F7B3F]'
                }`}>
                {t.label} <span className={active ? 'text-white/70' : 'text-[#1A1A1A]/30'}>({countFor(t.id)})</span>
              </button>
            );
          })}
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
        {sessions && cohort?.materials && (
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
