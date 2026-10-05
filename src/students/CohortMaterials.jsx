import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Target, Backpack, ChevronDown, Presentation, Layers, Play, Eye, Download, Film } from 'lucide-react';
import { cohortById } from '../cohorts';

// The cohort's course materials, shown to students on /students and on every
// student profile: the 8-week curriculum outline (objective / covered /
// homework per session, from /api/curriculum?public=1) and every session's
// slide deck (from /api/decks?public=1). All decks stay open — past weeks
// included — so a student can go back and re-read any session's slides.
//
// The outline and decks belong to the Summer 2026 program, so the section is
// cohort-gated: pass `cohort` (an id from src/cohorts.js) and it renders only
// when that cohort has `materials: true`. A cohort with a fixed `curriculum`
// outline in src/cohorts.js (the October film cohort) shows that instead,
// without decks. No cohort → nothing.

const fmtDate = (d) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
const fmtShort = (d) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const todayKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

// Loads the outline and deck list once; both are public, unauthenticated GETs.
function useCohortMaterials() {
  const [weeks, setWeeks] = useState(null);
  const [decks, setDecks] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/curriculum?public=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setWeeks(data?.weeks || []); })
      .catch(() => { if (!cancelled) setWeeks([]); });
    fetch('/api/decks?public=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setDecks(data?.decks || []); })
      .catch(() => { if (!cancelled) setDecks([]); });
    return () => { cancelled = true; };
  }, []);

  return { weeks, decks, loading: weeks === null || decks === null };
}

// Past / Today / Upcoming, from the session date. "Latest" marks the most
// recent past session — the deck a student most likely wants right now.
function statusFor(sessionDate, latestPastWeek, week) {
  const today = todayKey();
  if (!sessionDate) return null;
  if (sessionDate === today) return { label: 'Today', tone: 'live' };
  if (sessionDate < today) return week === latestPastWeek ? { label: 'Latest', tone: 'latest' } : { label: 'Past', tone: 'past' };
  return { label: 'Upcoming', tone: 'upcoming' };
}

const TONE = {
  live: 'bg-[#CCFF00] text-[#0B0B0B]',
  latest: 'bg-[#3E9E28] text-white',
  past: 'bg-white/10 text-white/70',
  upcoming: 'bg-white/10 text-white/50',
};

