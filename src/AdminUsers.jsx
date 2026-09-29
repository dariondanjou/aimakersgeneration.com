import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Search, ArrowLeft } from 'lucide-react';
import { adminHeaders } from './adminAuth';
import AdminSignIn from './AdminSignIn';

// Every site account, served by /api/admin-users to signed-in admins only.
// The Admin checkbox gives an account full admin access (the same as every
// other admin) or takes it away. The server refuses to remove your own
// access or the last admin, and won't promote an unconfirmed email.
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const PROVIDER_LABEL = { google: 'Google', email: 'Email', discord: 'Discord', github: 'GitHub' };

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }

  const load = async () => {
    try {
      const res = await fetch('/api/admin-users', { headers: adminHeaders(session) });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
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

  const toggleAdmin = async (u) => {
    const next = !u.is_admin;
    const who = u.name || u.email || 'this account';
    const ok = window.confirm(next
      ? `Make ${who} an admin?\n\nThey'll get full admin access: rosters, applicant contact details, curriculum, contest entries, moderation, and this page.`
      : `Remove admin access from ${who}?`);
    if (!ok) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: adminHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: u.id, admin: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: 'error', text: data.error || 'Something went wrong.' });
        return;
      }
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, is_admin: next } : x)));
      setNotice({ type: 'ok', text: next ? `${who} is now an admin.` : `${who} is no longer an admin.` });
    } catch {
      setNotice({ type: 'error', text: "Couldn't reach the server. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const shown = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => (!onlyAdmins || u.is_admin)
      && (!q || [u.name, u.email, u.username].some((v) => v && v.toLowerCase().includes(q))));
  }, [users, query, onlyAdmins]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <ShieldCheck size={32} className="text-[#1A1A1A]/30" />
        <p className="text-[#5C5C5C]">{error}</p>
      </div>
    );
  }

  if (denied) return <AdminSignIn title="Users" session={session} />;

  if (users === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const adminCount = users.filter((u) => u.is_admin).length;
  const myId = session?.user?.id;

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6 mt-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-1 flex items-center gap-2">
              <ShieldCheck size={15} /> Admin
            </p>
            <h1 className="text-2xl sm:text-3xl uppercase flex items-center gap-3"><Users size={26} /> Users</h1>
            <p className="text-sm text-[#5C5C5C] mt-1">
              {users.length} account{users.length === 1 ? '' : 's'} · {adminCount} admin{adminCount === 1 ? '' : 's'}
            </p>
          </div>
          <Link to="/admin" className="btn !text-sm"><ArrowLeft size={16} /> Cohort roster</Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Search users</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/35" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-full border border-[#E3E3DF] bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#3E9E28]"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[#5C5C5C] cursor-pointer select-none">
            <input type="checkbox" checked={onlyAdmins} onChange={(e) => setOnlyAdmins(e.target.checked)} className="accent-[#3E9E28] w-4 h-4" />
            Admins only
          </label>
        </div>

        {notice && (
          <p role="status" className={`text-sm mb-4 rounded-xl px-4 py-2.5 border ${notice.type === 'ok'
            ? 'text-[#0F7B3F] bg-[#3E9E28]/10 border-[#3E9E28]/25'
            : 'text-red-700 bg-red-50 border-red-200'}`}>
            {notice.text}
          </p>
        )}

        <div className="glass-panel !p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 border-b border-[#E3E3DF]">
                <th className="px-4 py-3 font-semibold text-center">Admin</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Sign-in</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const isMe = u.id === myId;
                const lockedReason = isMe && u.is_admin
                  ? "You can't remove your own admin access"
                  : !u.is_admin && !u.confirmed
                    ? "Email not confirmed yet — can't be made an admin"
                    : null;
                return (
                  <tr key={u.id} className={`border-b border-[#E3E3DF]/60 last:border-0 hover:bg-[#F7F8F5] ${u.is_admin ? 'bg-[#3E9E28]/[0.04]' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.is_admin}
                        disabled={busyId === u.id || !!lockedReason}
                        onChange={() => toggleAdmin(u)}
                        title={lockedReason || (u.is_admin ? 'Remove admin access' : 'Make admin')}
                        aria-label={`${u.is_admin ? 'Remove admin access from' : 'Make admin:'} ${u.name || u.email}`}
                        className="accent-[#3E9E28] w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                          : <span className="w-7 h-7 rounded-full bg-[#E3E3DF] inline-block" />}
                        {u.username
                          ? <Link to={`/profile/${u.id}`} className="hover:underline">{u.name || u.username}</Link>
                          : (u.name || <span className="text-[#1A1A1A]/35 font-normal italic">No name</span>)}
                        {isMe && <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5C5C] border border-[#E3E3DF] rounded-full px-2 py-0.5">You</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5C5C5C]">
                      {u.email ? <a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a> : '—'}
                      {!u.confirmed && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          unconfirmed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5C5C5C]">{PROVIDER_LABEL[u.provider] || u.provider || '—'}</td>
                    <td className="px-4 py-3 text-[#5C5C5C] whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-[#5C5C5C] whitespace-nowrap">{fmtDate(u.last_sign_in_at)}</td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#1A1A1A]/40 italic">No accounts match.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#1A1A1A]/40 mt-4">
          Every admin has the same access. Someone has to create an account (email or Google) before they appear here.
          Accounts whose email isn't confirmed yet can't be made admins.
        </p>
      </div>
    </div>
  );
}
