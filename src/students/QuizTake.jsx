import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Check, X, RotateCcw, Trophy } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Take a published quiz. The student picks their name from the roster, then:
//  - sequential mode (no going back): one question at a time, each with its
//    own countdown bar when the quiz is timed — time out and it moves on.
//  - free-navigation mode: a number legend jumps between questions (answered
//    ones fill in green) and any countdown applies to the whole quiz.
// Every attempt — answers, per-question seconds, score, date — is stored in
// quiz_attempts; students can retake a quiz as often as they like.

const TICK_MS = 250;

// Floating tooltip for post-quiz review: hover (desktop) or tap (mobile) any
// answer option to see why it's right or wrong.
function OptionTip({ note, children }) {
  const [open, setOpen] = useState(false);
  if (!note) return children;
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      {children}
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1.5 z-30 pointer-events-none">
          <div className="bg-[#1A1A1A] text-white text-xs leading-relaxed rounded-lg px-3 py-2 shadow-lg">
            {note}
          </div>
          <div className="w-2.5 h-2.5 bg-[#1A1A1A] rotate-45 ml-5 -mt-1.5" />
        </div>
      )}
    </div>
  );
}

function TimerBar({ remaining, limit, label }) {
  const pct = Math.max(0, Math.min(100, (remaining / limit) * 100));
  const urgent = remaining <= Math.min(10, limit * 0.2);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1 text-[#1A1A1A]/50"><Clock size={12} /> {label}</span>
        <span className={`font-bold tabular-nums ${urgent ? 'text-red-600' : 'text-[#0F7B3F]'}`}>
          {Math.floor(remaining / 60)}:{String(Math.ceil(remaining % 60)).padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1A1A1A]/10 overflow-hidden">
        <div className={`h-full rounded-full transition-[width] duration-200 ${urgent ? 'bg-red-500' : 'bg-[#3E9E28]'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function QuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('start'); // start | taking | done
  const [studentName, setStudentName] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);   // [{selected, seconds}]
  const [remaining, setRemaining] = useState(0); // seconds left (question or total)
  const [timedOut, setTimedOut] = useState(false);
  const [result, setResult] = useState(null);
  const startedAt = useRef(null);
  const finishing = useRef(false);

  useEffect(() => {
    (async () => {
      const [{ data: q }, { data: roster }] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', id).maybeSingle(),
        supabase.from('students').select('id, full_name').order('sort_order').order('full_name'),
      ]);
      setQuiz(q);
      setStudents(roster || []);
      setLoading(false);
    })();
  }, [id]);

  const p = quiz?.params || {};
  const total = quiz?.questions?.length || 0;
  const perQ = p.time_per_question || 60;
  const totalTime = perQ * total;
  const timed = !!p.timed;
  const freeNav = !!p.allow_back;

  const begin = () => {
    setAnswers(Array.from({ length: total }, () => ({ selected: null, seconds: 0 })));
    setCurrent(0);
    setTimedOut(false);
    setRemaining(freeNav ? totalTime : perQ);
    startedAt.current = Date.now();
    finishing.current = false;
    setPhase('taking');
    window.scrollTo(0, 0);
  };

  const finish = (didTimeOut) => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('done');
    setTimedOut(didTimeOut);
    setAnswers((finalAnswers) => {
      const score = finalAnswers.reduce((n, a, i) => n + (a.selected === quiz.questions[i].correct ? 1 : 0), 0);
      const payload = {
        quiz_id: quiz.id,
        student_name: studentName,
        student_id: students.find((s) => s.full_name === studentName)?.id || null,
        answers: finalAnswers.map((a, i) => ({
          q: i,
          selected: a.selected,
          correct: a.selected === quiz.questions[i].correct,
          seconds: Math.round(a.seconds * 10) / 10,
        })),
        score,
        total,
        duration_seconds: Math.round((Date.now() - startedAt.current) / 100) / 10,
        timed_out: didTimeOut,
      };
      setResult({ score, total });
      supabase.from('quiz_attempts').insert(payload).then(({ error }) => {
        if (error) console.error('Could not save the attempt:', error.message);
      });
      return finalAnswers;
    });
    window.scrollTo(0, 0);
  };

  // The clock: accumulates time on the visible question and drives countdowns.
  useEffect(() => {
    if (phase !== 'taking') return;
    const t = setInterval(() => {
      setAnswers((prev) => {
        const next = [...prev];
        if (next[current]) next[current] = { ...next[current], seconds: next[current].seconds + TICK_MS / 1000 };
        return next;
      });
      if (timed) {
        setRemaining((r) => {
          const nr = r - TICK_MS / 1000;
          if (nr > 0) return nr;
          if (freeNav) {
            finish(true);           // whole-quiz clock expired
            return 0;
          }
          // per-question clock expired → advance (or finish on the last one)
          setCurrent((c) => {
            if (c + 1 >= total) { finish(true); return c; }
            return c + 1;
          });
          return perQ;
        });
      }
    }, TICK_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current, timed, freeNav, total, perQ]);

  const select = (oi) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = { ...next[current], selected: oi };
      return next;
    });
  };

  const goNext = () => {
    if (current + 1 >= total) { finish(false); return; }
    setCurrent(current + 1);
    if (timed && !freeNav) setRemaining(perQ);
  };

  const answeredCount = useMemo(() => answers.filter((a) => a.selected !== null).length, [answers]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
    </div>;
  }
  if (!quiz || quiz.status !== 'published') {
    return <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-[#5C5C5C]">Quiz not found.</p>
      <button onClick={() => navigate('/')} className="btn">All students</button>
    </div>;
  }

  const q = quiz.questions[current];

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto w-full pb-16">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors mb-4 w-fit">
          <ArrowLeft size={18} /> All students
        </button>

        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-1">Quiz #{quiz.quiz_number}</p>
          <h1 className="text-2xl uppercase">{quiz.title}</h1>
        </div>

        {/* ── START ── */}
        {phase === 'start' && (
          <div className="glass-panel">
            <p className="text-sm text-[#5C5C5C] mb-4">
              {total} questions · {timed
                ? (freeNav
                  ? `${Math.round(totalTime / 60)} minutes total, jump between questions freely`
                  : `${perQ} seconds per question, no going back`)
                : (freeNav ? 'untimed, jump between questions freely' : 'untimed, one question at a time')}.
              Results are saved under your name — you can retake it any time.
            </p>
            <label className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/50 mb-1 block">Who's taking the quiz?</label>
            <select value={studentName} onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-[#F4F4F2] border border-[#E3E3DF] rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#3E9E28]">
              <option value="">Select your name…</option>
              {students.map((s) => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
            </select>
            <button onClick={begin} disabled={!studentName} className="btn btn-primary w-full justify-center !py-3.5 disabled:opacity-50">
              Start the Quiz
            </button>
          </div>
        )}

        {/* ── TAKING ── */}
        {phase === 'taking' && q && (
          <>
            {timed && (
              <TimerBar
                remaining={remaining}
                limit={freeNav ? totalTime : perQ}
                label={freeNav ? 'Time left — whole quiz' : `Question ${current + 1} time`}
              />
            )}

            {freeNav ? (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {quiz.questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                      i === current ? 'border-[#0F7B3F] bg-[#0F7B3F] text-white'
                        : answers[i]?.selected !== null ? 'border-[#3E9E28]/40 bg-[#3E9E28]/15 text-[#0F7B3F]'
                          : 'border-[#E3E3DF] bg-white text-[#1A1A1A]/40 hover:border-[#3E9E28]/50'
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#1A1A1A]/50 mb-4">Question {current + 1} of {total}</p>
            )}

            <div className="glass-panel">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/40">{q.topic}</span>
              <p className="font-semibold text-lg mt-1 mb-4">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => select(oi)}
                    className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors ${
                      answers[current]?.selected === oi
                        ? 'border-[#3E9E28] bg-[#3E9E28]/10 font-semibold text-[#0F7B3F]'
                        : 'border-[#E3E3DF] bg-white hover:border-[#3E9E28]/50'
                    }`}>
                    <span className="font-bold mr-2 text-[#1A1A1A]/40">{String.fromCharCode(65 + oi)}.</span>{opt}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-5">
                <span className="text-xs text-[#1A1A1A]/40">{answeredCount}/{total} answered</span>
                {freeNav ? (
                  current + 1 < total
                    ? <button onClick={() => setCurrent(current + 1)} className="btn !py-2 !px-4 !text-sm">Next →</button>
                    : <button onClick={() => finish(false)} className="btn btn-primary !py-2 !px-5 !text-sm">Submit Quiz</button>
                ) : (
                  <button onClick={goNext} className="btn btn-primary !py-2 !px-5 !text-sm">
                    {current + 1 < total ? 'Next question →' : 'Finish quiz'}
                  </button>
                )}
              </div>
              {freeNav && answeredCount === total && current + 1 < total && (
                <button onClick={() => finish(false)} className="btn btn-primary w-full justify-center mt-3 !py-2.5 !text-sm">
                  All answered — Submit Quiz
                </button>
              )}
            </div>
          </>
        )}

        {/* ── RESULTS ── */}
        {phase === 'done' && result && (
          <>
            <div className="glass-panel text-center mb-6">
              <Trophy size={30} className="mx-auto text-[#3E9E28] mb-2" />
              <p className="text-4xl font-extrabold tabular-nums" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {result.score}<span className="text-[#1A1A1A]/30">/{result.total}</span>
              </p>
              <p className="text-sm text-[#5C5C5C] mt-1">
                {studentName} · {Math.round((result.score / Math.max(1, result.total)) * 100)}%
                {timedOut && <span className="text-red-600 font-semibold"> · time ran out</span>}
              </p>
              <p className="text-xs text-[#1A1A1A]/40 mt-1">Saved {new Date().toLocaleString()}</p>
              <div className="flex justify-center gap-3 mt-4 flex-wrap">
                <button onClick={begin} className="btn !py-2 !px-4 !text-sm"><RotateCcw size={14} /> Retake quiz</button>
                <button onClick={() => navigate('/')} className="btn btn-primary !py-2 !px-4 !text-sm">Back to students</button>
              </div>
            </div>

            <p className="text-xs text-[#5C5C5C] text-center mb-3">
              Hover or tap any answer choice to see why it's right — or why it's wrong.
            </p>
            <div className="space-y-3">
              {quiz.questions.map((qq, i) => {
                const a = answers[i];
                const picked = a?.selected;
                const right = picked === qq.correct;
                return (
                  <div key={i} className={`border rounded-xl p-4 bg-white ${right ? 'border-[#3E9E28]/40' : 'border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {right
                        ? <Check size={16} className="text-[#0F7B3F] mt-1 shrink-0" />
                        : <X size={16} className="text-red-500 mt-1 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">
                          Q{i + 1}. {qq.question}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/35 ml-2">{qq.topic}</span>
                        </p>
                        {picked === null && <p className="text-xs text-red-600 font-semibold mt-1">No answer given.</p>}

                        <div className="mt-2.5 space-y-1.5">
                          {qq.options.map((opt, oi) => {
                            const isCorrect = oi === qq.correct;
                            const isPicked = oi === picked;
                            return (
                              <OptionTip key={oi} note={qq.option_notes?.[oi]}>
                                <div className={`text-sm px-3 py-2 rounded-lg border flex items-start gap-2 cursor-help ${
                                  isCorrect
                                    ? 'border-[#3E9E28] bg-[#3E9E28]/10 text-[#0F7B3F] font-semibold'
                                    : isPicked
                                      ? 'border-red-300 bg-red-50 text-red-700'
                                      : 'border-[#E3E3DF] text-[#5C5C5C]'
                                }`}>
                                  {isCorrect
                                    ? <Check size={14} className="mt-0.5 shrink-0" />
                                    : isPicked
                                      ? <X size={14} className="mt-0.5 shrink-0" />
                                      : <span className="w-3.5 shrink-0" />}
                                  <span className="min-w-0">
                                    <span className="font-bold mr-1.5 opacity-50">{String.fromCharCode(65 + oi)}.</span>
                                    {opt}
                                    {isPicked && !isCorrect && <span className="text-[10px] font-bold uppercase tracking-wider ml-2">your pick</span>}
                                    {isPicked && isCorrect && <span className="text-[10px] font-bold uppercase tracking-wider ml-2">your pick ✓</span>}
                                  </span>
                                </div>
                              </OptionTip>
                            );
                          })}
                        </div>

                        {qq.explanation && (
                          <p className="text-xs text-[#5C5C5C] mt-2.5 bg-[#F4F4F2] border border-[#E3E3DF] rounded-lg px-3 py-2">
                            <span className="font-bold text-[#0F7B3F] uppercase tracking-wider text-[10px] mr-1.5">Why</span>
                            {qq.explanation}
                          </p>
                        )}
                        <p className="text-[10px] text-[#1A1A1A]/35 mt-1.5">{Math.round((a?.seconds || 0))}s on this question</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
