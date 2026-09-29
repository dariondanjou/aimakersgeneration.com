// Auth headers for the cohort admin pages (roster, curriculum, decks). Admins
// sign in with their own account; the server checks public.is_admin() for the
// signed-in user. There is no shared password.
const LEGACY_KEY = 'aimg-admin-key';

export function adminHeaders(session, extra = {}) {
  const h = { ...extra };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

// Drop the old shared password from browsers that stored it.
try { localStorage.removeItem(LEGACY_KEY); } catch { /* storage blocked */ }
