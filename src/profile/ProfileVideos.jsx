// "Videos" section of a member profile (src/ProfilePage.jsx).
//
// Rows live in public.profile_videos; uploaded files in the public
// `profile-videos` bucket under <user_id>/… (see
// supabase/migrations/20260929160000_profile_videos.sql). Hosted films are
// YouTube/Vimeo links embedded via the boards helpers.
//
// Uploads go straight to the Storage REST endpoint with XMLHttpRequest so we
// get a real progress bar — supabase-js's upload() has no progress callback
// and TUS would need a new dependency.
import { useState, useEffect, useRef, useCallback } from 'react';
import { Film, Upload, Link as LinkIcon, ChevronUp, ChevronDown, Trash2, Check, X, ExternalLink } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabaseClient';
import { isMissingSchema, normalizeUrl, getEmbedUrl, hostOf } from '../boards/utils';

const BUCKET = 'profile-videos';
const MAX_VIDEOS = 24;
const MAX_BYTES = 500 * 1024 * 1024;
const TITLE_MAX = 120;
const COLUMNS = 'id, user_id, title, kind, url, storage_path, mime, size_bytes, sort_order, created_at';
// Must match allowed_mime_types on the bucket.
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/ogg'];
// Some browsers/OSes report an empty type for .mov/.m4v — fall back on the extension.
const EXT_TYPES = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', ogv: 'video/ogg', ogg: 'video/ogg' };

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

function videoTypeOf(file) {
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  if (!file.type || file.type === 'application/octet-stream') return EXT_TYPES[extOf(file.name)] || null;
  return null;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

function titleFromFile(name) {
  return (name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, TITLE_MAX) || null;
}

function friendlyVideoError(error) {
  if (!error) return '';
  const msg = error.message || String(error);
  const status = Number(error.statusCode || error.status || 0);
  if (isMissingSchema(error)) return 'Video uploads are being set up — check back soon.';
  if (status === 413 || /maximum allowed size|payload too large|too large/i.test(msg)) {
    return 'That file is larger than uploads currently allow. Try a smaller export, or add it as a YouTube/Vimeo link.';
  }
  if (status === 415 || /mime type|not supported/i.test(msg)) {
    return 'That video format isn\'t supported — use MP4, MOV, WebM or M4V.';
  }
  if (/up to 24 videos/i.test(msg)) return `You can have up to ${MAX_VIDEOS} videos on your profile.`;
  if (status === 403 || error.code === '42501' || error.code === 'not_permitted'
      || /row-level security|permission denied|unauthorized/i.test(msg)) {
    return "You don't have permission to do that here.";
  }
  if (error.code === '23514') return 'That title is too long or the link is invalid.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Network hiccup — check your connection and try again.';
  return msg || 'Something went wrong — please try again.';
}

const NOT_PERMITTED = { code: 'not_permitted', message: 'not permitted' };

// Standard (non-resumable) Storage upload with progress events.
function uploadWithProgress({ path, file, contentType, token, onProgress, signalRef }) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${encoded}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve({ error: null }); return; }
      let body = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* not JSON */ }
      resolve({ error: { statusCode: Number(body.statusCode) || xhr.status, message: body.message || body.error || `Upload failed (${xhr.status})` } });
    };
    xhr.onerror = () => resolve({ error: { message: 'Network error' } });
    xhr.onabort = () => resolve({ error: { message: 'Upload cancelled' }, aborted: true });
    if (signalRef) signalRef.current = xhr;
    xhr.send(file);
  });
}

