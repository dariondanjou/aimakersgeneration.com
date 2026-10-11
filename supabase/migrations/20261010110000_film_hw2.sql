-- October 2026 Film Cohort, Week 2 homework (Oct 10, 2026).
--
-- The Week 2 assignment row (cohort='october-2026-film', number=2) was seeded
-- as a placeholder in 20260929100000_separate_cohorts.sql, with the right dates
-- (assigned 2026-10-10, due 2026-10-17 13:00 ET). Give it its real title and
-- brief now that Session 2 is done. The description is what /api/scan-homework
-- checks each uploaded file against, so it names both deliverables — the
-- capstone-footage video and the shot-list document — so either one verifies.
-- Mirrors 20261004100000_capstone_and_film_hw1.sql. Safe to re-run.

UPDATE public.assignments
   SET title = 'Capstone Footage + a Shot-List Breakdown',
       description =
         'Two items, both due at the start of Session 3. '
         || '(1) At least one minute of new footage toward your capstone project — put this week''s notes to work: '
         || 'vary your shots, pull a real style reference so it never reads as default AI, scene-stitch for seamless motion, '
         || 'cut clean (no dissolves), and keep your backgrounds alive. Drop your stills in the WhatsApp group for a thumbs-up '
         || 'before you spend credits generating. '
         || '(2) A shot-list document: pick a one-minute scene from a film or commercial you love, screenshot every shot in '
         || 'order, and describe each one — shot size, camera movement, and what it is doing for the story — following the '
         || 'Week 2 guide and template on your student page. '
         || 'Turn both in by dragging the video and the shot-list document into the This Week box on your profile.'
 WHERE cohort = 'october-2026-film' AND number = 2;
