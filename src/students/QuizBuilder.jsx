import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Check, RefreshCw, Send, MessageSquare, FileText, ListChecks, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TERM_LISTS, DEFAULT_TERM_LIST, termListById } from './termLists';

// Quiz builder: pick a topic list (monthly news or mainstream AI knowledge),
// check topics, set parameters, generate a multiple-choice quiz with AI,
// review it question by question (keep / update-with-comment / replace),
// regenerate until happy, publish. Drafts persist server-side, so you can
// leave and come back to review one before it goes live. Published quizzes
// appear at the bottom of /students under QUIZZES, numbered in order.

const TAG_STYLES = {
  keep: 'bg-[#3E9E28]/10 border-[#3E9E28]/40 text-[#0F7B3F]',
  update: 'bg-amber-50 border-amber-400 text-amber-700',
  replace: 'bg-red-50 border-red-300 text-red-600',
};

function ParamSlider({ label, value, onChange, min, max, step, format }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/50">{label}</label>
        <span className="text-sm font-bold text-[#0F7B3F] tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-[#3E9E28]"
      />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-10 h-6 rounded-full transition-colors shrink-0 relative ${checked ? 'bg-[#3E9E28]' : 'bg-[#1A1A1A]/20'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <span>
        <span className="text-sm font-semibold block">{label}</span>
        {hint && <span className="text-xs text-[#5C5C5C] block">{hint}</span>}
      </span>
    </label>
  );
}

