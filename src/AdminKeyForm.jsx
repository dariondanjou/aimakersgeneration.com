import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { storeAdminKey } from './adminAuth';

// The shared password prompt used by every admin page. onUnlock is called
// after the key is stored; the page retries its load and decides whether the
// key was right (wrong keys come back 403 and the page calls setError).
export default function AdminKeyForm({ title = 'Cohort Admin', onUnlock, error, busy }) {
  const [keyInput, setKeyInput] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key || busy) return;
    storeAdminKey(key);
    onUnlock();
  };
  return (
    <div className="flex-1 flex items-start justify-center p-6 pt-16">
      <div className="glass-panel w-full max-w-sm flex flex-col gap-3">
        <h1 className="text-xl uppercase text-center flex items-center justify-center gap-2">
          <KeyRound size={20} className="text-[#3E9E28]" /> {title}
        </h1>
        <p className="text-sm text-[#5C5C5C] text-center">Enter the admin password.</p>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            type="password" required autoFocus autoComplete="current-password"
            placeholder="Admin password"
            value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
            className="w-full rounded-full border border-[#E3E3DF] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-black/40 focus:outline-none focus:border-[#3E9E28] transition-colors"
          />
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        {error && <p className="text-xs text-center text-red-600">{error}</p>}
      </div>
    </div>
  );
}