// One dark "slide" card per week, linking into the read-only deck viewer.
export function DecksGrid({ decks, compact = false }) {
  if (!decks || decks.length === 0) return null;
  const today = todayKey();
  const latestPastWeek = decks
    .filter((d) => d.session_date && d.session_date < today && d.slide_count > 0)
    .reduce((m, d) => Math.max(m, d.week), 0) || null;

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
      {decks.map((d) => {
        const ready = d.slide_count > 0;
        const st = statusFor(d.session_date, latestPastWeek, d.week);
        const inner = (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#CCFF00] whitespace-nowrap truncate">
                Wk {d.week}{d.session_date ? ` · ${fmtShort(d.session_date)}` : ''}
              </span>
              {st && (
                <span className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-px shrink-0 ${TONE[st.tone]}`}>{st.label}</span>
              )}
            </div>
            <p className={`font-extrabold uppercase leading-tight tracking-tight text-white ${compact ? 'text-xs' : 'text-sm'} line-clamp-3`} style={{ fontFamily: 'Inter, sans-serif' }}>
              {d.title}
            </p>
            <p className={`mt-auto pt-3 text-[11px] flex items-center gap-1.5 ${ready ? 'text-[#CCFF00]' : 'text-white/40 italic'}`}>
              <Presentation size={12} />
              {ready ? `${d.slide_count} slides · Open →` : 'Deck coming soon'}
            </p>
          </>
        );
        const cls = `flex flex-col rounded-xl border p-3.5 min-h-[112px] transition-all ${ready
          ? 'bg-[#0B0B0B] border-[#2E2E2E] hover:border-[#CCFF00] hover:-translate-y-0.5 hover:shadow-lg'
          : 'bg-[#1A1A1A] border-[#2E2E2E] opacity-70'}`;
        return ready
          ? <Link key={d.week} to={`/deck/${d.week}`} className={cls} title={`Open the Week ${d.week} slide deck`}>{inner}</Link>
          : <div key={d.week} className={cls}>{inner}</div>;
      })}
    </div>
  );
}

// The week-by-week outline as a tap-to-expand list. Each session that has a
// deck gets an "Open slide deck" button inside its panel; `showDecks={false}`
// drops the deck row entirely (cohorts without slide decks).
export function CurriculumAccordion({ weeks, decks, showDecks = true }) {
  const [open, setOpen] = useState(null);
  if (!weeks || weeks.length === 0) return null;
  const deckByWeek = new Map((decks || []).map((d) => [d.week, d]));

  return (
    <div className="space-y-3">
      {weeks.map((w) => {
        const isOpen = open === w.week;
        const deck = deckByWeek.get(w.week);
        const hasDeck = (deck?.slide_count || 0) > 0;
        return (
          <div key={w.week} className="glass-panel !p-0 overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : w.week)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#3E9E28]/5 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="text-xs font-bold text-[#0F7B3F] tabular-nums shrink-0 w-28">
                Wk {w.week} · {fmtDate(w.session_date)}
              </span>
              <span className="flex-1 font-semibold text-sm sm:text-base">{w.title}</span>
              {hasDeck && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0F7B3F] shrink-0" title="Slide deck available">
                  <Presentation size={12} /> Slides
                </span>
              )}
              <ChevronDown size={16} className={`shrink-0 text-[#1A1A1A]/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 space-y-4">
                {w.objective && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 flex items-center gap-1.5">
                      <Target size={12} className="text-[#3E9E28]" /> Objective
                    </p>
                    <p className="text-sm text-[#1A1A1A]/85 leading-relaxed">{w.objective}</p>
                  </div>
                )}
                {w.covered.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-[#3E9E28]" /> What gets covered
                    </p>
                    <ul className="space-y-1.5">
                      {w.covered.map((t, i) => (
                        <li key={i} className="text-sm text-[#1A1A1A]/85 leading-relaxed flex gap-2">
                          <span className="text-[#3E9E28] font-bold shrink-0">—</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {w.homework.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-1 flex items-center gap-1.5">
                      <Backpack size={12} className="text-[#3E9E28]" /> Homework
                    </p>
                    <ul className="space-y-1.5">
                      {w.homework.map((t, i) => (
                        <li key={i} className="text-sm text-[#1A1A1A]/85 leading-relaxed flex gap-2">
                          <span className="text-[#3E9E28] font-bold shrink-0">—</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {showDecks && <div className="pt-1">
                  {hasDeck ? (
                    <Link to={`/deck/${w.week}`} className="btn btn-primary !text-xs !py-1.5 !px-3.5 inline-flex items-center gap-1.5">
                      <Presentation size={13} /> Open the Week {w.week} slide deck ({deck.slide_count} slides)
                    </Link>
                  ) : (
                    <span className="text-xs text-[#1A1A1A]/40 italic inline-flex items-center gap-1.5">
                      <Presentation size={13} /> Slide deck coming soon
                    </span>
                  )}
                </div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The whole section: header, deck grid, then the outline. `variant="page"` is
// the centered /students layout; `variant="profile"` sits inside a profile's
// glass panel and stays compact.
export default function CohortMaterialsSection({ cohort, variant = 'page' }) {
  const c = cohortById(cohort);
  if (c?.curriculum) return <FixedCurriculumBody cohort={c} variant={variant} />;
  if (!c?.materials) return null;
  return <CohortMaterialsBody variant={variant} />;
}

// This week's homework for a cohort with a fixed outline: the latest session
// that has started, due at the start (1:00 PM ET) of the next one.
export function HomeworkCallout({ cohort }) {
  const weeks = cohortById(cohort)?.curriculum;
  if (!weeks) return null;
  const today = todayKey();
  const started = weeks.filter((w) => w.session_date <= today);
  const current = started[started.length - 1];
  if (!current?.homework?.length) return null;
  const next = weeks.find((w) => w.week === current.week + 1);

  return (
    <div className="glass-panel max-w-3xl mx-auto mb-10 !border-[#3E9E28]/50 text-left">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h2 className="text-sm uppercase tracking-wider flex items-center gap-2">
          <Backpack size={16} className="text-[#3E9E28]" /> This Week's Homework · Week {current.week}
        </h2>
        {next && (
          <span className="text-xs font-semibold text-[#0F7B3F]">
            Due {fmtDate(next.session_date)} · 1:00 PM ET
          </span>
        )}
      </div>
      <ul className="list-disc pl-5 space-y-1.5 marker:text-[#3E9E28]">
        {current.homework.map((t, i) => (
          <li key={i} className="text-sm text-[#1A1A1A]/85 leading-relaxed">{t}</li>
        ))}
      </ul>
      <p className="text-xs text-[#5C5C5C] mt-4">
        <strong>How to turn it in:</strong> log in, open your own card below, and drag &amp; drop your files into the
        This Week box on your profile.
      </p>
    </div>
  );
}

// Week-by-week session materials (recordings, PDFs) for a cohort with a fixed
// outline: big thumbnail cards, each viewable in the browser or downloadable.
// Videos play inline when the thumbnail is clicked. A resource whose url isn't
// an http(s) or site path yet is skipped.
const isLive = (url) => /^(https?:\/\/|\/)/.test(url || '');
// Vercel Blob serves a file as an attachment with ?download=1 (a cross-origin
// <a download> is ignored); same-origin files use the download attribute.
const downloadHref = (url) => (/^https?:\/\//.test(url) ? `${url}${url.includes('?') ? '&' : '?'}download=1` : url);

function ResourceCard({ r, hero = false }) {
  const [playing, setPlaying] = useState(false);
  const isVideo = r.kind === 'video';
  const btn = 'btn !text-xs !py-2 !px-4 inline-flex items-center gap-1.5';

  const thumb = (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0B0B0B] group">
      <img src={r.thumb} alt="" loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      {isVideo && <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className={`rounded-full bg-[#CCFF00] text-[#0B0B0B] flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 ${hero ? 'w-20 h-20' : 'w-14 h-14'} ${isVideo ? '' : 'opacity-0 group-hover:opacity-100'}`}>
          {isVideo ? <Play size={hero ? 34 : 24} className="ml-1" fill="currentColor" /> : <Eye size={22} />}
        </span>
      </span>
    </div>
  );

  return (
    <div className="glass-panel !p-3 sm:!p-4 flex flex-col">
      {isVideo && playing ? (
        <video src={r.url} poster={r.thumb} controls autoPlay playsInline preload="metadata"
          className="w-full aspect-video rounded-xl bg-black" />
      ) : isVideo ? (
        <button type="button" onClick={() => setPlaying(true)} className="block w-full" title={`Play ${r.title}`}>{thumb}</button>
      ) : (
        <a href={r.url} target="_blank" rel="noopener" className="block" title={`Open ${r.title}`}>{thumb}</a>
      )}
      <div className="px-1 pt-4 pb-1 flex flex-col gap-2 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3E9E28]">{r.meta}</p>
        <h3 className={`uppercase leading-tight ${hero ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}>{r.title}</h3>
        <p className="text-sm text-[#5C5C5C] leading-relaxed mb-1">{r.description}</p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {isVideo ? (
            <button type="button" onClick={() => setPlaying(true)} className={`${btn} btn-primary`}>
              <Play size={13} /> Play in browser
            </button>
          ) : (
            <a href={r.url} target="_blank" rel="noopener" className={`${btn} btn-primary`}>
              <Eye size={13} /> View in browser
            </a>
          )}
          <a href={downloadHref(r.url)} download className={btn}>
            <Download size={13} /> Download
          </a>
        </div>
      </div>
    </div>
  );
}

export function SessionResources({ cohort }) {
  const weeks = (cohortById(cohort)?.curriculum || [])
    .map((w) => ({ ...w, resources: (w.resources || []).filter((r) => isLive(r.url)) }))
    .filter((w) => w.resources.length > 0);
  if (weeks.length === 0) return null;

  return (
    <div id="materials" className="max-w-5xl mx-auto w-full pb-16 scroll-mt-24">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <Film size={16} /> Session Recordings &amp; Materials
        </p>
        <h2 className="text-2xl sm:text-3xl uppercase">Watch, Read, Download</h2>
        <p className="text-[#5C5C5C] mt-3 max-w-xl mx-auto text-sm">
          Every session's recording and handouts, kept here all cohort. Play or read them in your browser, or download them to keep.
        </p>
      </div>
      {weeks.map((w) => {
        const [first, ...rest] = w.resources;
        const heroFirst = first.kind === 'video';
        return (
          <div key={w.week} className="mb-10">
            <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-3 flex items-center gap-1.5">
              <Layers size={12} className="text-[#3E9E28]" /> Week {w.week} · {fmtDate(w.session_date)} · {w.title}
            </p>
            {heroFirst && <div className="mb-5"><ResourceCard r={first} hero /></div>}
            <div className="grid gap-5 sm:grid-cols-2">
              {(heroFirst ? rest : w.resources).map((r) => <ResourceCard key={r.url} r={r} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const NUMBER_WORDS =['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

// A cohort with a fixed outline in src/cohorts.js (no decks, no editor).
function FixedCurriculumBody({ cohort, variant }) {
  const weeks = cohort.curriculum;
  const count = NUMBER_WORDS[weeks.length] || String(weeks.length);

  if (variant === 'profile') {
    return (
      <div id="curriculum" className="glass-panel mb-5">
        <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
          <Layers size={16} className="text-[#3E9E28]" /> Curriculum
        </h2>
        <p className="text-xs text-[#5C5C5C] mb-4">
          {count} sessions, one project. Tap a week for what we cover and what's due.
        </p>
        <CurriculumAccordion weeks={weeks} showDecks={false} />
      </div>
    );
  }

  return (
    <div id="curriculum" className="max-w-3xl mx-auto w-full pb-16 scroll-mt-24">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <BookOpen size={16} /> The Curriculum
        </p>
        <h2 className="text-2xl sm:text-3xl uppercase">{count} Sessions</h2>
        <p className="text-[#5C5C5C] mt-3 max-w-xl mx-auto text-sm">
          Saturdays 1:00–4:00 PM ET at RICE, Atlanta. Fast-paced and hands-on: you pick one project in Week 1 and
          present the finished film in Week {weeks.length}. Tap a week to see what we cover.
        </p>
      </div>
      <CurriculumAccordion weeks={weeks} showDecks={false} />
    </div>
  );
}

function CohortMaterialsBody({ variant }) {
  const { weeks, decks, loading } = useCohortMaterials();
  if (loading) return null;
  if ((!weeks || weeks.length === 0) && (!decks || decks.length === 0)) return null;
  const readyCount = (decks || []).filter((d) => d.slide_count > 0).length;

  if (variant === 'profile') {
    return (
      <div id="curriculum" className="glass-panel mb-5">
        <h2 className="text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
          <Layers size={16} className="text-[#3E9E28]" /> Curriculum &amp; Slide Decks
        </h2>
        <p className="text-xs text-[#5C5C5C] mb-4">
          Every session's slides stay here for the whole cohort — go back to any past week whenever you need it.
          {readyCount > 0 ? ` ${readyCount} of ${decks.length} decks published.` : ''}
        </p>
        <DecksGrid decks={decks} compact />
        <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mt-6 mb-2 flex items-center gap-1.5">
          <BookOpen size={12} className="text-[#3E9E28]" /> The eight sessions — tap a week for what we cover
        </p>
        <CurriculumAccordion weeks={weeks} decks={decks} />
      </div>
    );
  }

  return (
    <div id="curriculum" className="max-w-3xl mx-auto w-full pb-16 scroll-mt-24">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#3E9E28] mb-2 flex items-center justify-center gap-2">
          <BookOpen size={16} /> The Curriculum &amp; Slide Decks
        </p>
        <h2 className="text-2xl sm:text-3xl uppercase">Eight Sessions</h2>
        <p className="text-[#5C5C5C] mt-3 max-w-xl mx-auto text-sm">
          Saturdays 1:00–4:00 PM ET at RICE, Atlanta. Open any week's slide deck — past sessions stay up all cohort —
          and tap a week to see what we cover.
        </p>
      </div>
      {decks && decks.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 mb-2 flex items-center gap-1.5">
            <Presentation size={12} className="text-[#3E9E28]" /> Slide decks{readyCount > 0 ? ` · ${readyCount} of ${decks.length} published` : ''}
          </p>
          <DecksGrid decks={decks} />
        </div>
      )}
      <CurriculumAccordion weeks={weeks} decks={decks} />
    </div>
  );
}
