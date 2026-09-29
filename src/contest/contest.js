// /contest — the AIMG 30-second ad contest one-pager.
//
// Signed out: the page reads as a poster; the brand kit and the submission
// area are visible but grayed out, with sign-in / create-account links that
// return here (?next=/contest).
// Signed in: 1) entrant details (contest_entrants), 2) brand kit downloads,
// 3) film uploads — /api/contest-upload reserves the file name, the browser
// uploads straight to Vercel Blob, then the API confirms it and records the URL.
// Admins also get a Submissions tab: every film with a player, the entrant's
// details, and a download link.

import { upload } from '@vercel/blob/client';
import { supabase } from '../supabaseClient.js';

const CONTEST = 'oct-2026-film-ad';
// Thursday, October 1, 2026, 11:59 PM EDT. The API enforces it; this only
// decides what the page shows.
const DEADLINE = new Date('2026-10-02T03:59:00Z');
const MAX_BYTES = 5 * 1024 ** 3;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mpe?g|wmv|mts|m2ts|3gp)$/i;
// Browsers leave file.type empty for some formats; Blob needs a video/* type.
const EXT_TYPE = {
  mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
  avi: 'video/x-msvideo', mpg: 'video/mpeg', mpeg: 'video/mpeg', wmv: 'video/x-ms-wmv', mts: 'video/mp2t',
  m2ts: 'video/mp2t', '3gp': 'video/3gpp',
};
const videoType = (file) => (file.type.startsWith('video/') ? file.type
  : EXT_TYPE[(file.name.split('.').pop() || '').toLowerCase()] || 'video/mp4');

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

let session = null;
let entrant = null;
let uploading = 0;

const isClosed = () => Date.now() > DEADLINE.getTime();
// Entrants must accept the usage rights (#rights) before uploading.
const agreed = () => $('agree').checked;
const canUpload = () => !!session && !!entrant && !isClosed() && agreed();

// "relation does not exist" / PostgREST "table not in schema cache": the
// contest migration hasn't been applied yet.
const notSetUp = (err) => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message || ''));

