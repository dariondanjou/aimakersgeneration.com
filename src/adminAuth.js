// Shared admin auth plumbing for the cohort admin pages (roster, curriculum,
// decks). The accepted shared password lives in sessionStorage for the tab's
// lifetime; signed-in allowlisted admins pass via their Supabase token.
export const KEY_STORAGE = 'aimg-admin-key';

export function adminHeaders(session, extra = {}) {
  const h = { ...extra };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  const k = sessionStorage.getItem(KEY_STORAGE);
  if (k) h['x-admin-key'] = k;
  return h;
}

export function storeAdminKey(key) {
  sessionStorage.setItem(KEY_STORAGE, key);
}
