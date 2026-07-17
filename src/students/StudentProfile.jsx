import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Camera, Check, X, Plus, ExternalLink, Target, Flag,
  Image as ImageIcon, Link as LinkIcon, Upload, FileText, Clock, CheckCircle2, Trash2,
  MapPin, Briefcase, CalendarClock, Linkedin, TrendingUp, Users, Sparkles,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getSocialPlatform, getSocialTooltip } from '../socialPlatforms';

// ── Inline click-to-edit field (same pattern as the community ProfilePage) ──
function InlineField({ value, onSave, placeholder, isOwner, multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (!isOwner) {
    return <span className={className}>{value || <span className="text-[#1A1A1A]/30 italic">{placeholder}</span>}</span>;
  }

  if (!editing) {
    return (
      <span
        className={`${className} cursor-pointer hover:bg-[#1A1A1A]/5 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-[#1A1A1A]/10`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value || <span className="text-[#1A1A1A]/30 italic">{placeholder}</span>}
      </span>
    );
  }

  const handleSave = () => {
    setEditing(false);
    if (draft.trim() !== (value || '')) onSave(draft.trim());
  };
  const handleCancel = () => { setEditing(false); setDraft(value || ''); };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="flex items-start gap-1">
      <Tag
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-2 py-1 focus:outline-none focus:border-[#3E9E28] transition-colors w-full ${multiline ? 'h-24 resize-none' : ''}`}
      />
      <button onClick={handleSave} className="text-[#3E9E28] hover:text-[#1A1A1A] p-1 shrink-0"><Check size={16} /></button>
      <button onClick={handleCancel} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1 shrink-0"><X size={16} /></button>
    </div>
  );
}

// Labeled intake-form row: hidden from visitors when empty, editable by the owner.
function IntakeRow({ label, value, onSave, isOwner, placeholder, multiline = false, span2 = false }) {
  if (!isOwner && !value) return null;
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 block">{label}</label>
      <InlineField
        value={value}
        onSave={onSave}
        placeholder={placeholder}
        isOwner={isOwner}
        multiline={multiline}
        className="text-sm text-[#1A1A1A]/80 leading-relaxed"
      />
    </div>
  );
}

// ── Countdown to an assignment deadline ─────────────────────────────────────
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const pad = (n) => String(n).padStart(2, '0');

