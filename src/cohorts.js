// Every AIMG cohort, newest first. `id` is the value stored in the `cohort`
// column of students, assignments, quizzes, and cohort_applications.
//
// Each cohort is its own roster: students from different cohorts are never
// listed together. Feature flags switch on the sections that only make sense
// for one program (the Summer jobs cohort tracked LinkedIn growth and used the
// eight-week curriculum decks; the October film cohort does neither).
export const COHORTS = [
  {
    id: 'october-2026-film',
    label: 'October 2026 Film Cohort',
    short: 'October 2026 · Film',
    headline: 'AI Filmmaker — October 2026 Film Cohort',
    dates: 'Four Saturdays · Oct 3 – 24, 2026',
    weeks: 4,
    linkedin: false,
    materials: false,
  },
  {
    id: 'summer-2026',
    label: 'Summer 2026 Jobs Cohort',
    short: 'Summer 2026 · Jobs',
    headline: 'AI Maker — Summer 2026 Cohort',
    dates: 'Eight Saturdays · Jul 18 – Sep 5, 2026',
    weeks: 8,
    linkedin: true,
    materials: true,
  },
];

// The cohort the site leads with (newest).
export const CURRENT_COHORT = COHORTS[0].id;

export const cohortById = (id) => COHORTS.find((c) => c.id === id) || null;
