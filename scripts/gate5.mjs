// Phase 5 closing gate — the migration is complete only if all pass.
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";
import { makeClient } from "./db.mjs";
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const valueForPercent = (p) => (p < 50 ? 0 : p < 70 ? 4 : p < 90 ? 7 : 10);
const stageFor = (v) => (v < 2 ? "seed" : v < 5.5 ? "bud" : v < 8.5 ? "balloon" : "bloom");

const main = async () => {
  const checks = [];

  // (1) progress_records table + the 0007 trigger are gone (authoritative: direct SQL, not cached REST)
  const sql = makeClient(); await sql.connect();
  const reg = (await sql.query("select to_regclass('public.progress_records') as t")).rows[0].t;
  const trg = (await sql.query("select count(*)::int n from pg_trigger where tgrelid='public.submissions'::regclass and tgname='submissions_after_write'")).rows[0].n;
  await sql.end();
  checks.push(["progress_records dropped (to_regclass)", reg === null, reg === null ? "gone" : "STILL EXISTS"]);
  checks.push(["0007 submissions→progress trigger dropped", trg === 0, `${trg} trigger(s)`]);

  // (2) no demo/Grade6/null rows in old objectives
  const { count: objCount } = await c.from("objectives").select("*", { count: "exact", head: true });
  checks.push(["objectives cleared (no demo/Grade6/null)", objCount === 0, `${objCount} rows`]);

  // (3) study_plans intact
  const { count: spCount } = await c.from("study_plans").select("*", { count: "exact", head: true });
  checks.push(["study_plans intact", (spCount ?? 0) > 0, `${spCount} rows`]);

  // (4) tests reference the catalog + auto moves objective_progress end-to-end
  const { data: L } = await c.from("profiles").select("id, tenant_id").contains("roles", ["learner"]).limit(1).single();
  const UNIT = "A1-U03";
  await c.from("objective_assessments").delete().eq("student_id", L.id);
  await c.from("objective_progress").delete().eq("student_id", L.id);
  const { data: asmt, error: aErr } = await c.from("assessments")
    .insert({ tenant_id: L.tenant_id, learner_id: L.id, title: "اختبار", scope: "unit", unit: "u", curriculum_unit_id: UNIT, status: "ready" })
    .select("id, curriculum_unit_id").single();
  checks.push(["assessment carries curriculum_unit_id (tests → catalog)", !aErr && asmt?.curriculum_unit_id === UNIT, asmt?.curriculum_unit_id ?? aErr?.message]);

  const { data: catObjs } = await c.from("curriculum_objectives").select("objective_id, skill").eq("unit_id", UNIT);
  const bySkill = new Map([["reading", { correct: 2, total: 2 }], ["listening", { correct: 0, total: 2 }]]); // 100% / 0%
  const rows = [];
  for (const skill of ["listening", "speaking", "reading", "writing"]) {
    const s = bySkill.get(skill); if (!s || !s.total) continue;
    const value = valueForPercent((s.correct / s.total) * 100);
    for (const o of catObjs.filter((o) => o.skill === skill)) rows.push({ tenant_id: L.tenant_id, student_id: L.id, objective_id: o.objective_id, value, state: stageFor(value), evidence: "auto" });
  }
  await c.from("objective_assessments").insert(rows);
  const { data: prog } = await c.from("objective_progress").select("objective_id, current_value").eq("student_id", L.id);
  const pv = new Map(prog.map((p) => [p.objective_id, Number(p.current_value)]));
  const reads = catObjs.filter((o) => o.skill === "reading");
  const autoMoved = reads.length > 0 && reads.every((o) => pv.get(o.objective_id) === 10) && prog.length === rows.length;
  checks.push(["auto test moves objective_progress via catalog", autoMoved, `reading→${reads.map((o) => pv.get(o.objective_id)).join(",")} (10=bloom)`]);

  // cleanup
  await c.from("objective_assessments").delete().eq("student_id", L.id);
  await c.from("objective_progress").delete().eq("student_id", L.id);
  await c.from("assessments").delete().eq("id", asmt.id);

  console.log("\n========== GATE 5 — CLOSE THE MIGRATION ==========");
  for (const [name, ok, detail] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}  [${detail}]`);
  const pass = checks.every((x) => x[1]);
  console.log(`\n  ${pass ? "PASS ✅ — auto on catalog · old progress retired · migration COMPLETE" : "FAIL ❌"}   (test rows cleaned)\n`);
  process.exit(pass ? 0 : 1);
};
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
