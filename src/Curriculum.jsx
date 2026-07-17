import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, StickyNote, X, Plus, RefreshCw, Presentation, Target,
  Clock, BookOpen, Backpack, ClipboardList, Check,
} from 'lucide-react';
import { adminHeaders } from './adminAuth';
import AdminKeyForm from './AdminKeyForm';

// The living curriculum: 8 pages, one per 3-hour session. Every line is
// inline-editable and can carry a note appended to its end; edits autosave
// (debounced) and mark the week dirty. "Regenerate…" sends only dirty weeks
// to /api/decks, which updates just the slides affected by the edits/notes,
// then folds (clears) the applied notes.

function EditableText({ value, onSave, multiline = false, className = '', placeholder = 'Click to edit' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); } }, [editing]);

  if (!editing) {
    return (
      <span
        className={`${className} cursor-text hover:bg-[#3E9E28]/5 rounded px-1 -mx-1 border border-transparent hover:border-[#3E9E28]/20 transition-colors`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value || <span className="text-[#1A1A1A]/30 italic">{placeholder}</span>}
      </span>
    );
  }
  const commit = () => { setEditing(false); if (draft !== (value || '')) onSave(draft); };
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
      }}
      className={`${className} w-full bg-[#F4F4F2] border border-[#3E9E28]/50 rounded px-2 py-1 focus:outline-none focus:border-[#3E9E28] ${multiline ? 'min-h-[72px] resize-y' : ''}`}
    />
  );
}

// One curriculum line: editable text + an optional note appended to its end.
function Line({ line, onChange, multiline = true, className = 'text-sm text-[#1A1A1A]/85 leading-relaxed' }) {
  const [addingNote, setAddingNote] = useState(false);
  return (
    <div className="group/line flex flex-wrap items-start gap-x-2 gap-y-1">
      <div className="flex-1 min-w-[240px]">
        <EditableText value={line.t} multiline={multiline} className={className} onSave={(t) => onChange({ ...line, t })} />
        {(line.n || addingNote) && (
          <span className="inline-flex items-start gap-1 ml-1 mt-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 text-xs text-amber-900 max-w-full">
            <StickyNote size={12} className="shrink-0 mt-0.5 text-amber-500" />
            <EditableText
              value={line.n}
              multiline={false}
              placeholder="type the note…"
              className="text-xs text-amber-900"
              onSave={(n) => { setAddingNote(false); onChange({ ...line, n }); }}
            />
            <button
              onClick={() => { setAddingNote(false); onChange({ ...line, n: '' }); }}
              className="text-amber-400 hover:text-amber-700 shrink-0" title="Remove note"
            ><X size={12} /></button>
          </span>
        )}
      </div>
      {!line.n && !addingNote && (
        <button
          onClick={() => setAddingNote(true)}
          className="opacity-0 group-hover/line:opacity-100 transition-opacity text-[#3E9E28] hover:text-[#0F7B3F] text-xs inline-flex items-center gap-1 shrink-0 mt-0.5"
          title="Add a note to the end of this line"
        ><StickyNote size={13} /> note</button>
      )}
    </div>
  );
}

