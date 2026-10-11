import { TermLink } from './TermLink.jsx';

// Parse inline cross-link markup — [[slug]] or [[slug|label]] — into React nodes.
// Kept out of TermLink.jsx so that file only exports a component (fast refresh).
export function parseInline(text) {
  const out = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<TermLink key={`l${i++}`} slug={m[1].trim()}>{m[2] ? m[2].trim() : null}</TermLink>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
