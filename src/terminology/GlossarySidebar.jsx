import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, ArrowDownAZ, LayoutList, X } from 'lucide-react';
import { CATEGORIES, searchTerms, groupedTerms } from './glossary';

function TermRow({ t, onPick }) {
  const cat = CATEGORIES[t.category];
  return (
    <NavLink
      to={`/${t.slug}`}
      title={t.short}
      onClick={onPick}
      className={({ isActive }) => `gl-row term-${t.category}${isActive ? ' is-active' : ''}`}
      style={{ '--cat': cat.color }}
    >
      <span className="gl-dot" style={{ background: cat.color }} />
      <span className="gl-row-title">{t.title}</span>
      {t.abbr && <span className="gl-row-abbr">{t.abbr}</span>}
    </NavLink>
  );
}

export default function GlossarySidebar({ onPick }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('az'); // 'az' | 'group'

  const results = useMemo(() => searchTerms(q), [q]);
  const groups = useMemo(() => groupedTerms(results), [results]);

  return (
    <aside className="glossary-side">
      <div className="gl-search">
        <Search size={16} className="gl-search-icon" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms…"
          aria-label="Search the filmmaking glossary"
        />
        {q && <button type="button" className="gl-search-clear" onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
      </div>

      <div className="gl-controls">
        <div className="gl-sort" role="tablist" aria-label="Sort terms">
          <button type="button" role="tab" aria-selected={mode === 'az'} className={mode === 'az' ? 'is-on' : ''} onClick={() => setMode('az')}>
            <ArrowDownAZ size={14} /> A–Z
          </button>
          <button type="button" role="tab" aria-selected={mode === 'group'} className={mode === 'group' ? 'is-on' : ''} onClick={() => setMode('group')}>
            <LayoutList size={14} /> Category
          </button>
        </div>
      </div>

      <div className="gl-legend">
        <span><span className="gl-dot" style={{ background: CATEGORIES.traditional.color }} /> Traditional</span>
        <span><span className="gl-dot" style={{ background: CATEGORIES.ai.color }} /> AI</span>
      </div>

      <nav className="gl-list" aria-label="Glossary terms">
        {results.length === 0 && <p className="gl-empty">No terms match &ldquo;{q}&rdquo;.</p>}
        {mode === 'az'
          ? results.map((t) => <TermRow key={t.slug} t={t} onPick={onPick} />)
          : groups.map((g) => (
            <div key={g.group} className="gl-group">
              <p className="gl-group-h">{g.group}</p>
              {g.terms.map((t) => <TermRow key={t.slug} t={t} onPick={onPick} />)}
            </div>
          ))}
      </nav>
    </aside>
  );
}