function Section({ icon: Icon, label, children, onAddLine }) {
  return (
    <div className="glass-panel !p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider flex items-center gap-2 text-[#1A1A1A]">
          <Icon size={15} className="text-[#3E9E28]" /> {label}
        </h2>
        {onAddLine && (
          <button onClick={onAddLine} className="text-[#3E9E28] hover:text-[#0F7B3F] text-xs inline-flex items-center gap-1">
            <Plus size={13} /> add line
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function Curriculum({ session }) {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState(null);
  const [active, setActive] = useState(() => {
    const w = parseInt(new URLSearchParams(window.location.search).get('week'), 10);
    return Number.isInteger(w) && w >= 1 && w <= 8 ? w : 1;
  });
  const [needsKey, setNeedsKey] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [regen, setRegen] = useState({}); // week -> 'running' | 'done' | 'error'
  const timers = useRef({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/curriculum', { headers: adminHeaders(session) });
      const data = await res.json();
      if (res.ok) { setWeeks(data.weeks); setNeedsKey(false); setKeyError(null); return; }
      if (res.status === 401 || res.status === 403) {
        setKeyError(res.status === 403 ? 'Wrong password — try again.' : null);
        setNeedsKey(true); return;
      }
      setError(data.error || 'Something went wrong.');
    } catch { setError("Couldn't reach the server."); }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const week = weeks?.find((w) => w.week === active);

  const scheduleSave = (w) => {
    setSaveState('saving');
    clearTimeout(timers.current[w.week]);
    timers.current[w.week] = setTimeout(async () => {
      try {
        const res = await fetch('/api/curriculum', {
          method: 'PUT',
          headers: adminHeaders(session, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ week: w.week, content: w.content, title: w.title }),
        });
        setSaveState(res.ok ? 'saved' : 'idle');
        if (!res.ok) alert('Autosave failed — your last edit may not be stored.');
        setTimeout(() => setSaveState('idle'), 1500);
      } catch { setSaveState('idle'); }
    }, 700);
  };

  // Apply an updater to the active week's content; autosave + mark dirty.
  const update = (fn) => {
    setWeeks((prev) => prev.map((w) => {
      if (w.week !== active) return w;
      const content = fn(structuredClone(w.content));
      const next = { ...w, content, dirty: true };
      scheduleSave(next);
      return next;
    }));
  };
  const setTitle = (title) => {
    setWeeks((prev) => prev.map((w) => {
      if (w.week !== active) return w;
      const next = { ...w, title, dirty: true };
      scheduleSave(next);
      return next;
    }));
  };

  const regenWeek = async (weekNo) => {
    setRegen((r) => ({ ...r, [weekNo]: 'running' }));
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: adminHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ week: weekNo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setRegen((r) => ({ ...r, [weekNo]: 'done' }));
      // Server cleared dirty + folded notes — refresh that week from the server.
      await load();
    } catch (err) {
      setRegen((r) => ({ ...r, [weekNo]: 'error' }));
      alert(`Week ${weekNo} deck regeneration failed: ${err.message}`);
    }
  };

  const regenAllDirty = async () => {
    const dirty = (weeks || []).filter((w) => w.dirty).map((w) => w.week);
    if (dirty.length === 0) { alert('No edits since the last regeneration — the decks are up to date.'); return; }
    for (const w of dirty) await regenWeek(w); // sequential: each is one function call
  };

  if (needsKey) return <AdminKeyForm title="Curriculum" onUnlock={load} error={keyError} />;
  if (error) return <div className="flex-1 flex items-center justify-center text-[#5C5C5C]">{error}</div>;
  if (!weeks) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const anyRunning = Object.values(regen).includes('running');
  const dirtyCount = weeks.filter((w) => w.dirty).length;
  const c = week.content;

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft size={18} /> Admin
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#1A1A1A]/40 w-16 text-right">
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? <span className="text-[#3E9E28] inline-flex items-center gap-1"><Check size={12} /> Saved</span> : ''}
            </span>
            <button
              onClick={regenAllDirty}
              disabled={anyRunning}
              className="btn btn-primary !text-sm"
              title={dirtyCount ? `${dirtyCount} week(s) have edits` : 'No edits pending'}
            >
              <RefreshCw size={15} className={anyRunning ? 'animate-spin' : ''} />
              Regenerate curriculum slide decks with relevant updates{dirtyCount ? ` (${dirtyCount})` : ''}
            </button>
          </div>
        </div>

        <div className="text-center mb-5">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-1">Summer 2026 Cohort · Curriculum</p>
          <p className="text-xs text-[#5C5C5C]">Click any line to edit · hover a line to add a note to its end · everything autosaves · notes fold into the deck when you regenerate</p>
        </div>

        {/* Pager: one page per 3-hour session */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-6">
          {weeks.map((w) => (
            <button
              key={w.week}
              onClick={() => setActive(w.week)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors relative ${
                w.week === active ? 'bg-[#0F7B3F] text-white border-[#0F7B3F]' : 'bg-white text-[#1A1A1A] border-[#E3E3DF] hover:border-[#3E9E28]'
              }`}
            >
              Wk {w.week} · {fmtDate(w.session_date)}
              {w.dirty && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" title="Edited since last deck regeneration" />}
            </button>
          ))}
        </div>

        {/* Page header + per-page deck actions */}
        <div className="glass-panel !p-5 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[260px] flex-1">
              <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
                Session {week.week} of 8 · {fmtDate(week.session_date)} · 1:00–4:00 PM ET
              </p>
              <h1 className="text-xl sm:text-2xl">
                <EditableText value={week.title} className="text-xl sm:text-2xl font-extrabold" onSave={setTitle} />
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => regenWeek(week.week)}
                disabled={anyRunning}
                className="btn !text-xs !py-1.5 !px-3.5"
                title="Regenerate only this session's deck from this page"
              >
                <RefreshCw size={13} className={regen[week.week] === 'running' ? 'animate-spin' : ''} />
                {regen[week.week] === 'running' ? 'Regenerating…' : 'Regenerate slide deck'}
              </button>
              <Link to={`/admin/deck/${week.week}`} className="btn btn-primary !text-xs !py-1.5 !px-3.5">
                <Presentation size={13} /> Open deck
              </Link>
            </div>
          </div>
        </div>

        <Section icon={Target} label="Objective">
          <Line line={c.objective} onChange={(l) => update((cc) => { cc.objective = l; return cc; })} />
        </Section>

        <Section icon={Clock} label="Timed agenda (180 min)" onAddLine={() => update((cc) => { cc.agenda.push({ time: '', min: 10, t: '', n: '' }); return cc; })}>
          <div className="space-y-2">
            {c.agenda.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <EditableText value={row.time} multiline={false} placeholder="1:00" className="text-sm font-bold text-[#0F7B3F] w-12 tabular-nums" onSave={(time) => update((cc) => { cc.agenda[i].time = time; return cc; })} />
                <EditableText value={String(row.min)} multiline={false} placeholder="10" className="text-xs text-[#1A1A1A]/40 w-8 tabular-nums" onSave={(m) => update((cc) => { cc.agenda[i].min = parseInt(m, 10) || 0; return cc; })} />
                <div className="flex-1">
                  <Line line={row} multiline={false} onChange={(l) => update((cc) => { cc.agenda[i] = { ...cc.agenda[i], t: l.t, n: l.n }; return cc; })} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-[#1A1A1A]/40">
              Total: {c.agenda.reduce((s, r) => s + (r.min || 0), 0)} min (target 180, 10-minute increments)
            </p>
          </div>
        </Section>

        <Section icon={BookOpen} label="What exactly gets covered" onAddLine={() => update((cc) => { cc.covered.push({ t: '', n: '' }); return cc; })}>
          <div className="space-y-2.5">
            {c.covered.map((line, i) => <Line key={i} line={line} onChange={(l) => update((cc) => { cc.covered[i] = l; return cc; })} />)}
          </div>
        </Section>

        <Section icon={Backpack} label={`Homework (due Sat 1:00 PM before Session ${Math.min(week.week + 1, 8)})`} onAddLine={() => update((cc) => { cc.homework.push({ t: '', n: '' }); return cc; })}>
          <div className="space-y-2.5">
            {c.homework.map((line, i) => <Line key={i} line={line} onChange={(l) => update((cc) => { cc.homework[i] = l; return cc; })} />)}
          </div>
        </Section>

        <Section icon={ClipboardList} label="Instructor prep" onAddLine={() => update((cc) => { cc.prep.push({ t: '', n: '' }); return cc; })}>
          <div className="space-y-2.5">
            {c.prep.map((line, i) => <Line key={i} line={line} onChange={(l) => update((cc) => { cc.prep[i] = l; return cc; })} />)}
          </div>
        </Section>
      </div>
    </div>
  );
}
