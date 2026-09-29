// Supabase auth storage shared across aimakersgeneration.com subdomains.
//
// Enrollment lives on cohorts.aimakersgeneration.com and everything else on
// aimakersgeneration.com. localStorage is per-origin, so a session saved on
// one host is invisible on the other. On those hosts we store the session in
// cookies scoped to `.aimakersgeneration.com` instead; everywhere else
// (localhost, Vercel previews) we use plain localStorage.
//
// This file must stay tiny and free of supabase-js: the site nav imports it
// synchronously on the marketing pages to render the signed-in state instantly.

export const AUTH_STORAGE_KEY = 'sb-xnejbxdvqmzlaljkgwaf-auth-token';

const SHARED_DOMAIN = 'aimakersgeneration.com';
// Present once this browser's session has moved into shared cookies. After
// that, a missing cookie means "signed out" (possibly on the other subdomain),
// not "not migrated yet".
const MARKER = 'aimg-auth-shared';
const CHUNK = 3000;                     // chars per cookie (each cookie ≤ 4KB)
const MAX_AGE = 60 * 60 * 24 * 400;     // ~400 days (the browser cap)

const hasDom = () => typeof document !== 'undefined' && typeof location !== 'undefined';

export function usesSharedCookies() {
  if (!hasDom()) return false;
  const h = location.hostname;
  return h === SHARED_DOMAIN || h.endsWith('.' + SHARED_DOMAIN);
}

function ls() {
  try { return window.localStorage; } catch { return null; }
}

function readCookie(name) {
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i > -1 && p.slice(0, i) === name) return p.slice(i + 1);
  }
  return null;
}

function writeCookie(name, value, maxAge = MAX_AGE) {
  document.cookie = `${name}=${value}; Domain=.${SHARED_DOMAIN}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
}

function deleteCookie(name) {
  writeCookie(name, '', 0);
}

const countName = (key) => `${key}.count`;
const chunkName = (key, i) => `${key}.${i}`;
const hasMarker = () => readCookie(MARKER) === '1';

// Every existing chunk cookie for `key` (key.0, key.1, …), including strays
// left behind by an older, longer value.
function chunkNames(key) {
  const re = new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.\\d+$');
  return (document.cookie ? document.cookie.split('; ') : [])
    .map((p) => p.slice(0, p.indexOf('=')))
    .filter((n) => re.test(n));
}

function readChunks(key) {
  const n = parseInt(readCookie(countName(key)) || '', 10);
  if (!Number.isFinite(n) || n < 1) return null;
  let out = '';
  for (let i = 0; i < n; i++) {
    const part = readCookie(chunkName(key, i));
    if (part == null) return null; // torn write — treat as absent
    out += part;
  }
  try { return decodeURIComponent(out); } catch { return null; }
}

function writeChunks(key, value) {
  const enc = encodeURIComponent(value);
  const n = Math.max(1, Math.ceil(enc.length / CHUNK));
  for (let i = 0; i < n; i++) writeCookie(chunkName(key, i), enc.slice(i * CHUNK, (i + 1) * CHUNK));
  // Drop chunks beyond the new length.
  for (const name of chunkNames(key)) {
    const i = parseInt(name.slice(key.length + 1), 10);
    if (i >= n) deleteCookie(name);
  }
  writeCookie(countName(key), String(n));
  return readCookie(countName(key)) === String(n);
}

function clearChunks(key) {
  for (const name of chunkNames(key)) deleteCookie(name);
  deleteCookie(countName(key));
}

// The storage adapter handed to supabase-js (`auth.storage`).
export const sharedAuthStorage = {
  getItem(key) {
    if (!usesSharedCookies()) return ls()?.getItem(key) ?? null;
    const fromCookie = readChunks(key);
    if (fromCookie != null) return fromCookie;
    const legacy = ls()?.getItem(key) ?? null;
    if (!hasMarker()) {
      // Not migrated yet: carry the existing localStorage session over so
      // nobody is logged out by the switch to cookies.
      if (legacy != null) sharedAuthStorage.setItem(key, legacy);
      return legacy;
    }
    // Migrated, and the cookie is gone: signed out (maybe on the other
    // subdomain). Drop the stale per-origin copy too.
    if (legacy != null) ls()?.removeItem(key);
    return null;
  },
  setItem(key, value) {
    if (!usesSharedCookies()) { ls()?.setItem(key, value); return; }
    if (writeChunks(key, value)) {
      writeCookie(MARKER, '1');
      ls()?.removeItem(key);
    } else {
      // Cookies are blocked: keep working per-origin. The marker stays unset,
      // so getItem keeps falling back to localStorage.
      ls()?.setItem(key, value);
    }
  },
  removeItem(key) {
    if (usesSharedCookies()) clearChunks(key);
    ls()?.removeItem(key);
  },
};

// Synchronous, side-effect-free peek at the stored session, for the nav's
// first paint. Presentation only — supabase-js verifies it afterwards.
export function readStoredSession() {
  if (!hasDom()) return null;
  let raw = null;
  try {
    if (usesSharedCookies()) {
      raw = readChunks(AUTH_STORAGE_KEY);
      if (raw == null && !hasMarker()) raw = ls()?.getItem(AUTH_STORAGE_KEY) ?? null;
    } else {
      raw = ls()?.getItem(AUTH_STORAGE_KEY) ?? null;
    }
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Older supabase-js versions nested it as { currentSession }.
    const session = s?.currentSession || s;
    return session?.user && (session.access_token || session.refresh_token) ? session : null;
  } catch {
    return null;
  }
}
