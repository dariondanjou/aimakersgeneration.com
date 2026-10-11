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
          'Decide on your capstone project, then add its title and a short brief in the Capstone Project box on your profile',
          'Gather every material you already have for it into one folder, projects/<your-capstone-project-name>, and save all project materials there from now on',
          'Make a 1-minute film without leaving ChatGPT: use ChatGPT Desktop the whole time, and have it save your files to your local folders in a folder structure you agree with',
          'Upload the finished film to your student profile by dragging it into the This Week box',
        ],
      },
      {
        week: 2,
        session_date: '2026-10-10',
        title: 'Shot Craft, Style & the Edit',
        objective:
          "Turn a finished first film into shots that read as cinema: control the viewer's eye, kill the generic AI look with real references, stitch and cut like an editor, and push toward your capstone.",
        covered: [
          'Live critique of all five Week 1 films',
          'Controlling the eye: varying shot size, pushing in on reactions, and cutting in inserts',
          'Killing the generic AI look with a real style / colour reference (ShotDeck, Pinterest, Cosmos)',
          'Scene-stitching with first-frame / last-frame for seamless motion — clean cuts over dissolves',
          'Beating identity drift and degradation: nail step one with a clean, high-res reference',
          'Keeping shots alive: moving background extras, blinks, and sound on held beats',
          'A pro node-based workflow (Weavy): look prompts, context scaffolding, storyboards, upscaling, and finishing in DaVinci',
        ],
        homework: [
          "At least one minute of new footage toward your capstone — put the session's notes to work: vary your shots, pull a real style reference so it never reads as default AI, scene-stitch, cut clean, and keep your backgrounds alive. (Drop your stills in the WhatsApp group for a thumbs-up before you burn credits generating.)",
          'A shot-list document: pick a ~1-minute scene from a film or commercial you love, screenshot every shot in order, and describe each one — shot size, camera move, and what it does for the story. Use the Week 2 shot-list guide (a worked example) and the fill-in template on your student page.',
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