function fmtBytes(n) {
  if (!n) return '';
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(1) + ' GB';
  if (n >= 1024 ** 2) return Math.round(n / 1024 ** 2) + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

function fmtET(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ── signed-in / signed-out chrome ──────────────────────────────────────────
function paintAuth() {
  const on = !!session;
  document.querySelectorAll('[data-signed-out]').forEach((n) => { n.hidden = on; });
  document.querySelectorAll('[data-signed-in]').forEach((n) => { n.hidden = !on; });
  $('reg-signed-out').hidden = on;

  // Brand kit: links only get an href once signed in.
  $('assets-panel').classList.toggle('locked', !on);
  document.querySelectorAll('[data-asset]').forEach((a) => {
    if (on) a.setAttribute('href', a.dataset.asset);
    else a.removeAttribute('href');
    a.tabIndex = on ? 0 : -1;
  });

  if (!on) {
    entrant = null;
    $('reg-form').hidden = true;
    $('reg-done').hidden = true;
    hideAdmin();
    $('mine').replaceChildren();
    $('mine-head').hidden = true;
  }
  paintSubmit();
}

function paintSubmit() {
  const panel = $('submit-panel');
  const lock = $('submit-lock');
  const closed = isClosed();
  const ready = !!session && !!entrant;
  panel.classList.toggle('locked', !ready);
  $('submit-closed').hidden = !closed || !ready;
  $('drop').hidden = closed && ready;
  $('pick').disabled = !ready || closed || !agreed();
  $('agree').disabled = !ready || closed;
  $('drop-hint').textContent = ready && !agreed() ? 'Tick the usage-rights box above to start uploading.' : 'or drag and drop them here';

  const span = lock.querySelector('span');
  if (!session) {
    span.innerHTML = '<a href="/community?next=%2Fcontest">Sign in</a> or <a href="/community?mode=signup&amp;next=%2Fcontest">create a free account</a> to submit.';
  } else if (!entrant) {
    span.innerHTML = 'Save your details in <a href="#register">step 1</a> to unlock submissions.';
  }
}

// ── step 1: entrant details ────────────────────────────────────────────────
function fillForm() {
  const f = entrant || {};
  const meta = session?.user?.user_metadata || {};
  const [gFirst, ...gRest] = String(meta.full_name || meta.name || '').split(' ');
  $('first_name').value = f.first_name || meta.first_name || gFirst || '';
  $('last_name').value = f.last_name || meta.last_name || gRest.join(' ') || '';
  $('email').value = f.email || session?.user?.email || '';
  $('whatsapp_phone').value = f.whatsapp_phone || '';
  $('linkedin_url').value = f.linkedin_url || '';
}

function showRegistered() {
  $('reg-form').hidden = true;
  $('reg-done').hidden = false;
  $('reg-name').textContent = `${entrant.first_name} ${entrant.last_name}`;
  $('reg-contact').textContent = `${entrant.email} · WhatsApp ${entrant.whatsapp_phone}`;
}

function showForm() {
  fillForm();
  $('reg-done').hidden = true;
  $('reg-form').hidden = false;
}

function setMsg(text, kind) {
  const m = $('reg-msg');
  m.textContent = text || '';
  m.className = 'msg' + (kind ? ' ' + kind : '');
}

async function loadEntrant() {
  const { data, error } = await supabase
    .from('contest_entrants')
    .select('first_name, last_name, email, whatsapp_phone, linkedin_url')
    .eq('contest', CONTEST).eq('user_id', session.user.id).maybeSingle();
  if (error) {
    showForm();
    setMsg(notSetUp(error) ? 'Contest registration opens shortly — check back in a bit.' : "Couldn't load your details. Refresh to try again.", 'err');
    return;
  }
  entrant = data || null;
  if (entrant) showRegistered();
  else showForm();
}

function normalizeUrl(v) {
  const s = v.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
}

async function saveEntrant(e) {
  e.preventDefault();
  if (!session) return;
  const row = {
    contest: CONTEST,
    user_id: session.user.id,
    first_name: $('first_name').value.trim(),
    last_name: $('last_name').value.trim(),
    email: $('email').value.trim(),
    whatsapp_phone: $('whatsapp_phone').value.trim(),
    linkedin_url: normalizeUrl($('linkedin_url').value),
  };
  if (!row.first_name || !row.last_name) return setMsg('Add your first and last name.', 'err');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return setMsg('Add a valid email address.', 'err');
  if (row.whatsapp_phone.replace(/\D/g, '').length < 7) return setMsg('Add the phone number you use on WhatsApp, with country code if outside the US.', 'err');
  if (row.linkedin_url && !/^https?:\/\/[^\s]+\.[^\s]+/.test(row.linkedin_url)) return setMsg("That LinkedIn link doesn't look right.", 'err');

  const btn = $('reg-save');
  btn.disabled = true;
  setMsg('Saving…');
  const { error } = await supabase.from('contest_entrants').upsert(row, { onConflict: 'contest,user_id' });
  btn.disabled = false;
  if (error) {
    return setMsg(notSetUp(error) ? 'Contest registration opens shortly — check back in a bit.' : "Couldn't save your details. Please try again.", 'err');
  }
  setMsg('');
  entrant = row;
  showRegistered();
  paintSubmit();
}

// ── step 3: films ──────────────────────────────────────────────────────────
async function loadMine() {
  if (!session) return;
  const { data, error } = await supabase
    .from('contest_submissions')
    .select('id, original_filename, size_bytes, received_at')
    .eq('contest', CONTEST).eq('user_id', session.user.id).eq('status', 'received')
    .order('received_at', { ascending: false });
  if (error) return;
  const list = $('mine');
  list.replaceChildren(...(data || []).map((s) => {
    const li = el('li');
    const row = el('div', 'row');
    row.append(el('span', 'name', s.original_filename), el('span', 'state ok', `✓ Received ${fmtET(s.received_at)}`));
    li.append(row);
    if (s.size_bytes) li.append(el('span', 'hint', fmtBytes(s.size_bytes)));
    return li;
  }));
  $('mine-head').hidden = !(data && data.length);
}

// Refresh-safe: always send the current access token.
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(body) {
  const res = await fetch('/api/contest-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

async function uploadOne(file) {
  const li = el('li');
  const row = el('div', 'row');
  const state = el('span', 'state', 'Preparing…');
  row.append(el('span', 'name', file.name), state);
  const bar = el('div', 'bar');
  const fill = el('i');
  bar.append(fill);
  li.append(row, bar);
  $('uploads').prepend(li);

  const fail = (msg) => { state.textContent = msg; state.className = 'state err'; bar.remove(); };

  if (!(file.type.startsWith('video/') || VIDEO_EXT.test(file.name))) return fail("Not a video file — upload an MP4 or MOV.");
  if (file.size > MAX_BYTES) return fail('Over 5 GB — export a smaller version.');
  if (!file.size) return fail('That file is empty.');

  uploading++;
  const leaving = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', leaving);
  try {
    const type = videoType(file);
    const start = await api({ action: 'start', filename: file.name, size: file.size, mimeType: type, agreedToRights: true });
    state.textContent = 'Uploading… 0%';
    let blob;
    try {
      blob = await upload(start.pathname, file, {
        access: 'public',
        contentType: type,
        handleUploadUrl: '/api/contest-upload',
        clientPayload: start.submissionId,
        headers: await authHeader(),
        multipart: file.size > 50 * 1024 ** 2,
        onUploadProgress: ({ percentage }) => {
          fill.style.width = `${Math.round(percentage)}%`;
          state.textContent = `Uploading… ${Math.floor(percentage)}%`;
        },
      });
    } catch (err) {
      // The token route's own errors are already readable; network ones aren't.
      throw new Error(/network|fetch|failed/i.test(err?.message || '') || !err?.message
        ? 'The upload was interrupted. Check your connection and try again.'
        : err.message.replace(/^Vercel Blob: /, ''));
    }
    state.textContent = 'Confirming…';
    await api({ action: 'finish', submissionId: start.submissionId, url: blob.url });
    fill.style.width = '100%';
    state.textContent = '✓ Submitted';
    state.className = 'state ok';
    setTimeout(() => { li.remove(); loadMine(); }, 1200);
  } catch (err) {
    fail(err.message);
  } finally {
    uploading--;
    if (!uploading) window.removeEventListener('beforeunload', leaving);
  }
}

async function uploadFiles(files) {
  if (!canUpload()) return;
  // One at a time: parallel multi-GB uploads just compete for bandwidth.
  for (const f of files) await uploadOne(f);
}

// ── admins: the Submissions tab ────────────────────────────────────────────
// Every film with a player, the entrant's details, and a download link.
// The tab bar only appears for admins; #submissions deep-links to it.
function showTab(name) {
  const subs = name === 'submissions' && !$('admin-tabs').hidden;
  $('tab-enter').hidden = subs;
  $('tab-submissions').hidden = !subs;
  document.querySelectorAll('#admin-tabs [data-tab]').forEach((b) => {
    b.setAttribute('aria-selected', String((b.dataset.tab === 'submissions') === subs));
  });
}

function hideAdmin() {
  $('admin-tabs').hidden = true;
  showTab('enter');
}

const waLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  // Ten digits with no country code: assume US.
  return `https://wa.me/${digits.length === 10 ? '1' + digits : digits}`;
};

const extLink = (text, href) => {
  const a = el('a', null, text);
  a.href = href; a.target = '_blank'; a.rel = 'noopener';
  return a;
};

function filmCard(r) {
  const card = el('article', 'film');
  const video = el('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.src = r.file_url;
  card.append(video);

  const body = el('div', 'film-body');
  body.append(el('h3', null, `${r.first_name} ${r.last_name}`));
  const dl = el('dl');
  const row = (label, ...nodes) => { dl.append(el('dt', null, label)); const dd = el('dd'); dd.append(...nodes); dl.append(dd); };
  const mail = el('a', null, r.email); mail.href = `mailto:${r.email}`;
  row('Email', mail);
  row('WhatsApp', extLink(r.whatsapp_phone, waLink(r.whatsapp_phone)));
  row('LinkedIn', r.linkedin_url ? extLink(r.linkedin_url.replace(/^https?:\/\/(www\.)?/i, ''), r.linkedin_url) : el('span', 'hint', '—'));
  row('Received', document.createTextNode(`${fmtET(r.received_at)} ET`));
  row('File', el('span', 'file-name', r.file_name), ...(r.size_bytes ? [el('span', 'hint', fmtBytes(r.size_bytes))] : []));
  body.append(dl);

  const actions = el('div', 'film-actions');
  const download = el('a', 'btn btn-primary', 'Download');
  download.href = `${r.file_url}${r.file_url.includes('?') ? '&' : '?'}download=1`;
  actions.append(download, extLink('Open in new tab', r.file_url));
  body.append(actions);
  card.append(body);
  return card;
}

async function loadEntries() {
  const { data: admin } = await supabase.rpc('is_admin');
  if (!admin) { hideAdmin(); return; }
  $('admin-tabs').hidden = false;
  if (location.hash === '#submissions') showTab('submissions');

  const { data, error } = await supabase
    .from('contest_entries')
    .select('received_at, first_name, last_name, email, whatsapp_phone, linkedin_url, file_name, file_url, size_bytes, user_id')
    .eq('contest', CONTEST).eq('status', 'received')
    .order('received_at', { ascending: false });
  const list = $('films');
  if (error) {
    $('entries-summary').textContent = notSetUp(error) ? 'The contest tables are not set up yet (apply the contest migrations).' : `Couldn't load submissions: ${error.message}`;
    list.replaceChildren();
    return;
  }
  const people = new Set(data.map((r) => r.user_id)).size;
  $('subs-count').textContent = String(data.length);
  $('entries-summary').textContent = data.length
    ? `${data.length} film${data.length === 1 ? '' : 's'} from ${people} entrant${people === 1 ? '' : 's'}, newest first.`
    : 'No films yet. They show up here as soon as an upload finishes.';
  list.replaceChildren(...data.map(filmCard));
}

document.querySelectorAll('#admin-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
  showTab(b.dataset.tab);
  history.replaceState(null, '', b.dataset.tab === 'submissions' ? '#submissions' : location.pathname + location.search);
  if (b.dataset.tab === 'submissions') loadEntries();
}));
$('subs-refresh').addEventListener('click', loadEntries);

// ── wiring ─────────────────────────────────────────────────────────────────
async function onSession(next) {
  const changed = (next?.user?.id || null) !== (session?.user?.id || null);
  session = next;
  if (!changed) return;
  paintAuth();
  if (!session) return;
  await loadEntrant();
  paintSubmit();
  loadMine();
  loadEntries();
}

$('reg-form').addEventListener('submit', saveEntrant);
$('reg-edit').addEventListener('click', showForm);

$('agree').addEventListener('change', paintSubmit);

const input = $('film');
$('pick').addEventListener('click', () => input.click());
input.addEventListener('change', () => { uploadFiles([...input.files]); input.value = ''; });

const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => {
  if (!canUpload()) return;
  e.preventDefault(); drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => {
  if (!canUpload()) return;
  e.preventDefault();
  uploadFiles([...(e.dataTransfer?.files || [])]);
});

paintAuth();
supabase.auth.getSession().then(({ data }) => onSession(data?.session || null));
supabase.auth.onAuthStateChange((_event, s) => { onSession(s || null); });
