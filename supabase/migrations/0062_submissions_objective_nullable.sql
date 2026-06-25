-- 0062_submissions_objective_nullable
--
-- submissions.objective_id was uuid NOT NULL → objectives (the old materialized
-- table). The live submission flow (app/learn/actions.ts) never set it — a latent
-- break — and after the plan↔catalog unification the objectives table is empty, so
-- nothing valid could be referenced. Make it nullable (NON-BREAKING — this is NOT
-- a drop): submissions now record item_id only, like the live flow. The column
-- itself (and the objectives table) are dropped in gate 5c (0063).

alter table public.submissions
  alter column objective_id drop not null;

-- The before-insert trigger copied items.objective_id into submissions.objective_id.
-- Since 0061 made items.objective_id TEXT (catalog ids), that copy now casts a text
-- catalog id into the uuid column and fails EVERY submission (live + seed). Stop
-- populating the deprecated column; it still gets tenant_id + counts_toward_mastery.
create or replace function public.submissions_fill_from_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select i.tenant_id, (i.format <> 'audio')
    into new.tenant_id, new.counts_toward_mastery
  from public.items i
  where i.id = new.item_id;

  if new.tenant_id is null then
    raise exception 'item % not found', new.item_id;
  end if;
  return new;
end;
$$;
