-- 0044_resource_files
-- Learning resources are uploaded files (PDF / Word / PowerPoint / Excel) kept
-- in a private Storage bucket. Inert reference material — stored & served only,
-- outside the generation/mastery engine.

alter table public.learning_resources add column if not exists file_path text;
alter table public.learning_resources add column if not exists file_name text;
alter table public.learning_resources add column if not exists mime_type text;
alter table public.learning_resources add column if not exists size_bytes bigint;

-- A title is no longer required (it defaults to the file name).
alter table public.learning_resources alter column title drop not null;
