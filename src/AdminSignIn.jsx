import { ShieldCheck } from 'lucide-react';

// Shown by every admin page when the server says no. Signed out: send them to
// sign in and come straight back. Signed in without admin rights: say so.
export default function AdminSignIn({ title = 'Cohort Admin', session }) {
  const next = window.location.pathname + window.location.search;
  const signInHref = `/community?next=${encodeURIComponent(next)}`;
  return (
    <div className="flex-1 flex items-start justify-center p-6 pt-16">
      <div className="glass-panel w-full max-w-sm flex flex-col gap-3">
        <h1 className="text-xl uppercase text-center flex items-center justify-center gap-2">
          <ShieldCheck size={20} className="text-[#3E9E28]" /> {title}
        </h1>
        {session ? (
          <p className="text-sm text-[#5C5C5C] text-center">
            You're signed in as <strong>{session.user?.email}</strong>, which doesn't have admin
            access. Sign in with your admin account to continue.
          </p>
        ) : (
          <p className="text-sm text-[#5C5C5C] text-center">
            Admins only. Sign in with your own AIMG account to continue.
          </p>
        )}
        {!session && (
          <a href={signInHref} className="btn btn-primary w-full text-center">Sign in</a>
        )}
      </div>
    </div>
  );
}
