// Pure helpers for the message boards (src/Boards.jsx). No React here.

export const THREAD_PAGE = 30;   // threads per "load more" in a board
export const REPLY_PAGE = 100;   // replies per "load more" in a thread
export const TITLE_MAX = 160;
export const BODY_MAX = 10000;

// ── URL state: /community?tab=boards&board=<slug>&thread=<id> ──────────────
export function readBoardsLocation() {
  const params = new URLSearchParams(window.location.search);
  return {
    tab: params.get('tab'),
    board: params.get('board') || null,
    thread: params.get('thread') || null,
  };
}

export function boardsHref({ board = null, thread = null } = {}) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', 'boards');
  if (board) params.set('board', board); else params.delete('board');
  if (thread) params.set('thread', thread); else params.delete('thread');
  return `${window.location.pathname}?${params.toString()}`;
}

// ── Errors ─────────────────────────────────────────────────────────────────
// The migration may not be applied yet: Postgres 42P01 (undefined table) or
// PostgREST PGRST205/PGRST202 (not in the schema cache).
export function isMissingSchema(error) {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202'
    || /does not exist|schema cache/i.test(error.message || '');
}

export function friendlyError(error) {
  if (!error) return '';
  if (isMissingSchema(error)) return 'Boards are being set up — check back soon.';
  const msg = error.message || String(error);
  if (error.code === '42501' || error.code === 'not_permitted' || /row-level security|permission denied/i.test(msg)) {
    return "You don't have permission to do that here.";
  }
  if (error.code === '23514') return 'That post is too long or missing a required field.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Network hiccup — check your connection and try again.';
  return msg || 'Something went wrong — please try again.';
}

// An UPDATE/DELETE filtered out by RLS affects zero rows without an error.
export const NOT_PERMITTED = { code: 'not_permitted', message: 'not permitted' };

// ── Authors ────────────────────────────────────────────────────────────────
export function displayName(profile, fallback = 'Member') {
  if (!profile) return fallback;
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return full || profile.full_name || profile.username || fallback;
}

// ── Links ──────────────────────────────────────────────────────────────────
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const TRAILING = /[.,!?;:)\]}'"]+$/;

// Split text into [{ type: 'text'|'link', value }] — rendered as React nodes,
// never as HTML.
export function tokenizeLinks(text) {
  const out = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0];
    const trail = url.match(TRAILING);
    if (trail) url = url.slice(0, -trail[0].length);
    if (!url) continue;
    const start = match.index;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({ type: 'link', value: url });
    last = start + url.length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

export function normalizeUrl(input) {
  const raw = (input || '').trim();
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// YouTube / Vimeo → privacy-friendly embed URL, else null.
export function getEmbedUrl(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  const ytId = /^[\w-]{11}$/;
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return ytId.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    let id = u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
    if (m) id = m[1];
    return id && ytId.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/\/(?:video\/)?(\d{5,12})(?:\/|$)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  }
  return null;
}
