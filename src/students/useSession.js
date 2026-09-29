import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// The current Supabase auth session for the /students app.
// `undefined` while the initial lookup is in flight, then a session or null.
// Stays in sync with sign-in / sign-out / token refresh in any tab.
export default function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data?.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next ?? null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return session;
}
