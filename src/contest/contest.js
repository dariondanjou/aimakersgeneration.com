// /contest — the AIMG 30-second ad contest one-pager.
//
// Signed out: the page reads as a poster; the brand kit and the submission
// area are visible but grayed out, with sign-in / create-account links that
// return here (?next=/contest).
// Signed in: 1) entrant details (contest_entrants), 2) brand kit downloads,
// 3) film uploads — /api/contest-upload opens a Google Drive upload session,
// the browser PUTs the file straight to Drive, then the API records the link.
// Admins also get a table of every entry with its Drive link.

import { supabase } from '../supabaseClient.js';

const CONTEST = 'oct-2026-film-ad';
// Thursday, October 1, 2026, 10:00 PM EDT. The API enforces it; this only
// decides what the page shows.
const DEADLINE = new Date('2026-10-02T02:00:00Z');
const MAX_BYTES = 5 * 1024 ** 3;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mpe?g|wmv|mts|m2ts|3gp)$/i;

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
    $('entries').hidden = true;
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
  $('pick').disabled = !ready || closed;

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
    .select('id, original_filename, size_bytes, received_at, drive_url')
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

async function api(body) {
  // Refresh-safe: always send the current access token.
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch('/api/contest-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

function putToDrive(url, file, type, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Upload finished but Drive sent an unexpected reply.')); }
      } else reject(new Error(`The upload was interrupted (${xhr.status}). Please try again.`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload. Check your connection and try again.'));
    xhr.send(file);
  });
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
    const type = file.type || 'application/octet-stream';
    const start = await api({ action: 'start', filename: file.name, size: file.size, mimeType: type });
    state.textContent = 'Uploading… 0%';
    const driveFile = await putToDrive(start.uploadUrl, file, type, (p) => {
      fill.style.width = `${Math.round(p * 100)}%`;
      state.textContent = `Uploading… ${Math.floor(p * 100)}%`;
    });
    state.textContent = 'Confirming…';
    await api({ action: 'finish', submissionId: start.submissionId, fileId: driveFile.id });
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
  if (!session || !entrant || isClosed()) return;
  // One at a time: parallel multi-GB uploads just compete for bandwidth.
  for (const f of files) await uploadOne(f);
}

// ── admins: every entry with its Drive link ────────────────────────────────
async function loadEntries() {
  const { data: admin } = await supabase.rpc('is_admin');
  if (!admin) { $('entries').hidden = true; return; }
  const { data, error } = await supabase
    .from('contest_entries')
    .select('received_at, first_name, last_name, email, whatsapp_phone, linkedin_url, drive_name, drive_url, size_bytes, user_id')
    .eq('contest', CONTEST).eq('status', 'received')
    .order('received_at', { ascending: false });
  $('entries').hidden = false;
  const body = $('entries-body');
  if (error) {
    $('entries-summary').textContent = notSetUp(error) ? 'The contest tables are not set up yet (apply the film contest migration).' : `Couldn't load entries: ${error.message}`;
    body.replaceChildren();
    return;
  }
  const people = new Set((data || []).map((r) => r.user_id)).size;
  $('entries-summary').textContent = `${data.length} film${data.length === 1 ? '' : 's'} from ${people} entrant${people === 1 ? '' : 's'}. Films are in the Google Drive submissions folder.`;
  body.replaceChildren(...data.map((r) => {
    const tr = el('tr');
    const who = el('td');
    who.append(el('strong', null, `${r.first_name} ${r.last_name}`));
    if (r.linkedin_url) {
      const a = el('a', null, 'LinkedIn');
      a.href = r.linkedin_url; a.target = '_blank'; a.rel = 'noopener';
      who.append(el('br'), a);
    }
    const contact = el('td');
    contact.append(document.createTextNode(r.email), el('br'), document.createTextNode(`WhatsApp ${r.whatsapp_phone}`));
    const film = el('td');
    const link = el('a', null, r.drive_name);
    link.href = r.drive_url; link.target = '_blank'; link.rel = 'noopener';
    film.append(link);
    if (r.size_bytes) film.append(el('br'), el('span', 'hint', fmtBytes(r.size_bytes)));
    tr.append(el('td', null, fmtET(r.received_at)), who, contact, film);
    return tr;
  }));
}

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

const input = $('film');
$('pick').addEventListener('click', () => input.click());
input.addEventListener('change', () => { uploadFiles([...input.files]); input.value = ''; });

const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => {
  if (!session || !entrant || isClosed()) return;
  e.preventDefault(); drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => {
  if (!session || !entrant || isClosed()) return;
  e.preventDefault();
  uploadFiles([...(e.dataTransfer?.files || [])]);
});

paintAuth();
supabase.auth.getSession().then(({ data }) => onSession(data?.session || null));
supabase.auth.onAuthStateChange((_event, s) => { onSession(s || null); });
