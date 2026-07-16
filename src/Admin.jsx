import { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, CheckCircle2, GraduationCap } from 'lucide-react';

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

export default function Admin({ session }) {
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin-roster', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error || 'Something went wrong.');
        else setRoster(data.roster);
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Please try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [session.access_token]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <ShieldCheck size={32} className="text-[#1A1A1A]/30" />
        <p className="text-[#5C5C5C]">{error}</p>
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

  const paid = roster.filter((r) => r.status === 'paid').length;

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
              {paid} paid · {roster.length} total · 20 seats
            </p>
          </div>
          <a href="/students" className="btn !text-sm" title="The public cohort showcase">
            <GraduationCap size={16} /> Students overview page <ExternalLink size={13} />
          </a>
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
              {roster.map((r, i) => (
                <tr key={i} className="border-b border-[#E3E3DF]/60 last:border-0 hover:bg-[#F7F8F5]">
                  <td className="px-4 py-3 font-semibold">
                    {r.slug ? (
                      <a
                        href={`/students/${r.slug}`}
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
              {roster.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#1A1A1A]/40 italic">No applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#1A1A1A]/40 mt-4">
          A linked name means the student has a public profile at /students/&lt;name&gt;. Rows without a link are
          applications with no roster entry yet (or unpaid). “Claimed” means the student has signed in and can
          edit their own profile.
        </p>
      </div>
    </div>
  );
}
