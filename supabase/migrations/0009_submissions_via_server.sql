-- 0009_submissions_via_server
--
-- Learners must not write submissions directly: grading reads the hidden answer
-- key, so it has to happen in trusted server code (service role), otherwise a
-- learner could insert a submission already marked correct and inflate their
-- progress. We drop the learner direct-insert policy; with no INSERT policy for
-- the authenticated role, direct inserts are denied. Submissions are created by
-- the server action via the service role (which bypasses RLS); the grading
-- triggers still run. Reads (own/instructor/guardian) and instructor grading
-- updates are unchanged.

drop policy submissions_insert_learner on public.submissions;
