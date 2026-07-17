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
  <div style={{ color: ACCENT, letterSpacing: '0.22em', fontWeight: 700, fontSize: 'clamp(11px,1.4vw,16px)', textTransform: 'uppercase', marginBottom: '2.2vh' }}>
    {children}
  </div>
) : null;

const BigTitle = ({ text, size = 'clamp(40px,7.5vw,110px)' }) => (
  <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.02, fontSize: size, textTransform: 'uppercase', margin: 0, whiteSpace: 'pre-line' }}>
    {text}
  </h1>
);

function Slide({ s }) {
  const wrap = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6vh 7vw', boxSizing: 'border-box' };
  // Generated supporting graphic (Higgsfield): content shifts left, art on the right.
  if (s.image) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.2fr 1fr' }}>
        <div style={{ minWidth: 0 }}><Slide s={{ ...s, image: undefined }} /></div>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img src={s.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0B0B0B 0%, transparent 30%)' }} />
        </div>
      </div>
    );
  }
  switch (s.layout) {
    case 'title':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} />
          {s.subtitle && <p style={{ color: '#CCCCCC', fontSize: 'clamp(16px,2.2vw,28px)', marginTop: '3vh', maxWidth: '34ch', lineHeight: 1.4 }}>{s.subtitle}</p>}
          {s.meta && <p style={{ color: '#888', fontSize: 'clamp(12px,1.5vw,18px)', marginTop: '4vh' }}>{s.meta}</p>}
        </div>
      );
    case 'agenda':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} size="clamp(30px,4.6vw,64px)" />
          <div style={{ marginTop: '4vh', display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '3vw', rowGap: '1.4vh', maxWidth: 900 }}>
            {(s.rows || []).map(([time, label], i) => (
              <div key={i} style={{ display: 'contents' }}>
                <span style={{ color: ACCENT, fontWeight: 800, fontSize: 'clamp(14px,1.9vw,24px)', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
                <span style={{ color: '#DDD', fontSize: 'clamp(14px,1.9vw,24px)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'section':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} />
          {s.subtitle && <p style={{ color: '#CCC', fontSize: 'clamp(15px,2vw,26px)', marginTop: '3.5vh', maxWidth: '46ch', lineHeight: 1.45 }}>{s.subtitle}</p>}
        </div>
      );
    case 'bullets':
      return (
        <div style={wrap}>
          <Kicker>{s.kicker}</Kicker>
          <BigTitle text={s.title} size="clamp(30px,4.6vw,64px)" />
          <ul style={{ marginTop: '4vh', display: 'flex', flexDirection: 'column', gap: '2vh', listStyle: 'none', padding: 0 }}>
            {(s.bullets || []).map((b, i) => (
              <li key={i} style={{ color: '#DDD', fontSize: 'clamp(15px,2.1vw,27px)', lineHeight: 1.4, paddingLeft: '1.4em', position: 'relative', maxWidth: '46ch' }}>
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
          <BigTitle text={s.title} size="clamp(28px,4vw,56px)" />
          <div style={{ marginTop: '4vh', display: 'grid', gridTemplateColumns: `repeat(${Math.min((s.cards || []).length, 2)}, 1fr)`, gap: '1.6vw' }}>
            {(s.cards || []).map((c, i) => (
              <div key={i} style={{ border: '1px solid #2E2E2E', borderTop: `3px solid ${ACCENT}`, background: '#141414', borderRadius: 10, padding: '2.4vh 1.6vw' }}>
                <div style={{ color: ACCENT, fontWeight: 800, letterSpacing: '0.08em', fontSize: 'clamp(13px,1.6vw,21px)', marginBottom: '1vh' }}>{c.h}</div>
                <div style={{ color: '#CCC', fontSize: 'clamp(13px,1.5vw,19px)', lineHeight: 1.45 }}>{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'homework':
      return (
        <div style={{ ...wrap, borderLeft: `10px solid ${ACCENT}` }}>
          <Kicker>{s.kicker || 'HOMEWORK'}</Kicker>
          <BigTitle text={s.title} size="clamp(32px,5vw,72px)" />
          {s.due && <p style={{ color: ACCENT, fontWeight: 700, fontSize: 'clamp(14px,1.8vw,23px)', marginTop: '1.6vh' }}>{s.due}</p>}
          <ul style={{ marginTop: '3vh', display: 'flex', flexDirection: 'column', gap: '1.8vh', listStyle: 'none', padding: 0 }}>
            {(s.bullets || []).map((b, i) => (
              <li key={i} style={{ color: '#DDD', fontSize: 'clamp(15px,2vw,25px)', lineHeight: 1.4, paddingLeft: '1.4em', position: 'relative', maxWidth: '50ch' }}>
                <span style={{ position: 'absolute', left: 0, color: ACCENT, fontWeight: 900 }}>→</span>{b}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'closing':
      return (
        <div style={{ ...wrap, alignItems: 'flex-start' }}>
          <BigTitle text={s.title} />
          {s.subtitle && <div style={{ color: ACCENT, fontFamily: 'Inter, sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.05, fontSize: 'clamp(40px,7.5vw,110px)', whiteSpace: 'pre-line' }}>{s.subtitle}</div>}
          {s.meta && <p style={{ color: '#888', fontSize: 'clamp(13px,1.7vw,20px)', marginTop: '5vh' }}>{s.meta}</p>}
        </div>
      );
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
