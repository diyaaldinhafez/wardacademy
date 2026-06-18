-- 0028_lead_book_token
--
-- A per-lead booking token so a guardian who filled the form but didn't book
-- can be given a dedicated link (/book/<token>) to pick a slot later.

alter table public.leads add column if not exists book_token text;
update public.leads set book_token = replace(gen_random_uuid()::text, '-', '') where book_token is null;
create unique index if not exists leads_book_token_idx on public.leads(book_token);
