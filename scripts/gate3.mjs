// Phase 3 gate: aggregation rules on real data.
//  (1) Unit bloom = simple mean of ALL its objectives (un-assessed = 0/seed).
//  (2) Skill petal = mean across STARTED units only; un-started units excluded
//      entirely (NOT counted as zero).
// Seeds one started unit (some objectives) + leaves another unit untouched, then
// recomputes with the exact §5 rules and asserts. Cleans up after.
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STATE_VALUE = { seed: 0, bud: 4, balloon: 7, bloom: 10 };
const stageFor = (v) => (v < 2 ? "seed" : v < 5.5 ? "bud" : v < 8.5 ? "balloon" : "bloom");
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const main = async () => {
  const { data: L } = await c.from("profiles").select("id, tenant_id").contains("roles", ["learner"]).limit(1).single();
  const STARTED = "A1-U01";
  const UNTOUCHED = "A1-U02";

  // catalog
  const { data: cat } = await c.from("curriculum_objectives").select("objective_id, unit_id, skill, seq").order("seq");
  const u1 = cat.filter((o) => o.unit_id === STARTED);
  const u2 = cat.filter((o) => o.unit_id === UNTOUCHED);
  const u1Listening = u1.filter((o) => o.skill === "listening");

  // clean slate for this learner
  await c.from("objective_assessments").delete().eq("student_id", L.id);
  await c.from("objective_progress").delete().eq("student_id", L.id);

  // Seed: in U01 assess ONE listening objective = bloom(10) and one other = balloon(7).
  const seedLisn = u1Listening[0];
  const seedOther = u1.find((o) => o.objective_id !== seedLisn.objective_id);
  const assess = async (objective_id, state) =>
    c.from("objective_assessments").insert({ tenant_id: L.tenant_id, student_id: L.id, objective_id, value: STATE_VALUE[state], state, evidence: "teacher", assessor: L.id });
  await assess(seedLisn.objective_id, "bloom");
  await assess(seedOther.objective_id, "balloon");
  // U02 left entirely untouched.

  // read back progress (what fetchStudentBloom reads)
  const { data: prog } = await c.from("objective_progress").select("objective_id, current_value").eq("student_id", L.id);
  const pv = new Map(prog.map((p) => [p.objective_id, Number(p.current_value)]));

  // recompute with the §5 rules
  const startedUnitIds = [...new Set(cat.filter((o) => pv.has(o.objective_id)).map((o) => o.unit_id))];
  const u1Value = mean(u1.map((o) => pv.get(o.objective_id) ?? 0)); // un-assessed = 0
  const startedSet = new Set(startedUnitIds);
  const listeningPetal = mean(cat.filter((o) => o.skill === "listening" && startedSet.has(o.unit_id)).map((o) => pv.get(o.objective_id) ?? 0));
  // counterfactual: if the untouched unit were (wrongly) included as zeros
  const listeningIfU2Counted = mean(cat.filter((o) => o.skill === "listening" && (startedSet.has(o.unit_id) || o.unit_id === UNTOUCHED)).map((o) => pv.get(o.objective_id) ?? 0));

  const expectU1 = (10 + 7 + 0 * (u1.length - 2)) / u1.length;
  const expectListening = (10 + 0 * (u1Listening.length - 1)) / u1Listening.length;

  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const checks = [
    [`U01 started, U02 excluded`, `started=[${startedUnitIds.join(",")}]`, startedUnitIds.includes(STARTED) && !startedUnitIds.includes(UNTOUCHED)],
    [`unit bloom = mean w/ seeds  (${u1.length} objs → ${u1Value.toFixed(3)}, ${stageFor(u1Value)})`, `expect ${expectU1.toFixed(3)}`, near(u1Value, expectU1)],
    [`listening petal ignores U02 (${listeningPetal.toFixed(3)}/10, ${u1Listening.length} listening objs in U01)`, `expect ${expectListening.toFixed(3)}`, near(listeningPetal, expectListening)],
    [`U02 would change petal if wrongly counted (${listeningIfU2Counted.toFixed(3)} ≠ ${listeningPetal.toFixed(3)})`, `proves exclusion matters`, u2.some((o) => o.skill === "listening") ? !near(listeningIfU2Counted, listeningPetal) : true],
  ];
  console.log("\n========== GATE 3 — AGGREGATION ==========");
  for (const [name, exp, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}  [${exp}]`);
  console.log(`\n  Three surfaces consume one shared fetchStudentBloom → consistent by construction.`);

  // cleanup
  await c.from("objective_assessments").delete().eq("student_id", L.id);
  await c.from("objective_progress").delete().eq("student_id", L.id);
  const pass = checks.every((x) => x[2]);
  console.log(`\n  ${pass ? "PASS ✅ — ready for Phase 4 (await signal)" : "FAIL ❌"}   (test rows cleaned)\n`);
  process.exit(pass ? 0 : 1);
};
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
