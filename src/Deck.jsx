import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import { adminHeaders } from './adminAuth';
import AdminKeyForm from './AdminKeyForm';

// Full-screen presentable slide deck for one cohort session, styled after the
// AIMG workshop decks: near-black slides, chartreuse #CCFF00 accent, Inter,
// stacked ALL-CAPS titles. Navigate with ←/→/Space/click; Esc exits.
const INK = '#0B0B0B';
const ACCENT = '#CCFF00';
const FOOT = 'AI MAKERS GENERATION · Build the future. Share the knowledge.';

const Kicker = ({ children }) => children ? (
  <div style={{ color: ACCENT, letterSpacing: '0.22em', fontWeight: 700, fontSize: 'clamp(10px,1.15vw,15px)', textTransform: 'uppercase', marginBottom: '3vh' }}>
    {children}
  </div>
) : null;

const BigTitle = ({ text, size = 'clamp(44px,11.5vw,196px)' }) => (
  <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 0.98, fontSize: size, textTransform: 'uppercase', margin: 0, whiteSpace: 'pre-line' }}>
    {text}
  </h1>
);

function Slide({ s }) {
  const wrap = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6vh 7vw', boxSizing: 'border-box', overflow: 'hidden' };
  // Decks are intentionally text-only — no supporting graphics. Any legacy
  // `image` URL still sitting on a slide record is ignored, never rendered.
  switch (s.layout) {
    case 'title':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} />
          {s.subtitle && <p style={{ color: '#CCCCCC', fontSize: 'clamp(14px,1.9vw,25px)', marginTop: '3vh', maxWidth: '34ch', lineHeight: 1.4 }}>{s.subtitle}</p>}
          {s.meta && <p style={{ color: '#888', fontSize: 'clamp(11px,1.3vw,16px)', marginTop: '4vh' }}>{s.meta}</p>}
        </div>
      );
    case 'agenda': {
      // The agenda recurs through the class as a time-check. `current` (an index
      // into rows) marks where we are: that segment's dot fills in and its time
      // + label go chartreuse; every other segment stays a hollow dot with white
      // text. The opening overview omits `current`, so all dots read empty.
      const cur = Number.isInteger(s.current) ? s.current : -1;
      const dot = 'clamp(11px,1.25vw,17px)';
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} size="clamp(34px,8.2vw,128px)" />
          <div style={{ marginTop: '4.5vh', display: 'grid', gridTemplateColumns: 'auto auto 1fr', columnGap: '2.2vw', rowGap: '1.3vh', maxWidth: 980, alignItems: 'center' }}>
            {(s.rows || []).map(([time, label], i) => {
              const active = i === cur;
              return (
                <div key={i} style={{ display: 'contents' }}>
                  <span style={{ width: dot, height: dot, borderRadius: '50%', boxSizing: 'border-box', display: 'inline-block', justifySelf: 'center', border: `2px solid ${active ? ACCENT : '#5C5C5C'}`, background: active ? ACCENT : 'transparent' }} />
                  <span style={{ color: active ? ACCENT : '#7E7E7E', fontWeight: 800, fontSize: 'clamp(13px,1.7vw,22px)', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
                  <span style={{ color: active ? ACCENT : '#FFFFFF', fontWeight: active ? 700 : 400, fontSize: 'clamp(13px,1.7vw,22px)' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'section':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} />
          {s.subtitle && <p style={{ color: '#CCC', fontSize: 'clamp(14px,1.9vw,25px)', marginTop: '3.5vh', maxWidth: '46ch', lineHeight: 1.45 }}>{s.subtitle}</p>}
        </div>
      );
    case 'bullets':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} size="clamp(34px,8.2vw,128px)" />
          <ul style={{ marginTop: '5.5vh', display: 'flex', flexDirection: 'column', gap: '2vh', listStyle: 'none', padding: 0 }}>
            {(s.bullets || []).map((b, i) => (
              <li key={i} style={{ color: '#DDD', fontSize: 'clamp(14px,1.9vw,25px)', lineHeight: 1.4, paddingLeft: '1.4em', position: 'relative', maxWidth: '46ch' }}>
                <span style={{ position: 'absolute', left: 0, color: ACCENT, fontWeight: 900 }}>—</span>{b}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'cards':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} size="clamp(32px,7.4vw,112px)" />
          <div style={{ marginTop: '5.5vh', display: 'grid', gridTemplateColumns: `repeat(${Math.min((s.cards || []).length, 2)}, 1fr)`, gap: '1.6vw' }}>
            {(s.cards || []).map((c, i) => (
              <div key={i} style={{ border: '1px solid #2E2E2E', borderTop: `3px solid ${ACCENT}`, background: '#141414', borderRadius: 10, padding: '2.4vh 1.6vw' }}>
                <div style={{ color: ACCENT, fontWeight: 800, letterSpacing: '0.08em', fontSize: 'clamp(13px,1.6vw,20px)', marginBottom: '1vh' }}>{c.h}</div>
                <div style={{ color: '#CCC', fontSize: 'clamp(12px,1.4vw,18px)', lineHeight: 1.45 }}>{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'homework':
      return (
        <div style={{ ...wrap, borderLeft: `10px solid ${ACCENT}` }}>
          <Kicker>{s.kicker || 'HOMEWORK'}</Kicker>
          <BigTitle text={s.title} size="clamp(34px,8.2vw,128px)" />
          {s.due && <p style={{ color: ACCENT, fontWeight: 700, fontSize: 'clamp(13px,1.6vw,20px)', marginTop: '1.6vh' }}>{s.due}</p>}
          <ul style={{ marginTop: '3vh', display: 'flex', flexDirection: 'column', gap: '1.8vh', listStyle: 'none', padding: 0 }}>
            {(s.bullets || []).map((b, i) => (
              <li key={i} style={{ color: '#DDD', fontSize: 'clamp(14px,1.9vw,25px)', lineHeight: 1.4, paddingLeft: '1.4em', position: 'relative', maxWidth: '50ch' }}>
                <span style={{ position: 'absolute', left: 0, color: ACCENT, fontWeight: 900 }}>→</span>{b}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'closing': {
      // Title AND subtitle both render huge, and each can wrap to two lines —
      // up to four oversized lines plus meta. Cap the type on the SHORTER of
      // width/height (min(vw,vh)) so the whole send-off always fits the frame
      // instead of running off the bottom.
      const closeSize = 'clamp(36px, min(9vw, 12.5vh), 168px)';
      return (
        <div style={{ ...wrap, alignItems: 'flex-start' }}>
          <BigTitle text={s.title} size={closeSize} />
          {s.subtitle && <div style={{ color: ACCENT, fontFamily: 'Inter, sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.035em', lineHeight: 0.98, fontSize: closeSize, whiteSpace: 'pre-line' }}>{s.subtitle}</div>}
          {s.meta && <p style={{ color: '#888', fontSize: 'clamp(11px,1.3vw,16px)', marginTop: '3.5vh' }}>{s.meta}</p>}
        </div>
      );
    }
    default:
      return <div style={wrap}><BigTitle text={s.title || ''} /></div>;
  }
}

export default function Deck({ session }) {
  const { week } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [idx, setIdx] = useState(0);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [error, setError] = useState(null);
  const rootRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/decks?week=${encodeURIComponent(week)}`, { headers: adminHeaders(session) });
      const data = await res.json();
      if (res.ok) { setDeck(data); setNeedsKey(false); setKeyError(null); return; }
      if (res.status === 401 || res.status === 403) {
        setKeyError(res.status === 403 ? 'Wrong password — try again.' : null);
        setNeedsKey(true);
        return;
      }
      setError(data.error || 'Something went wrong.');
    } catch {
      setError("Couldn't reach the server.");
    }
  }, [week, session?.access_token]);

  useEffect(() => { load(); }, [load]);

  // The floating AI MAKERS BOT has no place on a projector — a body class
  // hides it (CSS in index.css), which also catches the widget injecting
  // after this page mounts. Removed when leaving the deck.
  useEffect(() => {
    document.body.classList.add('aimg-presenting');
    return () => document.body.classList.remove('aimg-presenting');
  }, []);

  const slides = deck?.slides || [];
  const next = useCallback(() => setIdx(i => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIdx(i => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape' && !document.fullscreenElement) navigate('/admin');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, navigate]);

  if (needsKey) return <AdminKeyForm title="Session Deck" onUnlock={load} error={keyError} />;
  if (error) return <div className="flex-1 flex items-center justify-center text-[#5C5C5C]">{error}</div>;
  if (!deck) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-[#3E9E28] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ position: 'fixed', inset: 0, zIndex: 100, background: INK, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* click zones */}
      <div style={{ flex: 1, position: 'relative' }} onClick={(e) => { (e.clientX > window.innerWidth / 3 ? next : prev)(); }}>
        <Slide s={slides[idx]} />
      </div>
      {/* chrome */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', color: '#666', fontSize: 12, borderTop: '1px solid #1E1E1E' }}>
        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <ArrowLeft size={14} /> Admin
        </button>
        <span style={{ letterSpacing: '0.1em' }}>{FOOT}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={prev} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
          <span style={{ color: '#CCFF00', fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {slides.length}</span>
          <button onClick={next} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          <button
            onClick={() => { document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen?.(); }}
            title="Fullscreen (present)"
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
          ><Maximize size={15} /></button>
        </span>
      </div>
    </div>
  );
}
