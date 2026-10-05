import { useEffect, useState } from 'react';
import { LogIn, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import useSession from './useSession';

// /students is for signed-in cohort members only: a student in any cohort
// (matched by account or sign-in email) or an admin. The database enforces
// the same rule (public.is_cohort_member() on every student table); this gate
// just explains it instead of showing empty pages.
//
// On the way in, claim_my_student_profiles() links the member's rows to their
// account so ownership (editing) and the site nav recognize them right away.

const signInHref = () => `/community?next=${encodeURIComponent(location.pathname + location.search)}`;

function Panel({ icon, title, children }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass-panel max-w-md w-full text-center !p-8">
        <div className="w-12 h-12 rounded-full bg-[#3E9E28]/10 text-[#3E9E28] flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h1 className="text-xl uppercase mb-2">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default function MembersGate({ children }) {
  const session = useSession();
  const userId = session?.user?.id || null;
  const [access, setAccess] = useState({ forId: null, member: false });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    (async () => {
      await supabase.rpc('claim_my_student_profiles').then(() => {}, () => {});
      const { data, error } = await supabase.rpc('is_cohort_member');
      if (!cancelled) setAccess({ forId: userId, member: !error && data === true });
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (session === undefined || (userId && access.forId !== userId)) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Panel icon={<LogIn size={22} />} title="Cohort students only">
        <p className="text-sm text-[#5C5C5C] mb-6">
          Log in with the email you enrolled with to see your cohort, your profile, and the session materials.
        </p>
        <a href={signInHref()} className="btn btn-primary inline-flex items-center gap-2">
          <LogIn size={16} /> Log in
        </a>
      </Panel>
    );
  }

  if (!access.member) {
    return (
      <Panel icon={<Lock size={22} />} title="Cohort students only">
        <p className="text-sm text-[#5C5C5C] mb-2">
          You're logged in as <strong>{session.user.email}</strong>, which isn't on a cohort roster.
        </p>
        <p className="text-sm text-[#5C5C5C] mb-6">
          If you enrolled with a different email, log in with that one. Otherwise, the next cohort is open for enrollment.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => supabase.auth.signOut()} className="btn !text-sm">Use another email</button>
          <a href="/apply" className="btn btn-primary !text-sm">See the next cohort</a>
        </div>
      </Panel>
    );
  }

  return children;
}
