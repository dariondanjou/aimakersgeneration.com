import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getTerm, CATEGORIES, DIAGRAMS, imageFor } from './glossary';
import { TermLink } from './TermLink.jsx';
import { parseInline } from './inline.jsx';

function Block({ b }) {
  if (b.t === 'p') return <p className="term-p">{parseInline(b.c)}</p>;
  if (b.t === 'h') return <h2 className="term-h">{b.c}</h2>;
  if (b.t === 'list') return <ul className="term-ul">{b.items.map((it, i) => <li key={i}>{parseInline(it)}</li>)}</ul>;
  if (b.t === 'note') return <div className="term-note"><span className="term-note-tag">Tip</span><span>{parseInline(b.c)}</span></div>;
  return null;
}

function HeroImage({ slug, title }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className="term-hero">
      <img src={imageFor(slug)} alt={`Illustration of ${title}`} onError={() => setOk(false)} />
    </div>
  );
}

function Figure({ dia }) {
  return (
    <figure className="term-figure">
      <div className="term-figure-svg" dangerouslySetInnerHTML={{ __html: dia.svg }} />
      {dia.caption && <figcaption>{dia.caption}</figcaption>}
    </figure>
  );
}

export default function TermPage() {
  const { slug } = useParams();
  const t = getTerm(slug);

  useEffect(() => {
    const el = document.querySelector('.glossary-main');
    if (el) el.scrollTop = 0;
    if (t) document.title = `${t.title} — Terminology — AI MAKERS GENERATION`;
  }, [slug, t]);

  if (!t) {
    return (
      <div className="term-empty">
        <p>That term isn&rsquo;t in the glossary.</p>
        <Link to="/" className="term-back"><ArrowLeft size={15} /> Back to the glossary</Link>
      </div>
    );
  }

  const cat = CATEGORIES[t.category];
  const dia = DIAGRAMS[slug];
  const related = (t.related || []).map(getTerm).filter(Boolean);

  return (
    <article className="term-page" style={{ '--cat': cat.color, '--cat-soft': cat.soft, '--cat-border': cat.border }}>
      <Link to="/" className="term-back"><ArrowLeft size={15} /> Glossary</Link>

      <div className="term-tags">
        <span className="term-cat-badge">{cat.label} filmmaking</span>
        <span className="term-group">{t.group}</span>
      </div>

      <h1 className="term-title">
        {t.title}{t.abbr ? <span className="term-abbr">{t.abbr}</span> : null}
      </h1>
      <p className="term-short">{t.short}</p>

      <HeroImage slug={t.slug} title={t.title} />
      {dia && <Figure dia={dia} />}

      <div className="term-body">
        {t.body.map((b, i) => <Block key={i} b={b} />)}
      </div>

      {related.length > 0 && (
        <div className="term-related">
          <h3 className="term-related-h">Related terms</h3>
          <div className="term-related-chips">
            {related.map((r) => <TermLink key={r.slug} slug={r.slug} />)}
          </div>
        </div>
      )}
    </article>
  );
}