function Countdown({ dueAt, now }) {
  const ms = new Date(dueAt).getTime() - now;
  if (ms <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1A]/40 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 rounded-full px-3 py-1">
        <Clock size={13} /> Deadline passed
      </span>
    );
  }
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const urgent = ms < 24 * 3600000;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border tabular-nums ${
        urgent
          ? 'text-red-700 bg-red-50 border-red-200'
          : 'text-[#0F7B3F] bg-[#3E9E28]/10 border-[#3E9E28]/25'
      }`}
      title="Time left until the 1:00 PM ET deadline"
    >
      <Clock size={13} />
      {days > 0 && `${days}d `}{pad(hours)}h {pad(mins)}m {pad(secs)}s
    </span>
  );
}

// Deadlines are 1:00 PM Eastern (Atlanta) — always display them in that zone.
const formatDue = (dueAt) =>
  new Date(dueAt).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) + ' ET';

const formatAssigned = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── One homework assignment row ─────────────────────────────────────────────
function AssignmentRow({ assignment, submissions, isOwner, studentSlug, studentId, now, onChanged }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const closed = new Date(assignment.due_at).getTime() <= now;
  const mine = submissions.filter((s) => s.assignment_id === assignment.id);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { alert('Max file size is 25MB'); return; }
    setBusy(true);
    const ext = file.name.split('.').pop();
    const path = `public/${studentSlug}/homework/hw${assignment.number}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('student-uploads').upload(path, file);
    if (upErr) { alert('Upload failed: ' + upErr.message); setBusy(false); return; }
    const { data } = supabase.storage.from('student-uploads').getPublicUrl(path);
    const { error: insErr } = await supabase.from('student_submissions').insert({
      student_id: studentId,
      assignment_id: assignment.id,
      url: data.publicUrl,
      file_name: file.name,
    });
    if (insErr) alert('Could not record the submission: ' + insErr.message);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    onChanged();
  };

  const handleDelete = async (sub) => {
    if (!confirm(`Remove "${sub.file_name || 'this submission'}"?`)) return;
    const { error } = await supabase.from('student_submissions').delete().eq('id', sub.id);
    if (error) alert('Could not remove it: ' + error.message);
    onChanged();
  };

  return (
    <div className={`border rounded-xl p-4 ${closed ? 'border-[#E3E3DF] bg-[#F4F4F2]/50' : 'border-[#E3E3DF] bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#3E9E28] rounded-full px-2 py-0.5">
              Week {assignment.week_assigned}
            </span>
            <h3 className="text-base">{assignment.title}</h3>
            {mine.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F7B3F]">
                <CheckCircle2 size={14} /> Submitted
              </span>
            )}
          </div>
          {assignment.description && (
            <p className="text-sm text-[#5C5C5C] mt-1.5">{assignment.description}</p>
          )}
          <p className="text-xs text-[#1A1A1A]/50 mt-1.5">
            Assigned {formatAssigned(assignment.assigned_on)} · Due {formatDue(assignment.due_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Countdown dueAt={assignment.due_at} now={now} />
          {isOwner && !closed && (
            <>
              <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={busy} />
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn !py-1.5 !px-3.5 !text-xs">
                {busy
                  ? <span className="w-3.5 h-3.5 border-2 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                  : <Upload size={13} />}
                {mine.length > 0 ? 'Add another file' : 'Upload homework'}
              </button>
            </>
          )}
        </div>
      </div>

      {mine.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {mine.map((sub) => (
            <li key={sub.id} className="flex items-center gap-2 text-sm group/sub">
              <FileText size={15} className="text-[#3E9E28] shrink-0" />
              <a href={sub.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                {sub.file_name || 'Submission'}
              </a>
              <span className="text-xs text-[#1A1A1A]/40 shrink-0">
                {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {isOwner && !closed && (
                <button
                  onClick={() => handleDelete(sub)}
                  className="text-[#1A1A1A]/0 group-hover/sub:text-[#1A1A1A]/40 hover:!text-red-500 transition-colors shrink-0"
                  title="Remove submission"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── LinkedIn connections growth chart (weeks 1–8) ───────────────────────────
// Single-series line: forest green on white, recessive grid, dots on recorded
// weeks, a direct end-label with the latest count. Fixed 1–8 week domain so the
// timeline reads the same even before every week is filled in.
function LinkedInGrowthChart({ points }) {
  const W = 500, H = 230;
  const padL = 40, padR = 52, padT = 18, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const recorded = points.filter((p) => p.connections != null).sort((a, b) => a.week - b.week);
  const maxConn = Math.max(10, ...recorded.map((p) => p.connections));
  // A "nice" upper bound so the y-axis lands on round numbers.
  const step = Math.max(1, Math.ceil(maxConn / 4 / 10) * 10);
  const yMax = step * 4;

  const xFor = (week) => padL + ((week - 1) / 7) * plotW;
  const yFor = (conn) => padT + (1 - conn / yMax) * plotH;

  const linePath = recorded
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.week).toFixed(1)} ${yFor(p.connections).toFixed(1)}`)
    .join(' ');
  const areaPath = recorded.length > 1
    ? `${linePath} L ${xFor(recorded[recorded.length - 1].week).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(recorded[0].week).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : '';
  const last = recorded[recorded.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="LinkedIn connections by cohort week"
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="li-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3E9E28" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3E9E28" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Recessive horizontal grid + y labels */}
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (yMax / 4) * i;
        const y = yFor(v);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#E3E3DF" strokeWidth="1" />
            <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="#5C5C5C"
              fontFamily="Inter, sans-serif">{Math.round(v)}</text>
          </g>
        );
      })}

      {/* X axis: weeks 1–8 */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
        <text key={w} x={xFor(w)} y={padT + plotH + 18} textAnchor="middle" fontSize="10"
          fill="#5C5C5C" fontFamily="Inter, sans-serif">W{w}</text>
      ))}

      {areaPath && <path d={areaPath} fill="url(#li-area)" />}
      {linePath && <path d={linePath} fill="none" stroke="#0F7B3F" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />}

      {/* Data points */}
      {recorded.map((p) => (
        <circle key={p.week} cx={xFor(p.week)} cy={yFor(p.connections)} r="4"
          fill="#0F7B3F" stroke="#FFFFFF" strokeWidth="2" />
      ))}

      {/* Direct end-label with the latest count */}
      {last && (
        <text x={xFor(last.week) + 8} y={yFor(last.connections) + 3.5} fontSize="12"
          fontWeight="800" fill="#0F7B3F" fontFamily="Inter, sans-serif">
          {last.connections.toLocaleString()}
        </text>
      )}
    </svg>
  );
}

// One editable week cell in the "log your connections" strip.
function WeekCell({ week, value, isOwner, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = String(draft).trim();
    const next = trimmed === '' ? null : Math.max(0, parseInt(trimmed, 10) || 0);
    if (next !== (value ?? null)) onSave(next);
  };

  if (editing && isOwner) {
    return (
      <div className="flex flex-col items-center gap-1">
        <input
          type="number" min="0" value={draft} autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(value ?? ''); } }}
          className="w-14 text-center bg-[#F4F4F2] border border-[#3E9E28]/60 rounded px-1 py-1 text-sm focus:outline-none focus:border-[#3E9E28]"
        />
        <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40">W{week}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => isOwner && setEditing(true)}
        disabled={!isOwner}
        title={isOwner ? `Log your connection count for week ${week}` : undefined}
        className={`w-14 h-9 rounded-lg border text-sm font-semibold tabular-nums flex items-center justify-center transition-colors ${
          value != null
            ? 'bg-[#3E9E28]/10 border-[#3E9E28]/30 text-[#0F7B3F]'
            : 'bg-[#F4F4F2] border-[#E3E3DF] text-[#1A1A1A]/30'
        } ${isOwner ? 'hover:border-[#3E9E28]/60 cursor-pointer' : 'cursor-default'}`}
      >
        {value != null ? value.toLocaleString() : (isOwner ? '+' : '—')}
      </button>
      <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40">W{week}</span>
    </div>
  );
}

// A single headline stat tile.
function StatTile({ icon, label, value, accent = '#3E9E28' }) {
  return (
    <div className="rounded-xl border border-[#E3E3DF] bg-white px-4 py-3 flex-1 min-w-[120px]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-extrabold tabular-nums" style={{ color: accent, fontFamily: 'Poppins, sans-serif' }}>
        {value}
      </div>
    </div>
  );
}

// ── LinkedIn section on the profile ─────────────────────────────────────────
function LinkedInSection({ student, stats, isOwner, onSaveField, onSaveWeek }) {
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [editingPct, setEditingPct] = useState(false);
  const [pctDraft, setPctDraft] = useState(student.linkedin_ai_pct ?? '');

  const url = student.linkedin_url;
  const byWeek = new Map(stats.map((s) => [s.week, s.connections]));
  const points = [1, 2, 3, 4, 5, 6, 7, 8].map((w) => ({ week: w, connections: byWeek.has(w) ? byWeek.get(w) : null }));
  const recorded = points.filter((p) => p.connections != null);
  const latest = recorded.length ? recorded[recorded.length - 1].connections : null;
  const first = recorded.length ? recorded[0].connections : null;
  const growth = recorded.length > 1 ? latest - first : null;

  const saveUrl = () => {
    const v = urlDraft.trim();
    onSaveField('linkedin_url', v ? (v.startsWith('http') ? v : `https://${v}`) : null);
    setAddingUrl(false);
    setUrlDraft('');
  };
  const savePct = () => {
    setEditingPct(false);
    const t = String(pctDraft).trim();
    const next = t === '' ? null : Math.min(100, Math.max(0, parseInt(t, 10) || 0));
    onSaveField('linkedin_ai_pct', next);
  };

  return (
    <div className="glass-panel mb-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-sm uppercase tracking-wider flex items-center gap-2">
          <Linkedin size={16} className="text-[#0A66C2]" /> LinkedIn
        </h2>
        {url ? (
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A66C2] hover:underline">
              <ExternalLink size={13} /> View profile
            </a>
            {isOwner && (
              <button onClick={() => { setAddingUrl(true); setUrlDraft(url); }}
                className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] text-xs">Edit</button>
            )}
          </div>
        ) : isOwner && !addingUrl ? (
          <button onClick={() => setAddingUrl(true)} className="btn !py-1.5 !px-3.5 !text-xs">
            <Plus size={13} /> Add your LinkedIn
          </button>
        ) : null}
      </div>

      {addingUrl && (
        <div className="flex items-center gap-2 mb-3 mt-2">
          <input
            type="text" value={urlDraft} autoFocus
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveUrl(); if (e.key === 'Escape') { setAddingUrl(false); setUrlDraft(''); } }}
            placeholder="https://www.linkedin.com/in/your-name"
            className="flex-1 bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3E9E28]"
          />
          <button onClick={saveUrl} className="text-[#3E9E28] hover:text-[#1A1A1A] p-1"><Check size={18} /></button>
          <button onClick={() => { setAddingUrl(false); setUrlDraft(''); }} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1"><X size={18} /></button>
        </div>
      )}

      {!url && !isOwner && (
        <p className="text-sm text-[#1A1A1A]/30 italic mt-1">No LinkedIn added yet.</p>
      )}

      {url && (
        <>
          <p className="text-xs text-[#5C5C5C] mt-1 mb-4">
            Your connection growth across the eight weeks. Log your current connection count each
            week{isOwner ? ' by tapping a week below' : ''} — watch the line climb.
          </p>

          {/* Headline stats */}
          <div className="flex flex-wrap gap-3 mb-5">
            <StatTile icon={<Users size={12} />} label="Connections"
              value={latest != null ? latest.toLocaleString() : '—'} accent="#0F7B3F" />
            <StatTile icon={<TrendingUp size={12} />} label="Growth this cohort"
              value={growth != null ? `${growth >= 0 ? '+' : ''}${growth.toLocaleString()}` : '—'} accent="#3E9E28" />
            <div className="rounded-xl border border-[#E3E3DF] bg-white px-4 py-3 flex-1 min-w-[120px]">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
                <Sparkles size={12} /> % working in AI
              </div>
              {editingPct && isOwner ? (
                <div className="flex items-center gap-1">
                  <input type="number" min="0" max="100" value={pctDraft} autoFocus
                    onChange={(e) => setPctDraft(e.target.value)}
                    onBlur={savePct}
                    onKeyDown={(e) => { if (e.key === 'Enter') savePct(); if (e.key === 'Escape') { setEditingPct(false); setPctDraft(student.linkedin_ai_pct ?? ''); } }}
                    className="w-16 bg-[#F4F4F2] border border-[#3E9E28]/60 rounded px-1 py-0.5 text-xl font-extrabold focus:outline-none focus:border-[#3E9E28]" />
                  <span className="text-xl font-extrabold text-[#6FCF4B]">%</span>
                </div>
              ) : (
                <button onClick={() => isOwner && setEditingPct(true)} disabled={!isOwner}
                  title={isOwner ? 'Estimate what share of your connections work in AI' : undefined}
                  className={`text-2xl font-extrabold tabular-nums ${isOwner ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}`}
                  style={{ color: '#6FCF4B', fontFamily: 'Poppins, sans-serif' }}>
                  {student.linkedin_ai_pct != null ? `${student.linkedin_ai_pct}%` : (isOwner ? 'Set %' : '—')}
                </button>
              )}
            </div>
          </div>

          {/* Growth chart */}
          {recorded.length > 0 ? (
            <LinkedInGrowthChart points={points} />
          ) : (
            <div className="rounded-xl border border-dashed border-[#E3E3DF] bg-[#F4F4F2]/50 py-8 text-center text-sm text-[#1A1A1A]/40">
              {isOwner
                ? 'Log your first week below and your growth chart appears here.'
                : 'No connection data logged yet.'}
            </div>
          )}

          {/* Weekly logging strip */}
          <div className="mt-5">
            <label className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-2 block">
              Weekly connections
            </label>
            <div className="flex flex-wrap gap-2.5">
              {points.map((p) => (
                <WeekCell key={p.week} week={p.week} value={p.connections}
                  isOwner={isOwner} onSave={(v) => onSaveWeek(p.week, v)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── The student profile page ────────────────────────────────────────────────
export default function StudentProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const now = useNow();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [media, setMedia] = useState([]);
  const [linkedinStats, setLinkedinStats] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingMediaLink, setAddingMediaLink] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [avatarDrag, setAvatarDrag] = useState(false);
  const [mediaDrag, setMediaDrag] = useState(false);
  const avatarInputRef = useRef(null);
  const mediaInputRef = useRef(null);

  // This page is deliberately auth-free: everyone gets the edit controls
  // (see 20260719_students_public_editing.sql for what stays protected).
  const isOwner = true;

  const BASE_COLUMNS = 'id, slug, full_name, headline, bio, goal, final_project_goal, avatar_url, links, user_id, city, current_work, ai_experience, coding_experience, something_made, eight_week_goal';
  const STUDENT_COLUMNS = `${BASE_COLUMNS}, linkedin_url, linkedin_ai_pct`;
  const loadStudent = async () => {
    // Prefer the full column set. If the LinkedIn columns aren't in the DB yet
    // (migration 20260722 not applied), fall back to the base set so the page
    // still loads rather than showing "Student not found".
    let { data, error } = await supabase.from('students').select(STUDENT_COLUMNS).eq('slug', slug).maybeSingle();
    if (error) {
      ({ data } = await supabase.from('students').select(BASE_COLUMNS).eq('slug', slug).maybeSingle());
    }
    setStudent(data);
    return data;
  };

  const loadSubmissions = async (studentId) => {
    const { data } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    setSubmissions(data || []);
  };

  const loadMedia = async (studentId) => {
    const { data } = await supabase
      .from('student_media')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    setMedia(data || []);
  };

  const loadLinkedinStats = async (studentId) => {
    const { data } = await supabase
      .from('student_linkedin_stats')
      .select('week, connections')
      .eq('student_id', studentId)
      .order('week', { ascending: true });
    setLinkedinStats(data || []);
  };

  // Upsert (or clear) one week's connection count.
  const saveLinkedinWeek = async (week, value) => {
    if (value == null) {
      const { error } = await supabase
        .from('student_linkedin_stats')
        .delete()
        .eq('student_id', student.id)
        .eq('week', week);
      if (error) { alert('Could not clear that week: ' + error.message); return; }
    } else {
      const { error } = await supabase
        .from('student_linkedin_stats')
        .upsert({ student_id: student.id, week, connections: value }, { onConflict: 'student_id,week' });
      if (error) { alert('Could not save: ' + error.message); return; }
    }
    loadLinkedinStats(student.id);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: a }, s] = await Promise.all([
        supabase.from('assignments').select('*').order('number', { ascending: true }),
        loadStudent(),
      ]);
      if (cancelled) return;
      setAssignments(a || []);
      if (s) await Promise.all([loadSubmissions(s.id), loadMedia(s.id), loadLinkedinStats(s.id)]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const saveField = async (field, value) => {
    const { error } = await supabase.from('students').update({ [field]: value || null }).eq('id', student.id);
    if (!error) setStudent((prev) => ({ ...prev, [field]: value || null }));
  };

  const uploadAvatarFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max file size is 5MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Only images are supported'); return; }
    setIsUploading(true);
    const ext = file.name.split('.').pop();
    const path = `public/${student.slug}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('student-uploads').upload(path, file, { upsert: true });
    if (upErr) { alert('Upload failed: ' + upErr.message); setIsUploading(false); return; }
    const { data } = supabase.storage.from('student-uploads').getPublicUrl(path);
    await saveField('avatar_url', data.publicUrl);
    setIsUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleAvatarUpload = (e) => uploadAvatarFile(e.target.files?.[0]);

  const uploadMediaFiles = async (files) => {
    const accepted = [];
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { alert(`${file.name}: max file size is 25MB`); continue; }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name}: only images and videos are supported here — use "Add link" for everything else.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setMediaBusy(true);
    for (const file of accepted) {
      const ext = file.name.split('.').pop();
      const path = `public/${student.slug}/media/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('student-uploads').upload(path, file);
      if (upErr) { alert(`${file.name}: upload failed — ${upErr.message}`); continue; }
      const { data } = supabase.storage.from('student-uploads').getPublicUrl(path);
      const { error: insErr } = await supabase.from('student_media').insert({
        student_id: student.id,
        kind: file.type.startsWith('video/') ? 'video' : 'image',
        url: data.publicUrl,
        title: file.name,
      });
      if (insErr) alert(`${file.name}: could not save the upload — ${insErr.message}`);
    }
    setMediaBusy(false);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
    loadMedia(student.id);
  };

  const handleMediaUpload = (e) => uploadMediaFiles(Array.from(e.target.files || []));

  const addMediaLink = async () => {
    const url = newMediaUrl.trim();
    if (!url) return;
    const full = url.startsWith('http') ? url : `https://${url}`;
    const { error } = await supabase.from('student_media').insert({
      student_id: student.id, kind: 'link', url: full,
    });
    if (error) alert('Could not add the link: ' + error.message);
    setNewMediaUrl('');
    setAddingMediaLink(false);
    loadMedia(student.id);
  };

  const removeMedia = async (item) => {
    if (!confirm('Remove this from your profile?')) return;
    const { error } = await supabase.from('student_media').delete().eq('id', item.id);
    if (error) alert('Could not remove it: ' + error.message);
    loadMedia(student.id);
  };

  // Drag-and-drop plumbing for the owner's drop zones (avatar + media gallery).
  const dragHandlers = (setDragging, onFiles) => (isOwner ? {
    onDragOver: (e) => { e.preventDefault(); setDragging(true); },
    onDragLeave: (e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); },
    onDrop: (e) => { e.preventDefault(); setDragging(false); onFiles(Array.from(e.dataTransfer.files || [])); },
  } : {});

  const addProfileLink = async () => {
    if (!newLinkUrl.trim()) return;
    const current = student.links ? student.links.split(',').map((l) => l.trim()).filter(Boolean) : [];
    current.push(newLinkUrl.trim());
    await saveField('links', current.join(', '));
    setNewLinkUrl('');
    setAddingLink(false);
  };

  const removeProfileLink = async (index) => {
    const current = student.links.split(',').map((l) => l.trim()).filter(Boolean);
    current.splice(index, 1);
    await saveField('links', current.length ? current.join(', ') : '');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-[#5C5C5C]">Student not found.</p>
        <button onClick={() => navigate('/')} className="btn">All students</button>
      </div>
    );
  }

  const links = student.links ? student.links.split(',').map((l) => l.trim()).filter(Boolean) : [];
  const firstName = student.full_name?.split(' ')[0] || 'Student';
  const images = media.filter((m) => m.kind === 'image');
  const videos = media.filter((m) => m.kind === 'video');
  const mediaLinks = media.filter((m) => m.kind === 'link');

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto w-full pb-12">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors mb-4 w-fit">
          <ArrowLeft size={18} /> All students
        </button>

        {/* ── Header card (LinkedIn style: banner + overlapping avatar) ── */}
        <div className="glass-panel !p-0 overflow-hidden mb-5">
          <div className="h-28 sm:h-36 bg-gradient-to-r from-[#6FCF4B] via-[#3E9E28] to-[#0F7B3F]" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-3">
              <div className="relative group" {...dragHandlers(setAvatarDrag, (files) => uploadAvatarFile(files[0]))}>
                <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#F4F4F2] border-4 shadow-lg overflow-hidden flex items-center justify-center text-4xl font-bold text-[#3E9E28] transition-colors ${avatarDrag ? 'border-[#3E9E28] border-dashed' : 'border-white'}`}>
                  {student.avatar_url
                    ? <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
                    : (student.full_name?.[0]?.toUpperCase() || '?')}
                </div>
                {isOwner && (
                  <>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity cursor-pointer ${avatarDrag ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      title="Upload profile picture (or drag & drop an image)"
                    >
                      {isUploading
                        ? <div className="w-6 h-6 border-2 border-t-[#6FCF4B] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                        : <Camera size={24} className="text-[#6FCF4B]" />}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploading} />
                  </>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F7B3F] bg-[#3E9E28]/10 border border-[#3E9E28]/25 rounded-full px-3 py-1 mb-2">
                Summer 2026 Cohort
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl">
              <InlineField
                value={student.full_name}
                onSave={(v) => { if (v) saveField('full_name', v); }}
                placeholder="Your name"
                isOwner={isOwner}
                className="text-2xl sm:text-3xl"
              />
            </h1>
            <div className="mt-1">
              <InlineField
                value={student.headline}
                onSave={(v) => saveField('headline', v)}
                placeholder="Your headline — e.g. Designer exploring AI video"
                isOwner={isOwner}
                className="text-[#3E9E28] font-semibold"
              />
            </div>
            {(isOwner || student.city) && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-[#5C5C5C]">
                <MapPin size={14} className="text-[#3E9E28] shrink-0" />
                <InlineField
                  value={student.city}
                  onSave={(v) => saveField('city', v)}
                  placeholder="Your city"
                  isOwner={isOwner}
                  className="text-sm text-[#5C5C5C]"
                />
              </div>
            )}
            <div className="mt-2">
              <InlineField
                value={student.bio}
                onSave={(v) => saveField('bio', v)}
                placeholder={isOwner ? 'Tell people about yourself…' : ''}
                isOwner={isOwner}
                multiline
                className="text-sm text-[#5C5C5C] leading-relaxed"
              />
            </div>

            {/* Links */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40">Links</label>
                {isOwner && (
                  <button onClick={() => setAddingLink(true)} className="text-[#3E9E28] hover:text-[#1A1A1A] transition-colors" title="Add link">
                    <Plus size={16} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {links.map((link, i) => {
                  const fullUrl = link.startsWith('http') ? link : `https://${link}`;
                  const platform = getSocialPlatform(link);
                  return (
                    <div key={i} className="flex items-center gap-1 group/link">
                      <a
                        href={fullUrl} target="_blank" rel="noreferrer"
                        title={getSocialTooltip(link, firstName)}
                        className="w-8 h-8 rounded-lg bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 hover:border-[#3E9E28]/50 hover:bg-[#1A1A1A]/10 flex items-center justify-center transition-all"
                      >
                        {platform.logo
                          ? <img src={platform.logo} alt={platform.name} className="w-5 h-5" />
                          : <ExternalLink size={16} className="text-[#1A1A1A]/60" />}
                      </a>
                      {isOwner && (
                        <button onClick={() => removeProfileLink(i)} className="text-[#1A1A1A]/0 group-hover/link:text-[#1A1A1A]/40 hover:!text-red-400 transition-colors" title="Remove link">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {links.length === 0 && !addingLink && (
                  <span className="text-[#1A1A1A]/30 text-sm italic">No links yet</span>
                )}
              </div>
              {addingLink && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text" value={newLinkUrl} autoFocus
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addProfileLink(); if (e.key === 'Escape') { setAddingLink(false); setNewLinkUrl(''); } }}
                    placeholder="https://instagram.com/yourname"
                    className="flex-1 bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3E9E28] transition-colors"
                  />
                  <button onClick={addProfileLink} className="text-[#3E9E28] hover:text-[#1A1A1A] p-1"><Check size={18} /></button>
                  <button onClick={() => { setAddingLink(false); setNewLinkUrl(''); }} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1"><X size={18} /></button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── LinkedIn ── */}
        {(isOwner || student.linkedin_url) && (
          <LinkedInSection
            student={student}
            stats={linkedinStats}
            isOwner={isOwner}
            onSaveField={saveField}
            onSaveWeek={saveLinkedinWeek}
          />
        )}

        {/* ── Goals ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <div className="glass-panel">
            <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
              <Target size={16} className="text-[#3E9E28]" /> My Goal
            </h2>
            <InlineField
              value={student.goal}
              onSave={(v) => saveField('goal', v)}
              placeholder={isOwner ? 'What do you want to get out of the cohort?' : 'Not set yet'}
              isOwner={isOwner}
              multiline
              className="text-sm text-[#1A1A1A]/80 leading-relaxed"
            />
          </div>
          <div className="glass-panel">
            <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
              <CalendarClock size={16} className="text-[#3E9E28]" /> 8-Week Goal
            </h2>
            <InlineField
              value={student.eight_week_goal}
              onSave={(v) => saveField('eight_week_goal', v)}
              placeholder={isOwner ? 'Where do you want to be after eight weeks?' : 'Not set yet'}
              isOwner={isOwner}
              multiline
              className="text-sm text-[#1A1A1A]/80 leading-relaxed"
            />
          </div>
          <div className="glass-panel">
            <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
              <Flag size={16} className="text-[#0F7B3F]" /> Final Project Goal
            </h2>
            <InlineField
              value={student.final_project_goal}
              onSave={(v) => saveField('final_project_goal', v)}
              placeholder={isOwner ? 'What will you build by Week 8?' : 'Not set yet'}
              isOwner={isOwner}
              multiline
              className="text-sm text-[#1A1A1A]/80 leading-relaxed"
            />
          </div>
        </div>

        {/* ── Background (intake-form answers) ── */}
        {(isOwner || student.current_work || student.ai_experience || student.coding_experience || student.something_made) && (
          <div className="glass-panel mb-5">
            <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
              <Briefcase size={16} className="text-[#3E9E28]" /> Background
            </h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              <IntakeRow
                label="What I'm doing now"
                value={student.current_work}
                onSave={(v) => saveField('current_work', v)}
                placeholder="Job, freelance, studying, between things…"
                isOwner={isOwner}
              />
              <IntakeRow
                label="AI experience"
                value={student.ai_experience}
                onSave={(v) => saveField('ai_experience', v)}
                placeholder="How much have you used AI tools?"
                isOwner={isOwner}
              />
              <IntakeRow
                label="Coding experience"
                value={student.coding_experience}
                onSave={(v) => saveField('coding_experience', v)}
                placeholder="Never / a little / comfortable"
                isOwner={isOwner}
              />
              <IntakeRow
                label="Something I've made"
                value={student.something_made}
                onSave={(v) => saveField('something_made', v)}
                placeholder="Anything you're proud of — any medium"
                isOwner={isOwner}
                multiline
                span2
              />
            </div>
          </div>
        )}

        {/* ── Work / media gallery ── */}
        <div
          className={`glass-panel mb-5 relative transition-colors ${mediaDrag ? 'border-[#3E9E28] border-dashed bg-[#3E9E28]/5' : ''}`}
          {...dragHandlers(setMediaDrag, uploadMediaFiles)}
        >
          {mediaDrag && (
            <div className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center pointer-events-none">
              <span className="flex items-center gap-2 text-sm font-bold text-[#0F7B3F] bg-white/90 border border-[#3E9E28]/40 rounded-full px-4 py-2 shadow">
                <Upload size={16} /> Drop images or videos to add them
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={16} className="text-[#3E9E28]" /> Work &amp; Media
            </h2>
            {isOwner && (
              <div className="flex items-center gap-2">
                <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} disabled={mediaBusy} />
                <button onClick={() => mediaInputRef.current?.click()} disabled={mediaBusy} className="btn !py-1.5 !px-3.5 !text-xs">
                  {mediaBusy
                    ? <span className="w-3.5 h-3.5 border-2 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    : <Upload size={13} />}
                  Upload image / video
                </button>
                <button onClick={() => setAddingMediaLink(true)} className="btn !py-1.5 !px-3.5 !text-xs">
                  <LinkIcon size={13} /> Add link
                </button>
              </div>
            )}
          </div>

          {addingMediaLink && (
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text" value={newMediaUrl} autoFocus
                onChange={(e) => setNewMediaUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addMediaLink(); if (e.key === 'Escape') { setAddingMediaLink(false); setNewMediaUrl(''); } }}
                placeholder="https://your-project.example.com"
                className="flex-1 bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3E9E28] transition-colors"
              />
              <button onClick={addMediaLink} className="text-[#3E9E28] hover:text-[#1A1A1A] p-1"><Check size={18} /></button>
              <button onClick={() => { setAddingMediaLink(false); setNewMediaUrl(''); }} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] p-1"><X size={18} /></button>
            </div>
          )}

          {media.length === 0 ? (
            <p className="text-sm text-[#1A1A1A]/30 italic">
              {isOwner ? 'Nothing here yet — upload or drag & drop images and videos, or add links to your work.' : 'Nothing here yet.'}
            </p>
          ) : (
            <>
              {(images.length > 0 || videos.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {images.map((m) => (
                    <div key={m.id} className="relative group/media rounded-lg overflow-hidden border border-[#E3E3DF] bg-[#F4F4F2]">
                      <a href={m.url} target="_blank" rel="noreferrer">
                        <img src={m.url} alt={m.title || ''} className="w-full h-36 object-cover" loading="lazy" />
                      </a>
                      {isOwner && (
                        <button onClick={() => removeMedia(m)} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/media:opacity-100 transition-opacity" title="Remove">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {videos.map((m) => (
                    <div key={m.id} className="relative group/media rounded-lg overflow-hidden border border-[#E3E3DF] bg-black">
                      <video src={m.url} controls preload="metadata" className="w-full h-36 object-cover" />
                      {isOwner && (
                        <button onClick={() => removeMedia(m)} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/media:opacity-100 transition-opacity" title="Remove">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {mediaLinks.length > 0 && (
                <ul className="space-y-1.5">
                  {mediaLinks.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm group/media">
                      <LinkIcon size={14} className="text-[#3E9E28] shrink-0" />
                      <a href={m.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                        {m.title || m.url.replace(/^https?:\/\//, '')}
                      </a>
                      {isOwner && (
                        <button onClick={() => removeMedia(m)} className="text-[#1A1A1A]/0 group-hover/media:text-[#1A1A1A]/40 hover:!text-red-500 transition-colors shrink-0" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* ── Weekly homework ── */}
        <div className="glass-panel">
          <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
            <FileText size={16} className="text-[#3E9E28]" /> Weekly Homework
          </h2>
          <p className="text-xs text-[#5C5C5C] mb-4">
            Homework is handed out each Saturday session and due the following Saturday at 1:00 PM ET, weeks 2–8.
          </p>
          <div className="space-y-3">
            {assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                submissions={submissions}
                isOwner={isOwner}
                studentSlug={student.slug}
                studentId={student.id}
                now={now}
                onChanged={() => loadSubmissions(student.id)}
              />
            ))}
            {assignments.length === 0 && (
              <p className="text-sm text-[#1A1A1A]/30 italic">Assignments will appear here once the cohort starts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
