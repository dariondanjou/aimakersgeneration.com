// The topic lists the Quiz Builder can draw from (newest first — the first
// entry is the builder's default). Each JSON has {title, description, terms:
// [{term, type, description}]}. QuizTake merges every list into one glossary
// so review-page tooltips keep working for older quizzes.
export const TERM_LISTS = [
  {
    id: 'mainstream-2026',
    label: 'Mainstream AI knowledge',
    hint: '99 evergreen terms, names, companies & concepts — incl. the women who shaped AI (Quiz #2)',
    url: '/data/ai-terms-mainstream-2026.json',
  },
  {
    id: 'july-2026',
    label: 'July 2026 AI news',
    hint: '99 terms that mattered in July 2026 news (Quiz #1)',
    url: '/data/ai-terms-july-2026.json',
  },
];

export const DEFAULT_TERM_LIST = TERM_LISTS[0];
export const termListById = (id) => TERM_LISTS.find((l) => l.id === id) || DEFAULT_TERM_LIST;
