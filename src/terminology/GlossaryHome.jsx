import { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { TERMS, CATEGORIES, groupedTerms } from './glossary';
import { TermLink } from './TermLink';

export default function GlossaryHome() {
  useEffect(() => { document.title = 'Filmmaking Terminology — AI MAKERS GENERATION'; }, []);
  const groups = groupedTerms(TERMS);
  const nTrad = TERMS.filter((t) => t.category === 'traditional').length;
  const nAi = TERMS.filter((t) => t.category === 'ai').length;

  return (
    <div className="gl-home">
      <p className="gl-eyebrow"><BookOpen size={15} /> Terminology · Filmmaking</p>
      <h1 className="gl-home-title">The Filmmaking Glossary</h1>
      <p className="gl-home-lead">
        The language of film — the craft that is 100&nbsp;years old and the AI techniques that build on it, in one
        place. Every term links to the others, so you can follow a thread from a classic idea to its AI counterpart.
        Hover any coloured term to read its definition; click to open its page.
      </p>

      <div className="gl-home-legend">
        <div className="gl-home-legend-card" style={{ '--cat': CATEGORIES.traditional.color, background: CATEGORIES.traditional.soft, borderColor: CATEGORIES.traditional.border }}>
          <span className="gl-dot" style={{ background: CATEGORIES.traditional.color }} />
          <strong style={{ color: CATEGORIES.traditional.color }}>Traditional</strong>
          <span>{nTrad} terms · the enduring craft of filmmaking</span>
        </div>
        <div className="gl-home-legend-card" style={{ '--cat': CATEGORIES.ai.color, background: CATEGORIES.ai.soft, borderColor: CATEGORIES.ai.border }}>
          <span className="gl-dot" style={{ background: CATEGORIES.ai.color }} />
          <strong style={{ color: CATEGORIES.ai.color }}>AI</strong>
          <span>{nAi} terms · specific to AI filmmaking</span>
        </div>
      </div>

      <div className="gl-home-groups">
        {groups.map((g) => (
          <section key={g.group} className="gl-home-group">
            <h2 className="gl-home-group-h">{g.group}</h2>
            <div className="gl-home-chips">
              {g.terms.map((t) => <TermLink key={t.slug} slug={t.slug} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
