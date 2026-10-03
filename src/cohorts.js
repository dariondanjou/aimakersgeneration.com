// Every AIMG cohort, newest first. `id` is the value stored in the `cohort`
// column of students, assignments, quizzes, and cohort_applications.
//
// Each cohort is its own roster: students from different cohorts are never
// listed together. Feature flags switch on the sections that only make sense
// for one program (the Summer jobs cohort tracked LinkedIn growth and used the
// eight-week curriculum decks; the October film cohort does neither).
//
// `curriculum` is a fixed week-by-week outline shown on /students and on
// every profile in place of the editable Summer curriculum (`materials`).
// Each week mirrors the public outline shape: objective, covered, homework.
export const COHORTS = [
  {
    id: 'winter-2027-jobs',
    label: 'Winter 2027 Jobs Cohort',
    short: 'Winter 2027 · Jobs',
    headline: 'AI Maker — Winter 2027 Jobs Cohort',
    dates: 'January 2027 · Early registrants',
    weeks: 8,
    linkedin: true,
    materials: false,
    upcoming: true,
  },
  {
    id: 'october-2026-film',
    label: 'October 2026 Film Cohort',
    short: 'October 2026 · Film',
    headline: 'AI Filmmaker — October 2026 Film Cohort',
    dates: 'Four Saturdays · Oct 3 – 24, 2026',
    weeks: 4,
    linkedin: false,
    materials: false,
    curriculum: [
      {
        week: 1,
        session_date: '2026-10-03',
        title: 'Your Project, Film Grammar & Agentic Workflows',
        objective:
          'Commit to the one film you will finish in this cohort, learn the film grammar that makes AI footage read as cinema, and set up an agentic workflow that carries you from idea to shot list.',
        covered: [
          'Choosing your project — short film, music video, spec commercial, or series pilot — scoped so you can finish it in four weeks',
          'Logline, beat sheet, and a one-page treatment',
          'Filmmaking techniques for AI: shot sizes, lens choice, camera movement, blocking, the 180° rule, and coverage',
          'Look development: reference boards, style frames, and locking one consistent look',
          'Character and world consistency: reference sheets, image-to-video, and keeping a face the same across shots',
          'Agentic workflows: AI agents that break your script into a shot list, draft prompts, and track every asset',
          'A tour of the current toolchain — image, video, voice, and music models — and when to reach for each',
        ],
        homework: [
          'Final logline and one-page treatment for your cohort project',
          'A style-frame board that defines the look of your film',
          'An agent-built shot list plus your first five hero shots, generated and ready for critique',
        ],
      },
      {
        week: 2,
        session_date: '2026-10-10',
        title: 'Dialogue, Performance & Editing',
        objective:
          'Make your characters speak convincingly, cover a dialogue scene like a working director, and cut it into a scene that plays.',
        covered: [
          'Critique of your Week 1 hero shots and shot lists',
          'Writing dialogue that AI performances can carry — subtext, rhythm, and economy',
          'Voice design, voice cloning, and lip-sync / performance models',
          'Covering a conversation: masters, singles, shot / reverse shot, and eyelines',
          'Holding characters consistent across angles and lighting setups',
          'Editing fundamentals: assembly to rough cut, pacing, cutting on action, J- and L-cuts',
          'Sound design and music: room tone, foley, score, and temp tracks',
        ],
        homework: [
          'One complete dialogue scene from your project — voiced, lip-synced, and cut, with sound',
          'A rough assembly of your project so far',
        ],
      },
      {
        week: 3,
        session_date: '2026-10-17',
        title: 'Node-Based Workflows & the Commercial',
        objective:
          'Build repeatable node-based pipelines for consistency and scale, and apply them to the format the industry pays for most: the commercial.',
        covered: [
          'Critique of your Week 2 dialogue scenes and rough assemblies',
          'Node-based workflows (ComfyUI and node canvases): reusable graphs, control inputs, LoRAs, batching, and upscaling',
          'Product and character consistency at scale — the same bottle, the same face, every shot',
          'Anatomy of a commercial: the brief, the 15- and 30-second structure, the hook, and the end card',
          'Brand look, client feedback rounds, and delivering in every aspect ratio',
          'Color grading and finishing — the difference between footage and cinema',
        ],
        homework: [
          'A 15- or 30-second spec commercial built with a node-based workflow',
          'Picture lock on your cohort project, ready for final polish',
        ],
      },
      {
        week: 4,
        session_date: '2026-10-24',
        title: 'Final Polish & Project Presentations',
        objective:
          'Finish, present, and release: screen your film for the room and the mentors, and leave with a plan for where it goes next.',
        covered: [
          'Critique of your spec commercials',
          'Final polish: grade, mix, titles, upscaling, and delivery specs',
          'Final project presentations and screening, with feedback from the mentors',
          'Release strategy: festivals, contests, social platforms, and building your reel',
          'What comes next — the AIMG community, collaborations, and paid work',
        ],
        homework: [
          'Release your finished film and add it to your student profile',
        ],
      },
    ],
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

// The cohort the site leads with: the newest one that has started (upcoming
// cohorts only hold early registrants).
export const CURRENT_COHORT = COHORTS.find((c) => !c.upcoming).id;

export const cohortById = (id) => COHORTS.find((c) => c.id === id) || null;