export default function QuizBuilder() {
  const navigate = useNavigate();
  const [listId, setListId] = useState(DEFAULT_TERM_LIST.id);
  const [terms, setTerms] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [drafts, setDrafts] = useState([]);
  const [params, setParams] = useState({ question_count: 20, timed: true, time_per_question: 60, allow_back: false });
  const [phase, setPhase] = useState('setup'); // setup | review | published
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null); // {quiz_id, params, questions}
  const [tags, setTags] = useState({});   // {index: {tag, comment}}
  const [title, setTitle] = useState('');
  const [publishedNumber, setPublishedNumber] = useState(null);

  // Load the chosen topic list (switching lists clears the selection).
  useEffect(() => {
    let cancelled = false;
    setTerms([]);
    setSelected(new Set());
    fetch(termListById(listId).url)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setTerms(j.terms || []); })
      .catch(() => { if (!cancelled) setError('Could not load the topics list.'); });
    return () => { cancelled = true; };
  }, [listId]);

  // Unpublished drafts (newest first) so a quiz can be reviewed later.
  const loadDrafts = () => supabase
    .from('quizzes')
    .select('id, created_at, topics, params, questions')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(8)
    .then(({ data }) => setDrafts(data || []));
  useEffect(() => { loadDrafts(); }, []);

  const discardDraft = async (d) => {
    if (!confirm('Discard this draft? It will disappear from the review list.')) return;
    const j = await callApi({ action: 'discard', quiz_id: d.id });
    if (j) loadDrafts();
  };

  const openDraft = (d) => {
    setQuiz({ quiz_id: d.id, params: d.params, questions: d.questions });
    setTags({});
    setTitle('');
    setPhase('review');
    window.scrollTo(0, 0);
  };

  const toggleTerm = (term) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  };

  const callApi = async (body) => {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      return j;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    const topics = terms.filter((t) => selected.has(t.term)).map((t) => ({ term: t.term, description: t.description }));
    const j = await callApi({ action: 'generate', topics, params: { ...params, term_list: listId } });
    if (j) { setQuiz(j); setTags({}); setPhase('review'); window.scrollTo(0, 0); loadDrafts(); }
  };

  const regenerate = async () => {
    const directives = Object.entries(tags)
      .filter(([, v]) => v.tag !== 'keep')
      .map(([i, v]) => ({ index: parseInt(i, 10), tag: v.tag, comment: v.comment || '' }));
    const j = await callApi({ action: 'regenerate', quiz_id: quiz.quiz_id, directives });
    if (j) { setQuiz(j); setTags({}); window.scrollTo(0, 0); }
  };

  const publish = async () => {
    const j = await callApi({ action: 'publish', quiz_id: quiz.quiz_id, title: title.trim() || undefined });
    if (j) { setPublishedNumber(j.quiz_number); setPhase('published'); window.scrollTo(0, 0); loadDrafts(); }
  };

  const setTag = (i, tag) => setTags((prev) => {
    const cur = prev[i] || {};
    if (tag === 'keep') { const next = { ...prev }; delete next[i]; return next; }
    return { ...prev, [i]: { ...cur, tag } };
  });
  const setComment = (i, comment) => setTags((prev) => ({ ...prev, [i]: { ...(prev[i] || { tag: 'update' }), comment } }));

  const flaggedCount = Object.keys(tags).length;

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto w-full pb-16">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors mb-4 w-fit">
          <ArrowLeft size={18} /> All students
        </button>

        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
            <Sparkles size={16} /> Quiz Builder
          </p>
          <h1 className="text-3xl uppercase">
            {phase === 'setup' && 'Build a Quiz'}
            {phase === 'review' && 'Review the Quiz'}
            {phase === 'published' && `Quiz #${publishedNumber} Published`}
          </h1>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <>
            {drafts.length > 0 && (
              <div className="glass-panel mb-5 !border-amber-300">
                <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
                  <FileText size={15} className="text-amber-500" /> Drafts waiting for review
                </h2>
                <p className="text-xs text-[#5C5C5C] mb-3">Generated but not published yet. Open one to check or update its questions, then publish.</p>
                <ul className="space-y-2">
                  {drafts.map((d) => {
                    const listLabel = TERM_LISTS.find((l) => l.id === d.params?.term_list)?.label;
                    return (
                      <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E3DF] bg-white px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {(d.questions || []).length} questions · {(d.topics || []).length} topics{listLabel ? ` · ${listLabel}` : ''}
                          </p>
                          <p className="text-[11px] text-[#1A1A1A]/40">
                            Generated {new Date(d.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            {d.params?.timed ? ` · ${d.params.time_per_question}s/question` : ' · untimed'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => openDraft(d)} className="btn !py-1.5 !px-3.5 !text-xs">
                            <ListChecks size={13} /> Review
                          </button>
                          <button onClick={() => discardDraft(d)} disabled={busy} title="Discard this draft"
                            className="p-1.5 rounded-full text-[#1A1A1A]/35 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="glass-panel mb-5">
              <h2 className="text-sm uppercase tracking-wider mb-1">Topic list</h2>
              <p className="text-xs text-[#5C5C5C] mb-3">Which 99-term list should the quiz draw from?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {TERM_LISTS.map((l) => (
                  <button key={l.id} type="button" onClick={() => setListId(l.id)}
                    className={`text-left rounded-xl border px-4 py-3 transition-colors ${listId === l.id ? 'border-[#3E9E28] bg-[#3E9E28]/10' : 'border-[#E3E3DF] bg-white hover:border-[#3E9E28]/50'}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${listId === l.id ? 'border-[#3E9E28] bg-[#3E9E28]' : 'border-[#1A1A1A]/25'}`}>
                        {listId === l.id && <Check size={10} className="text-white" strokeWidth={3} />}
                      </span>
                      {l.label}
                    </span>
                    <span className="text-xs text-[#5C5C5C] block mt-1 pl-6">{l.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel mb-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="text-sm uppercase tracking-wider">Topics ({selected.size} selected)</h2>
                <div className="flex gap-3 text-xs font-semibold">
                  <button className="text-[#3E9E28] hover:underline" onClick={() => setSelected(new Set(terms.map((t) => t.term)))}>Select all</button>
                  <button className="text-[#1A1A1A]/40 hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
                </div>
              </div>
              <p className="text-xs text-[#5C5C5C] mb-4">Check every topic the quiz can draw questions from.</p>
              <div className="space-y-1 max-h-[26rem] overflow-y-auto custom-scrollbar pr-2">
                {terms.map((t) => (
                  <label key={t.term} className={`flex items-start gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${selected.has(t.term) ? 'bg-[#3E9E28]/10' : 'hover:bg-[#1A1A1A]/5'}`}>
                    <input type="checkbox" checked={selected.has(t.term)} onChange={() => toggleTerm(t.term)} className="mt-1 accent-[#3E9E28]" />
                    <span>
                      <span className="text-sm font-semibold">{t.term}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 ml-2">{t.type}</span>
                      <span className="text-xs text-[#5C5C5C] block">{t.description}</span>
                    </span>
                  </label>
                ))}
                {terms.length === 0 && <p className="text-sm text-[#1A1A1A]/40 italic">Loading topics…</p>}
              </div>
            </div>

            <div className="glass-panel mb-5">
              <h2 className="text-sm uppercase tracking-wider mb-4">Parameters</h2>
              <div className="space-y-5">
                <ParamSlider label="Number of questions" value={params.question_count} min={5} max={30} step={1}
                  onChange={(v) => setParams((p) => ({ ...p, question_count: v }))} format={(v) => `${v} questions`} />
                <Toggle label="Timed quiz" hint="A countdown runs while students answer."
                  checked={params.timed} onChange={(v) => setParams((p) => ({ ...p, timed: v }))} />
                {params.timed && (
                  <ParamSlider label="Time per question" value={params.time_per_question} min={15} max={120} step={5}
                    onChange={(v) => setParams((p) => ({ ...p, time_per_question: v }))}
                    format={(v) => (v < 60 ? `${v}s` : `${Math.floor(v / 60)}m ${v % 60 ? (v % 60) + 's' : ''}`)} />
                )}
                <Toggle label="Allow going back to previous questions"
                  hint={params.timed
                    ? 'With free navigation, the timer becomes one countdown for the whole quiz (time per question × question count).'
                    : 'Students can jump between questions using the number legend.'}
                  checked={params.allow_back} onChange={(v) => setParams((p) => ({ ...p, allow_back: v }))} />
                {params.timed && (
                  <p className="text-xs text-[#5C5C5C] bg-[#F4F4F2] border border-[#E3E3DF] rounded-lg px-3 py-2">
                    {params.allow_back
                      ? `Total quiz time: ${Math.round((params.time_per_question * params.question_count) / 60)} minutes for ${params.question_count} questions.`
                      : `Each question gets its own ${params.time_per_question}-second countdown; when it runs out the quiz moves on.`}
                  </p>
                )}
              </div>
            </div>

            <button onClick={generate} disabled={busy || selected.size === 0} className="btn btn-primary w-full !py-4 justify-center disabled:opacity-50">
              {busy
                ? <><span className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" /> Generating {params.question_count} questions…</>
                : <><Sparkles size={16} /> Generate Quiz</>}
            </button>
            {selected.size === 0 && <p className="text-center text-xs text-[#1A1A1A]/40 mt-2">Select at least one topic to generate.</p>}
          </>
        )}

        {/* ── REVIEW ── */}
        {phase === 'review' && quiz && (
          <>
            <p className="text-sm text-[#5C5C5C] text-center mb-6">
              Tag any question you want changed — <strong>Update</strong> (with an optional comment on how) or <strong>Replace</strong> (brand-new question).
              Untagged questions are kept as-is when you regenerate.
            </p>
            <div className="space-y-4 mb-8">
              {quiz.questions.map((q, i) => {
                const t = tags[i]?.tag || 'keep';
                return (
                  <div key={i} className={`border rounded-xl p-4 bg-white transition-colors ${t === 'keep' ? 'border-[#E3E3DF]' : t === 'update' ? 'border-amber-400' : 'border-red-300'}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/40">Q{i + 1} · {q.topic}</span>
                        <p className="font-semibold mt-1">{q.question}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {['keep', 'update', 'replace'].map((tag) => (
                          <button key={tag} onClick={() => setTag(i, tag)}
                            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${t === tag ? TAG_STYLES[tag] : 'border-[#E3E3DF] text-[#1A1A1A]/40 hover:border-[#1A1A1A]/30'}`}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {q.options.map((opt, oi) => (
                        <li key={oi} title={q.option_notes?.[oi] || undefined}
                          className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${oi === q.correct ? 'bg-[#3E9E28]/10 text-[#0F7B3F] font-semibold' : 'text-[#5C5C5C]'} ${q.option_notes?.[oi] ? 'cursor-help' : ''}`}>
                          {oi === q.correct ? <Check size={14} className="shrink-0" /> : <span className="w-3.5 shrink-0" />}
                          {opt}
                        </li>
                      ))}
                    </ul>
                    {q.explanation && <p className="text-xs text-[#1A1A1A]/50 mt-2 italic">{q.explanation}</p>}
                    {t === 'update' && (
                      <div className="mt-3 flex items-start gap-2">
                        <MessageSquare size={14} className="text-amber-500 mt-2 shrink-0" />
                        <textarea
                          value={tags[i]?.comment || ''}
                          onChange={(e) => setComment(i, e.target.value)}
                          placeholder="How should this question change? (optional — leave blank for a general improvement)"
                          className="flex-1 bg-[#F4F4F2] border border-amber-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="glass-panel">
              <label className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/50 mb-1 block">Quiz title (optional)</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Defaults to “Quiz #N”"
                className="w-full bg-[#F4F4F2] border border-[#E3E3DF] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#3E9E28]" />
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={regenerate} disabled={busy} className="btn flex-1 justify-center disabled:opacity-50">
                  {busy
                    ? <span className="w-4 h-4 border-2 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    : <RefreshCw size={15} />}
                  Regenerate Quiz{flaggedCount > 0 ? ` (${flaggedCount} tagged)` : ''}
                </button>
                <button onClick={publish} disabled={busy} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
                  <Send size={15} /> Publish Quiz
                </button>
              </div>
              <p className="text-xs text-[#5C5C5C] mt-3 text-center">
                Regenerate keeps untagged questions untouched. Publish posts it to the students page as the next numbered quiz.
              </p>
            </div>
          </>
        )}

        {/* ── PUBLISHED ── */}
        {phase === 'published' && (
          <div className="glass-panel text-center py-10">
            <div className="w-14 h-14 rounded-full bg-[#0F7B3F] text-white flex items-center justify-center mx-auto mb-4"><Check size={28} /></div>
            <h2 className="text-xl mb-2">Quiz #{publishedNumber} is live</h2>
            <p className="text-sm text-[#5C5C5C] mb-6">It's now listed under QUIZZES at the bottom of the students page, right after the earlier quizzes.</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button onClick={() => navigate('/')} className="btn">See it on the students page</button>
              <button onClick={() => { setPhase('setup'); setQuiz(null); setSelected(new Set()); setTitle(''); }} className="btn btn-primary">
                <Sparkles size={15} /> Build another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
