// SAMPLE/demo data only (NOT the 30-unit real curriculum content — deferred). Seeds
// objective_evidence for the demo learners so the NEW evidence-model surfaces render real
// values: 2 COMPLETED units (auto_test evidence → "completed") with varied per-skill scores so
// the cross-unit DECAYING has >1 input, + 1 IN-PROGRESS unit (auto_homework only → not
// completed → does NOT feed the big rose). Idempotent (clears each learner's evidence first).
// Touches ONLY objective_evidence — the old model (objective_assessments/objective_progress)
// is untouched. Run: node --env-file=.env.local scripts/seed-evidence.mjs
import { createClient } from "@supabase/supabase-js";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();
// per-skill target score for each seeded unit (skill-in-unit = mean of that skill's objectives)
const U0 = { listening: 4, reading: 7, speaking: 10, writing: 4 }; // completed, 60d ago
const U1 = { listening: 10, reading: 4, speaking: 7, writing: 10 }; // completed, 30d ago
const U2 = { listening: 7, reading: 4 };                            // in-progress (homework), recent

const { data: objs } = await c.from("curriculum_objectives").select("objective_id, unit_id, skill, seq");
const { data: units } = await c.from("curriculum_units").select("unit_id, level, unit_number");
const objByUnit = new Map();
for (const o of objs) { const a = objByUnit.get(o.unit_id) ?? []; a.push(o); objByUnit.set(o.unit_id, a); }
const unitsByLevel = new Map();
for (const u of units.sort((a, b) => a.unit_number - b.unit_number)) { const a = unitsByLevel.get(u.level) ?? []; a.push(u); unitsByLevel.set(u.level, a); }

const { data: learners } = await c.from("profiles").select("id, tenant_id, full_name, roles");
const targets = (learners ?? []).filter((p) => (p.roles ?? []).includes("learner"));

for (const L of targets) {
  // level: from approved study_plan, else placement, else A1
  const { data: plan } = await c.from("study_plans").select("level").eq("learner_id", L.id).eq("status", "approved").limit(1).maybeSingle();
  const { data: pl } = await c.from("placement_tests").select("confirmed_level, suggested_level").eq("learner_id", L.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
  const level = plan?.level ?? pl?.confirmed_level ?? pl?.suggested_level ?? "A1";
  const lvlUnits = unitsByLevel.get(level) ?? unitsByLevel.get("A1") ?? [];
  const [u0, u1, u2] = lvlUnits;
  if (!u0 || !u1 || !u2) { console.log("skip", L.full_name, "— level", level, "lacks 3 units"); continue; }

  await c.from("objective_evidence").delete().eq("learner_id", L.id); // idempotent

  const rows = [];
  const push = (objective_id, value, source, when) => rows.push({ tenant_id: L.tenant_id, learner_id: L.id, objective_id, value, source, item_id: null, created_at: iso(when) });

  // unit0 completed (auto_test). One objective per skill gets TWO rows (mean demo) when safe.
  const firstOfSkill = new Set();
  for (const o of (objByUnit.get(u0.unit_id) ?? []).sort((a, b) => a.seq - b.seq)) {
    const v = U0[o.skill]; if (v == null) continue;
    if (!firstOfSkill.has(o.skill) && v <= 8) { firstOfSkill.add(o.skill); push(o.objective_id, v - 2, "auto_test", Date.now() - 60 * DAY); push(o.objective_id, v + 2, "auto_test", Date.now() - 60 * DAY); }
    else push(o.objective_id, v, "auto_test", Date.now() - 60 * DAY);
  }
  // unit1 completed (auto_test)
  for (const o of objByUnit.get(u1.unit_id) ?? []) { const v = U1[o.skill]; if (v != null) push(o.objective_id, v, "auto_test", Date.now() - 30 * DAY); }
  // unit2 in-progress (auto_homework, listening+reading only → no test → not completed)
  for (const o of objByUnit.get(u2.unit_id) ?? []) { const v = U2[o.skill]; if (v != null) push(o.objective_id, v, "auto_homework", Date.now() - 2 * DAY); }

  if (rows.length) { const { error } = await c.from("objective_evidence").insert(rows); if (error) { console.log("ERR", L.full_name, error.message); continue; } }
  console.log(`✓ ${L.full_name} (${level}): ${rows.length} evidence rows · completed=[${u0.unit_id}, ${u1.unit_id}] · in-progress=[${u2.unit_id}]`);
}
console.log("done — demo objective_evidence seeded.");
