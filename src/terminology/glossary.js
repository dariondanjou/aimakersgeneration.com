// Glossary metadata, colours, grouping/sort helpers, and diagrams.
// Terms live in terms.js; this file is everything the UI needs around them.

import { TERMS } from './terms.js';

export { TERMS };

// Two families, two colours. Traditional filmmaking = smurf blue; terms that
// are specific to AI filmmaking = purple. Used for term text, dots, and badges.
export const CATEGORIES = {
  traditional: { key: 'traditional', label: 'Traditional', color: '#1E8FE0', soft: '#E9F4FD', border: '#BBDEF8' },
  ai: { key: 'ai', label: 'AI', color: '#8B5CF6', soft: '#F2ECFE', border: '#DDD0FB' },
};

export const categoryOf = (slug) => CATEGORIES[BY_SLUG.get(slug)?.category] || CATEGORIES.traditional;

// Filmmaking categories, in the order the "by category" view lists them.
export const GROUPS = [
  'Shots & Framing',
  'Camera & Lens',
  'Camera Movement',
  'Lighting',
  'Editing',
  'Sound',
  'Story & Script',
  'AI Workflow',
  'AI Models & Tools',
  'Consistency & Control',
];

export const BY_SLUG = new Map(TERMS.map((t) => [t.slug, t]));
export const getTerm = (slug) => BY_SLUG.get(slug);
export const byTitle = (a, b) => a.title.localeCompare(b.title);
export const sortedTerms = [...TERMS].sort(byTitle);

// [{ group, terms }] in GROUPS order, skipping groups with no terms.
export function groupedTerms(terms = TERMS) {
  const map = new Map();
  for (const t of terms) {
    if (!map.has(t.group)) map.set(t.group, []);
    map.get(t.group).push(t);
  }
  return GROUPS.filter((g) => map.has(g)).map((g) => ({ group: g, terms: map.get(g).sort(byTitle) }));
}

// Case-insensitive search over title, aliases, and the one-line definition.
export function searchTerms(q) {
  const s = q.trim().toLowerCase();
  if (!s) return sortedTerms;
  return sortedTerms.filter((t) =>
    t.title.toLowerCase().includes(s)
    || t.short.toLowerCase().includes(s)
    || (t.aliases || []).some((a) => a.toLowerCase().includes(s)));
}

// ── Diagrams ────────────────────────────────────────────────────────────────
// Schematic SVGs shown as a hero figure on a few highly-visual term pages.
// Keyed by slug; TermPage renders DIAGRAMS[slug] under the header when present.
const BLUE = '#1E8FE0';
const PURPLE = '#8B5CF6';
const INK = '#1A1A1A';