function VideoTitle({ value, isOwner, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  if (!isOwner) {
    return value ? <p className="text-sm text-[#1A1A1A] font-semibold truncate" title={value}>{value}</p> : null;
  }

  if (!editing) {
    return (
      <p
        className="text-sm text-[#1A1A1A] font-semibold truncate cursor-pointer hover:bg-[#1A1A1A]/5 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-[#1A1A1A]/10"
        onClick={() => { setDraft(value || ''); setEditing(true); }}
        title="Click to edit title"
      >
        {value || <span className="text-[#1A1A1A]/30 italic font-normal">Add a title</span>}
      </p>
    );
  }

  const save = () => {
    setEditing(false);
    const next = draft.trim().slice(0, TITLE_MAX);
    if (next !== (value || '')) onSave(next);
  };
  const cancel = () => { setEditing(false); setDraft(value || ''); };

  return (
    <div className="flex items-center gap-1">
      <input
        value={draft}
        autoFocus
        maxLength={TITLE_MAX}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        placeholder="Video title"
        className="text-sm bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-2 py-1 focus:outline-none focus:border-[#3E9E28] transition-colors w-full"
      />
      <button onClick={save} className="text-[#3E9E28] hover:text-[#1A1A1A] p-1 shrink-0" title="Save"><Check size={14} /></button>
      <button onClick={cancel} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1 shrink-0" title="Cancel"><X size={14} /></button>
    </div>
  );
}

function VideoPlayer({ video }) {
  if (video.kind === 'upload') {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(video.storage_path);
    return (
      <video
        src={data.publicUrl}
        controls
        preload="metadata"
        playsInline
        className="w-full aspect-video bg-black object-contain"
      />
    );
  }
  const embed = getEmbedUrl(video.url);
  if (embed) {
    return (
      <iframe
        src={embed}
        title={video.title || 'Video'}
        className="w-full aspect-video bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full aspect-video bg-[#F4F4F2] flex flex-col items-center justify-center gap-2 text-sm text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
    >
      <ExternalLink size={20} /> {hostOf(video.url)}
    </a>
  );
}

export default function ProfileVideos({ userId, session }) {
  const isOwner = !!userId && session?.user?.id === userId;
  const [videos, setVideos] = useState([]);
  // `loaded.forId` is the profile the status applies to, so switching profiles
  // reads as "loading" without a synchronous setState in the effect.
  const [loaded, setLoaded] = useState({ forId: null, status: 'loading', error: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState([]); // { key, name, progress, error }
  const [dragging, setDragging] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const fileInputRef = useRef(null);

  const status = loaded.forId === userId ? loaded.status : 'loading'; // loading | ready | missing | error

  const queryVideos = useCallback(() => supabase
    .from('profile_videos')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true }), [userId]);

  const applyResult = useCallback(({ data, error }) => {
    if (error) {
      setLoaded({ forId: userId, status: isMissingSchema(error) ? 'missing' : 'error', error: friendlyVideoError(error) });
      return;
    }
    setVideos(data || []);
    setLoaded({ forId: userId, status: 'ready', error: '' });
  }, [userId]);

  const reload = () => queryVideos().then(applyResult);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    queryVideos().then((result) => { if (!cancelled) applyResult(result); });
    return () => { cancelled = true; };
  }, [userId, queryVideos, applyResult]);

  // Admins get a moderation delete on other members' videos.
  useEffect(() => {
    if (isOwner || !session) return undefined;
    let cancelled = false;
    supabase.rpc('is_admin').then(({ data }) => { if (!cancelled) setIsAdmin(data === true); });
    return () => { cancelled = true; };
  }, [isOwner, session]);

  const nextSortOrder = (list) => list.reduce((m, v) => Math.max(m, v.sort_order ?? 0), -1) + 1;

  const updateUpload = (key, patch) =>
    setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  const uploadFiles = async (files) => {
    if (!isOwner || status !== 'ready') return;
    setNotice('');
    const problems = [];
    const accepted = [];
    let room = MAX_VIDEOS - videos.length - uploads.filter((u) => !u.error && u.progress < 1).length;
    for (const file of files) {
      const type = videoTypeOf(file);
      if (!type) { problems.push(`${file.name}: only MP4, MOV, WebM or M4V videos can be uploaded.`); continue; }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: ${formatSize(file.size)} is over the 500 MB limit — add it as a YouTube/Vimeo link instead.`);
        continue;
      }
      if (room <= 0) { problems.push(`${file.name}: you can have up to ${MAX_VIDEOS} videos on your profile.`); continue; }
      room -= 1;
      accepted.push({ file, type });
    }
    if (problems.length) setNotice(problems.join('\n'));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (accepted.length === 0) return;

    const jobs = accepted.map(({ file, type }) => ({
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      type,
    }));
    setUploads((prev) => [...prev, ...jobs.map((j) => ({ key: j.key, name: j.file.name, progress: 0, error: '' }))]);

    // One at a time: keeps bandwidth on the current file and the cap honest.
    let order = nextSortOrder(videos);
    for (const job of jobs) {
      const ext = extOf(job.file.name) || 'mp4';
      const path = `${userId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      // Fresh token per file: a queue of big uploads can outlive one access token.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { updateUpload(job.key, { error: 'Please sign in again to upload videos.' }); continue; }
      const { error: upErr } = await uploadWithProgress({
        path, file: job.file, contentType: job.type, token,
        onProgress: (p) => updateUpload(job.key, { progress: Math.min(p, 0.99) }),
      });
      if (upErr) { updateUpload(job.key, { error: friendlyVideoError(upErr) }); continue; }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data: row, error: insErr } = await supabase
        .from('profile_videos')
        .insert({
          user_id: userId,
          kind: 'upload',
          url: pub.publicUrl,
          storage_path: path,
          mime: job.type,
          size_bytes: job.file.size,
          title: titleFromFile(job.file.name),
          sort_order: order,
        })
        .select(COLUMNS)
        .single();
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphan file
        updateUpload(job.key, { error: `Could not save the video — ${friendlyVideoError(insErr)}` });
        continue;
      }
      order += 1;
      setVideos((prev) => [...prev, row]);
      setUploads((prev) => prev.filter((u) => u.key !== job.key));
    }
  };

  const addLink = async () => {
    if (!isOwner) return;
    setLinkError('');
    const url = normalizeUrl(newLinkUrl);
    if (!url || !getEmbedUrl(url)) {
      setLinkError('Paste a YouTube or Vimeo video link, e.g. https://youtu.be/… or https://vimeo.com/…');
      return;
    }
    if (videos.length >= MAX_VIDEOS) { setLinkError(`You can have up to ${MAX_VIDEOS} videos on your profile.`); return; }
    const { data: row, error } = await supabase
      .from('profile_videos')
      .insert({ user_id: userId, kind: 'link', url, sort_order: nextSortOrder(videos) })
      .select(COLUMNS)
      .single();
    if (error) { setLinkError(friendlyVideoError(error)); return; }
    setVideos((prev) => [...prev, row]);
    setNewLinkUrl('');
    setAddingLink(false);
  };

  const saveTitle = async (video, title) => {
    const { data, error } = await supabase
      .from('profile_videos').update({ title: title || null }).eq('id', video.id).select('id');
    if (error || !data?.length) { setNotice('Could not save the title: ' + friendlyVideoError(error || NOT_PERMITTED)); return; }
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, title: title || null } : v)));
  };

  const removeVideo = async (video) => {
    if (!confirm(isOwner ? 'Remove this video from your profile?' : 'Remove this video from the member\'s profile?')) return;
    setBusyId(video.id);
    const { data, error } = await supabase.from('profile_videos').delete().eq('id', video.id).select('id');
    if (error || !data?.length) {
      setBusyId(null);
      setNotice('Could not remove it: ' + friendlyVideoError(error || NOT_PERMITTED));
      return;
    }
    if (video.kind === 'upload' && video.storage_path) {
      // Row is gone either way; a leftover file is harmless and invisible.
      await supabase.storage.from(BUCKET).remove([video.storage_path]);
    }
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    setBusyId(null);
  };

  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= videos.length) return;
    const reordered = [...videos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const renumbered = reordered.map((v, i) => ({ ...v, sort_order: i }));
    const changed = renumbered.filter((v, i) => reordered[i].sort_order !== i);
    const previous = videos;
    setVideos(renumbered);
    const results = await Promise.all(changed.map((v) =>
      supabase.from('profile_videos').update({ sort_order: v.sort_order }).eq('id', v.id).select('id')));
    const failed = results.find((r) => r.error || !r.data?.length);
    if (failed) {
      setVideos(previous);
      setNotice('Could not reorder: ' + friendlyVideoError(failed.error || NOT_PERMITTED));
      reload();
    }
  };

  const dropHandlers = isOwner && status === 'ready' ? {
    onDragOver: (e) => { e.preventDefault(); setDragging(true); },
    onDragLeave: (e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); },
    onDrop: (e) => { e.preventDefault(); setDragging(false); uploadFiles(Array.from(e.dataTransfer.files || [])); },
  } : {};

  // ── Visibility rules ──────────────────────────────────────────────────────
  if (!userId || status === 'loading') return null;
  if (!isOwner && (status !== 'ready' || videos.length === 0)) return null;

  const heading = (
    <h2 className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 flex items-center gap-2">
      <Film size={14} className="text-[#3E9E28]" /> Videos
      {isOwner && status === 'ready' && <span className="normal-case tracking-normal">({videos.length}/{MAX_VIDEOS})</span>}
    </h2>
  );

  if (status === 'missing' || status === 'error') {
    return (
      <div className="glass-panel p-6 mt-6">
        {heading}
        <p className="text-sm text-[#1A1A1A]/50 italic mt-3">
          {status === 'missing' ? 'Video uploads are being set up — check back soon.' : loaded.error}
        </p>
      </div>
    );
  }

  const canModerate = isOwner || isAdmin;
  const full = videos.length >= MAX_VIDEOS;

  return (
    <div
      className={`glass-panel p-6 mt-6 transition-colors ${dragging ? 'ring-2 ring-[#3E9E28] bg-[#3E9E28]/5' : ''}`}
      {...dropHandlers}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        {heading}
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={full}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#3E9E28] hover:text-[#1A1A1A] border border-[#3E9E28]/40 hover:border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload size={14} /> Upload video
            </button>
            <button
              onClick={() => { setAddingLink(true); setLinkError(''); }}
              disabled={full}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#3E9E28] hover:text-[#1A1A1A] border border-[#3E9E28]/40 hover:border-[#1A1A1A]/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LinkIcon size={14} /> Add YouTube/Vimeo link
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={[...ALLOWED_TYPES, '.mp4', '.mov', '.webm', '.m4v'].join(',')}
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(Array.from(e.target.files || []))}
            />
          </div>
        )}
      </div>

      {isOwner && addingLink && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLinkUrl}
              autoFocus
              onChange={(e) => setNewLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') { setAddingLink(false); setNewLinkUrl(''); setLinkError(''); } }}
              placeholder="https://youtu.be/… or https://vimeo.com/…"
              className="flex-1 bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#3E9E28] transition-colors"
            />
            <button onClick={addLink} className="text-[#3E9E28] hover:text-[#1A1A1A] p-1" title="Add"><Check size={18} /></button>
            <button onClick={() => { setAddingLink(false); setNewLinkUrl(''); setLinkError(''); }} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1" title="Cancel"><X size={18} /></button>
          </div>
          {linkError && <p className="text-xs text-red-500 mt-1.5">{linkError}</p>}
        </div>
      )}

      {isOwner && notice && (
        <div className="mb-4 flex items-start gap-2 text-xs text-red-500 whitespace-pre-line">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] shrink-0" title="Dismiss"><X size={14} /></button>
        </div>
      )}

      {isOwner && uploads.length > 0 && (
        <ul className="space-y-2 mb-4">
          {uploads.map((u) => (
            <li key={u.key} className="text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="truncate text-[#1A1A1A]/70">{u.name}</span>
                {u.error ? (
                  <button onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] shrink-0" title="Dismiss"><X size={14} /></button>
                ) : (
                  <span className="text-[#1A1A1A]/50 shrink-0">{Math.round(u.progress * 100)}%</span>
                )}
              </div>
              {u.error ? (
                <p className="text-red-500">{u.error}</p>
              ) : (
                <div className="h-1.5 rounded-full bg-[#1A1A1A]/10 overflow-hidden">
                  <div className="h-full bg-[#3E9E28] transition-[width] duration-200" style={{ width: `${Math.max(2, u.progress * 100)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {videos.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-[#1A1A1A]/15 hover:border-[#3E9E28]/50 rounded-lg py-10 px-4 text-sm text-[#1A1A1A]/40 transition-colors"
        >
          No videos yet — upload or drag & drop MP4, MOV or WebM files (up to 500 MB each),
          or add a YouTube/Vimeo link for longer films.
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {videos.map((v, i) => (
            <div key={v.id} className={`rounded-lg overflow-hidden border border-[#1A1A1A]/10 bg-white/40 ${busyId === v.id ? 'opacity-50' : ''}`}>
              <VideoPlayer video={v} />
              {(v.title || canModerate) && (
                <div className="p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <VideoTitle value={v.title} isOwner={isOwner} onSave={(t) => saveTitle(v, t)} />
                  </div>
                  {isOwner && (
                    <>
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] disabled:opacity-20 disabled:cursor-not-allowed p-0.5" title="Move up"><ChevronUp size={16} /></button>
                      <button onClick={() => move(i, 1)} disabled={i === videos.length - 1} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] disabled:opacity-20 disabled:cursor-not-allowed p-0.5" title="Move down"><ChevronDown size={16} /></button>
                    </>
                  )}
                  {canModerate && (
                    <button onClick={() => removeVideo(v)} disabled={busyId === v.id} className="text-[#1A1A1A]/40 hover:text-red-500 transition-colors p-0.5" title={isOwner ? 'Remove video' : 'Remove video (admin)'}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && videos.length > 0 && !full && (
        <p className="text-[11px] text-[#1A1A1A]/30 mt-3">Drag & drop videos here to upload (MP4, MOV, WebM, M4V — up to 500 MB each).</p>
      )}
    </div>
  );
}
