-- trigger objective_assessments_after
CREATE TRIGGER objective_assessments_after AFTER INSERT ON public.objective_assessments FOR EACH ROW EXECUTE FUNCTION objective_assessments_rollup();

-- trigger objective_assessments_before
CREATE TRIGGER objective_assessments_before BEFORE INSERT ON public.objective_assessments FOR EACH ROW EXECUTE FUNCTION objective_assessments_fill();

CREATE OR REPLACE FUNCTION public.objective_assessments_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.state := public.ward_stage_for_value(new.value);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.objective_assessments_rollup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  prev numeric;
  cv   numeric;
begin
  select current_value into prev
    from public.objective_progress
   where student_id = new.student_id and objective_id = new.objective_id;

  if prev is null then
    cv := new.value;
  else
    cv := round(0.35 * prev + 0.65 * new.value, 4);
  end if;

  insert into public.objective_progress
    (tenant_id, student_id, objective_id, current_value, current_state, last_assessed_at)
  values
    (new.tenant_id, new.student_id, new.objective_id, cv, public.ward_stage_for_value(cv), new.assessed_at)
  on conflict (student_id, objective_id) do update
    set current_value    = excluded.current_value,
        current_state    = excluded.current_state,
        last_assessed_at = excluded.last_assessed_at,
        tenant_id        = excluded.tenant_id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ward_stage_for_value(v numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when coalesce(v, 0) < 2   then 'seed'
    when v < 5.5              then 'bud'
    when v < 8.5              then 'balloon'
    else                           'bloom'
  end;
$function$
;