export const DIAGRAMS = {
  'wide-shot': {
    caption: 'The lens scale — the same subject, framed wider to tighter.',
    svg: `<svg viewBox="0 0 360 150" role="img" aria-label="Wide, medium and close-up framing of the same figure" font-family="Inter, sans-serif">
      ${[0, 125, 250].map((x, i) => {
        const label = ['WIDE (WS)', 'MEDIUM (MS)', 'CLOSE-UP (CU)'][i];
        const scale = [1, 2.1, 4.2][i];
        const cy = [60, 92, 150][i];
        return `<g transform="translate(${x},6)">
          <clipPath id="f${i}"><rect x="0" y="0" width="104" height="104" rx="6"/></clipPath>
          <rect x="0" y="0" width="104" height="104" rx="6" fill="#F4F7FA" stroke="${BLUE}" stroke-width="2"/>
          <g clip-path="url(#f${i})">
            <circle cx="52" cy="${cy}" r="${13 * scale}" fill="#CFE4F6"/>
            <rect x="${52 - 15 * scale}" y="${cy + 11 * scale}" width="${30 * scale}" height="${60 * scale}" rx="${8 * scale}" fill="#CFE4F6"/>
          </g>
          <text x="52" y="124" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}">${label}</text>
        </g>`;
      }).join('')}
    </svg>`,
  },
  'rule-of-thirds': {
    caption: 'The thirds grid — place the subject on a line or intersection, not dead centre.',
    svg: `<svg viewBox="0 0 320 190" role="img" aria-label="A frame divided into thirds with the subject on an intersection" font-family="Inter, sans-serif">
      <rect x="2" y="2" width="316" height="176" rx="6" fill="#F4F7FA" stroke="${INK}" stroke-width="2"/>
      <g stroke="${BLUE}" stroke-width="1.5" opacity="0.85">
        <line x1="107" y1="2" x2="107" y2="178"/><line x1="213" y1="2" x2="213" y2="178"/>
        <line x1="2" y1="60" x2="318" y2="60"/><line x1="2" y1="120" x2="318" y2="120"/>
      </g>
      <circle cx="213" cy="60" r="7" fill="none" stroke="${BLUE}" stroke-width="2"/>
      <circle cx="213" cy="72" r="18" fill="#CFE4F6"/>
      <circle cx="213" cy="60" r="9" fill="#CFE4F6"/>
      <text x="300" y="150" text-anchor="end" font-size="11" font-weight="700" fill="${INK}">eyes on the upper third</text>
    </svg>`,
  },
  '180-degree-rule': {
    caption: 'Keep the camera on one side of the line through the two subjects.',
    svg: `<svg viewBox="0 0 320 210" role="img" aria-label="Two subjects on an axis with cameras kept to one side of the line" font-family="Inter, sans-serif">
      <rect x="2" y="2" width="316" height="206" rx="8" fill="#F8FAFC"/>
      <rect x="2" y="110" width="316" height="98" rx="8" fill="#E9F4FD"/>
      <line x1="40" y1="105" x2="280" y2="105" stroke="${INK}" stroke-width="2" stroke-dasharray="7 6"/>
      <circle cx="90" cy="105" r="16" fill="#CFE4F6" stroke="${BLUE}" stroke-width="2"/><text x="90" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">A</text>
      <circle cx="230" cy="105" r="16" fill="#CFE4F6" stroke="${BLUE}" stroke-width="2"/><text x="230" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">B</text>
      <g fill="${BLUE}"><polygon points="150,150 174,138 174,162"/><rect x="150" y="143" width="22" height="14" rx="3"/></g>
      <g fill="${BLUE}"><polygon points="92,165 116,153 116,177"/><rect x="92" y="158" width="22" height="14" rx="3"/></g>
      <text x="160" y="200" text-anchor="middle" font-size="11" font-weight="700" fill="${BLUE}">cameras stay below the line</text>
      <g stroke="#C0352B" stroke-width="3"><line x1="150" y1="40" x2="170" y2="60"/><line x1="170" y1="40" x2="150" y2="60"/></g>
      <rect x="146" y="34" width="28" height="18" rx="3" fill="#F3C9C5"/><text x="160" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="#C0352B">don't cross</text>
    </svg>`,
  },
  'three-point-lighting': {
    caption: 'Key, fill, and back light working together to shape the subject.',
    svg: `<svg viewBox="0 0 320 210" role="img" aria-label="A subject lit by a key, fill and back light" font-family="Inter, sans-serif">
      <rect x="2" y="2" width="316" height="206" rx="8" fill="#F8FAFC"/>
      <circle cx="160" cy="120" r="30" fill="#CFE4F6" stroke="${INK}" stroke-width="2"/>
      <g font-size="11" font-weight="700">
        <g fill="#F2B01E"><circle cx="60" cy="70" r="12"/></g>
        <line x1="72" y1="80" x2="138" y2="110" stroke="#F2B01E" stroke-width="2.5" stroke-dasharray="4 4"/>
        <text x="40" y="58" fill="${INK}">Key</text>
        <g fill="#9FC4E6"><circle cx="268" cy="104" r="11"/></g>
        <line x1="257" y1="110" x2="192" y2="120" stroke="#9FC4E6" stroke-width="2.5" stroke-dasharray="4 4"/>
        <text x="250" y="90" fill="${INK}">Fill</text>
        <g fill="#C9A3F0"><circle cx="160" cy="34" r="11"/></g>
        <line x1="160" y1="45" x2="160" y2="88" stroke="#C9A3F0" stroke-width="2.5" stroke-dasharray="4 4"/>
        <text x="160" y="24" text-anchor="middle" fill="${INK}">Back / rim</text>
        <text x="160" y="190" text-anchor="middle" fill="${BLUE}">camera</text>
        <polygon points="150,172 170,172 160,160" fill="${BLUE}"/>
      </g>
    </svg>`,
  },
  'first-frame-last-frame': {
    caption: 'Supply the start and end image; the model animates the motion between.',
    svg: `<svg viewBox="0 0 340 150" role="img" aria-label="A first frame and last frame with interpolated motion between them" font-family="Inter, sans-serif">
      <g>
        <rect x="4" y="20" width="120" height="80" rx="6" fill="#F6F2FE" stroke="${PURPLE}" stroke-width="2"/>
        <circle cx="42" cy="52" r="12" fill="#DDC9F7"/><rect x="30" y="62" width="24" height="34" rx="6" fill="#DDC9F7"/>
        <text x="64" y="116" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}">first frame</text>
      </g>
      <g>
        <rect x="216" y="20" width="120" height="80" rx="6" fill="#F6F2FE" stroke="${PURPLE}" stroke-width="2"/>
        <circle cx="290" cy="48" r="18" fill="#DDC9F7"/><rect x="272" y="64" width="36" height="36" rx="7" fill="#DDC9F7"/>
        <text x="276" y="116" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}">last frame</text>
      </g>
      <g stroke="${PURPLE}" stroke-width="2" stroke-dasharray="5 5" opacity="0.6">
        <line x1="130" y1="60" x2="210" y2="60"/>
      </g>
      <polygon points="210,60 198,53 198,67" fill="${PURPLE}"/>
      <text x="170" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="${PURPLE}">interpolated motion</text>
    </svg>`,
  },
};
