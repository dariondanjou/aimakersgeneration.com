// Previous-work uploads on the enrollment page (apply.html). Files go straight
// from the browser to Vercel Blob; /api/enroll-upload only signs the upload
// token. The finished files are read by the form script through
// window.aimgWork when the enrollee pays.

import { upload } from '@vercel/blob/client';

const PREFIX = 'enroll/winter-2027-jobs/';
const MAX_BYTES = 500 * 1024 ** 2;
const MAX_FILES = 10;

const input = document.getElementById('work_input');
const drop = document.getElementById('work-drop');
const list = document.getElementById('work-files');

const files = []; // { name, url, size, type, li }
let uploading = 0;

// Same rule the API checks: plain ASCII, no spaces, ≤ 140 chars.
function cleanFilename(name) {
  let n = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|-+$/g, '');
  if (n.length > 140) {
    const ext = (n.match(/\.[A-Za-z0-9]{1,5}$/) || [''])[0];
    n = n.slice(0, 140 - ext.length) + ext;
  }
  return n || 'work';
}

const mb = (b) => (b >= 1024 ** 2 ? (b / 1024 ** 2).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

function leaving(e) { e.preventDefault(); e.returnValue = ''; }

function row(file) {
  const li = document.createElement('li');
  const name = document.createElement('span');
  name.className = 'wf-name';
  name.textContent = file.name;
  const state = document.createElement('span');
  state.className = 'wf-state';
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.textContent = 'Remove';
  li.append(name, state, rm);
  list.append(li);
  return { li, state, rm };
}

async function uploadOne(file) {
  const { li, state, rm } = row(file);
  const fail = (msg) => { li.className = 'err'; state.textContent = msg; rm.onclick = () => li.remove(); };

  if (files.length >= MAX_FILES) return fail(`Up to ${MAX_FILES} files — remove one first.`);
  if (file.size > MAX_BYTES) return fail('Over 500 MB — export a smaller version or share a link instead.');
  if (!file.size) return fail('That file is empty.');

  const entry = { name: file.name, url: null, size: file.size, type: file.type, li };
  files.push(entry);
  const controller = new AbortController();
  rm.onclick = () => { controller.abort(); files.splice(files.indexOf(entry), 1); li.remove(); };

  uploading++;
  window.addEventListener('beforeunload', leaving);
  state.textContent = 'Uploading… 0%';
  try {
    const blob = await upload(PREFIX + cleanFilename(file.name), file, {
      access: 'public',
      handleUploadUrl: '/api/enroll-upload',
      multipart: file.size > 50 * 1024 ** 2,
      abortSignal: controller.signal,
      onUploadProgress: ({ percentage }) => { state.textContent = `Uploading… ${Math.round(percentage)}%`; },
    });
    entry.url = blob.url;
    li.className = 'done';
    state.textContent = `Uploaded · ${mb(file.size)}`;
    document.getElementById('work-box').classList.remove('missing');
  } catch (err) {
    if (controller.signal.aborted) return;
    files.splice(files.indexOf(entry), 1);
    const msg = err && /not allowed|content type/i.test(err.message)
      ? "That file type isn't accepted — try a PDF, image, video, or ZIP."
      : (err && err.message) || 'The upload failed. Check your connection and try again.';
    fail(msg);
  } finally {
    uploading--;
    if (!uploading) window.removeEventListener('beforeunload', leaving);
  }
}

async function uploadFiles(list) {
  for (const f of list) await uploadOne(f);
}

input.addEventListener('change', () => { uploadFiles([...input.files]); input.value = ''; });
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => uploadFiles([...(e.dataTransfer?.files || [])]));

window.aimgWork = {
  busy: () => uploading > 0,
  files: () => files.filter((f) => f.url).map(({ name, url }) => ({ name, url })),
};
