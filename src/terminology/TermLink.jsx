import { Link } from 'react-router-dom';
import { getTerm, CATEGORIES } from './glossary';

// A cross-link to another term. Coloured by the target's family (blue for
// traditional, purple for AI) and carrying a hover/focus tooltip with the
// target's one-line definition — readable without clicking through.
export function TermLink({ slug, children }) {
  const t = getTerm(slug);
  if (!t) return <span className="term-link term-missing-link">{children || slug}</span>;
  const cat = CATEGORIES[t.category];
  return (
    <span className="tt-wrap">
      <Link to={`/${slug}`} className={`term-link term-${t.category}`}>{children || t.title}</Link>
      <span className="tt-pop" role="tooltip">
        <span className="tt-head">
          <span className="tt-title" style={{ color: cat.color }}>{t.title}</span>
          <span className="tt-badge" style={{ color: cat.color, background: cat.soft, borderColor: cat.border }}>{cat.label}</span>
        </span>
        <span className="tt-def">{t.short}</span>
      </span>
    </span>
  );
}
