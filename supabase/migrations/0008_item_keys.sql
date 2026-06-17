-- 0008_item_keys
--
-- Security fix: the correct answer / explanation / rubric must NOT be readable
-- by learners. They lived inside items.content, which learners can read for
-- approved items — leaking the answer. Move them into a separate item_keys
-- table that only instructors (and the service role) can read. items.content
-- keeps only student-facing data (e.g. options).

create table public.item_keys (
  item_id     uuid primary key references public.items(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  answer      jsonb,
  explanation text,
  rubric      text
);

create index item_keys_tenant_id_idx on public.item_keys(tenant_id);

comment on table public.item_keys is
  'Answer key (answer/explanation/rubric) for an item. Instructor + service role only — never learners.';

-- Migrate existing data out of items.content.
insert into public.item_keys (item_id, tenant_id, answer, explanation, rubric)
select id,
       tenant_id,
       content -> 'answer',
       nullif(content ->> 'explanation', ''),
       nullif(content ->> 'rubric', '')
from public.items;

update public.items
set content = (content - 'answer') - 'explanation' - 'rubric';

alter table public.item_keys enable row level security;

-- Instructors in the tenant read/manage keys; learners & guardians get nothing.
create policy item_keys_select_instructor on public.item_keys
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy item_keys_modify_instructor on public.item_keys
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.item_keys to authenticated;
grant select, insert, update, delete on public.item_keys to service_role;
