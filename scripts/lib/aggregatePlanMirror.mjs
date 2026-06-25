// Mirror of lib/curriculum/aggregatePlan.ts → aggregatePlanItems(supabase, level).
// .mjs seed scripts can't import the TS production function, so this replicates it
// EXACTLY (same query, same order: unit_number, seq, objective_id; same field map:
// id=objective_id · description=descriptor_ar · skill · level=o.level · unit=title_ar).
// scripts/verify-aggregate-mirror.ts proves this stays byte-for-byte identical to
// the real aggregatePlanItems (drift guard). Keep the two in lock-step.

export async function aggregatePlanMirror(supabase, level) {
  const { data, error } = await supabase
    .from("curriculum_objectives")
    .select("objective_id, unit_id, unit_number, seq, skill, level, descriptor_ar")
    .eq("level", level)
    .order("unit_number", { ascending: true })
    .order("seq", { ascending: true })
    .order("objective_id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const unitIds = [...new Set(rows.map((r) => r.unit_id))];
  const { data: units } = await supabase.from("curriculum_units").select("unit_id, title_ar").in("unit_id", unitIds);
  const titleByUnit = new Map((units ?? []).map((u) => [u.unit_id, u.title_ar]));

  return rows.map((r) => ({
    id: r.objective_id,
    description: r.descriptor_ar,
    skill: r.skill,
    level: r.level,
    unit: titleByUnit.get(r.unit_id) ?? r.unit_id,
  }));
}
