import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, LogOut, Trash2, Link2, ShieldCheck } from 'lucide-react';
import { supabase } from './supabaseClient';

const inputClass =
  "w-full rounded-lg border border-[#E3E3DF] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-black/40 focus:outline-none focus:border-[#3E9E28] transition-colors";

function Msg({ msg }) {
  if (!msg) return null;
  return <p className={`text-xs mt-1 ${msg.type === 'error' ? 'text-red-600' : 'text-[#3E9E28]'}`}>{msg.text}</p>;
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="glass-panel">
      <h2 className="flex items-center gap-2 text-base font-bold mb-4">
        <Icon size={18} className="text-[#3E9E28]" /> {title}
      </h2>
      {children}
    </div>
  );
}

export default function Settings({ session }) {
  const navigate = useNavigate();
  const user = session.user;

  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState(null);

  const providers = user.app_metadata?.providers
    || (user.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const hasPassword = providers.includes('email');

  const changeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    setEmailBusy(true); setEmailMsg(null);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/community` }
    );
    setEmailMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'ok', text: `Confirmation link sent to ${newEmail}. Click it to finish the change.` });
    if (!error) setNewEmail('');
    setEmailBusy(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    if (pw !== pw2) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setPwBusy(true); setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwMsg(error ? { type: 'error', text: error.message } : { type: 'ok', text: 'Password updated.' });
    if (!error) { setPw(''); setPw2(''); }
    setPwBusy(false);
  };

  const deleteAccount = async () => {
    setDelBusy(true); setDelMsg(null);
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not delete the account.');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      setDelMsg({ type: 'error', text: err.message });
      setDelBusy(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-[#5C5C5C] hover:text-[#1A1A1A] transition-colors w-fit">
        <ArrowLeft size={16} /> Back to community
      </button>

      <h1 className="text-2xl uppercase">Settings</h1>

      {/* Account */}
      <Section icon={User} title="Account">
        <div className="text-sm text-[#5C5C5C] mb-4">
          Signed in as <span className="font-semibold text-[#1A1A1A]">{user.email || '(no email on file)'}</span>
        </div>

        <form onSubmit={changeEmail} className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider text-[#5C5C5C]">Change email</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="email" placeholder="new@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
            <button type="submit" disabled={emailBusy || !newEmail} className="btn btn-social sm:w-auto whitespace-nowrap">
              <Mail size={16} /> {emailBusy ? 'Sending…' : 'Update'}
            </button>
          </div>
          <Msg msg={emailMsg} />
        </form>
      </Section>

      {/* Password */}
      <Section icon={Lock} title={hasPassword ? 'Password' : 'Set a password'}>
        {!hasPassword && (
          <p className="text-sm text-[#5C5C5C] mb-3">
            You sign in with {providers.join(', ') || 'a social account'}. Set a password to also sign in with your email.
          </p>
        )}
        <form onSubmit={changePassword} className="flex flex-col gap-2">
          <input type="password" placeholder="New password (6+ chars)" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} />
          <input type="password" placeholder="Confirm new password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} />
          <button type="submit" disabled={pwBusy} className="btn btn-primary w-fit">
            {pwBusy ? 'Saving…' : (hasPassword ? 'Update password' : 'Set password')}
          </button>
          <Msg msg={pwMsg} />
        </form>
      </Section>

      {/* Connected sign-in methods */}
      <Section icon={Link2} title="Connected sign-in methods">
        {providers.length === 0 ? (
          <p className="text-sm text-[#5C5C5C]">None on record.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 text-sm rounded-full border border-[#E3E3DF] bg-[#F4F4F2] px-3 py-1.5 capitalize">
                <ShieldCheck size={14} className="text-[#3E9E28]" /> {p === 'email' ? 'Email & password' : p}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Public profile */}
      <Section icon={User} title="Public profile">
        <p className="text-sm text-[#5C5C5C] mb-3">Your name, photo, title, bio, and links — visible to other makers.</p>
        <button onClick={() => navigate(`/profile/${user.id}`)} className="btn btn-social w-fit">
          <User size={16} /> Edit public profile
        </button>
      </Section>

      {/* Danger zone */}
      <div className="glass-panel border-red-200">
        <h2 className="flex items-center gap-2 text-base font-bold mb-4 text-red-700">
          <Trash2 size={18} /> Danger zone
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-[#1A1A1A]">Sign out</div>
              <div className="text-xs text-[#5C5C5C]">Sign out of the community on this device.</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="btn btn-social w-fit">
              <LogOut size={16} /> Sign out
            </button>
          </div>

          <div className="border-t border-[#E3E3DF] pt-4">
            <div className="text-sm font-semibold text-red-700">Delete account</div>
            <div className="text-xs text-[#5C5C5C] mb-3">Permanently deletes your account, profile, comments, and posts. This cannot be undone.</div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="btn w-fit border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50">
                <Trash2 size={16} /> Delete my account
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-700 font-semibold">Are you sure? This is permanent.</p>
                <div className="flex gap-2">
                  <button onClick={deleteAccount} disabled={delBusy} className="btn w-fit bg-red-600 text-white border-red-600 hover:bg-red-700">
                    {delBusy ? 'Deleting…' : 'Yes, delete everything'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} disabled={delBusy} className="btn btn-social w-fit">Cancel</button>
                </div>
                <Msg msg={delMsg} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
