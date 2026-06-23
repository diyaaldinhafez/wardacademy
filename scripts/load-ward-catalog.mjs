// Phase 1 loader + gate for "منهاج وَرد" catalog.
// Reads ward_units.json + ward_objectives.json (UTF-8) from the repo root,
// upserts into curriculum_units / curriculum_objectives, then runs the GATE.
// Run: node scripts/load-ward-catalog.mjs
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const UNITS_FILE = "ward_units.json";
const OBJS_FILE = "ward_objectives.json";

const EXPECT = {
  units: 30,
  objectives: 215,
  skills: { listening: 60, speaking: 67, reading: 52, writing: 36 },
  evidence: { auto: 112, teacher: 67, mixed: 36 },
  cefrCeiling: ["A1", "A2", "A2+", "B1", "B1+"], // nothing above B1+
};

const tally = (arr, key) => arr.reduce((m, x) => ((m[x[key]] = (m[x[key]] || 0) + 1), m), {});
const arabicRe = /[؀-ۿ]/;
const hasReplacement = (s) => typeof s === "string" && s.includes("�");

const main = async () => {
  if (!existsSync(UNITS_FILE) || !existsSync(OBJS_FILE)) {
    console.error(`MISSING FILE(S): need ${UNITS_FILE} and ${OBJS_FILE} (UTF-8) in repo root.`);
    process.exit(2);
  }
  const units = JSON.parse(readFileSync(UNITS_FILE, "utf8"));
  const objs = JSON.parse(readFileSync(OBJS_FILE, "utf8"));

  // — UTF-8 integrity guard: refuse to load garbled Arabic —
  const badUnit = units.find((u) => hasReplacement(u.title_ar) || !arabicRe.test(u.title_ar || ""));
  const badObj = objs.find((o) => hasReplacement(o.descriptor_ar) || !arabicRe.test(o.descriptor_ar || ""));
  if (badUnit || badObj) {
    console.error("ENCODING GUARD FAILED — Arabic looks corrupted (replacement chars or no Arabic letters).");
    console.error("  sample:", JSON.stringify((badUnit || badObj)));
    process.exit(3);
  }

  // — Upsert (idempotent). Units first (FK), then objectives. —
  for (let i = 0; i < units.length; i += 100) {
    const r = await c.from("curriculum_units").upsert(units.slice(i, i + 100), { onConflict: "unit_id" });
    if (r.error) throw new Error("units upsert: " + r.error.message);
  }
  for (let i = 0; i < objs.length; i += 200) {
    const r = await c.from("curriculum_objectives").upsert(objs.slice(i, i + 200), { onConflict: "objective_id" });
    if (r.error) throw new Error("objectives upsert: " + r.error.message);
  }

  // — GATE —
  const { count: uCount } = await c.from("curriculum_units").select("unit_id", { count: "exact", head: true });
  const { data: oRows } = await c.from("curriculum_objectives").select("objective_id, unit_id, skill, evidence, cefr_level");
  const skills = tally(oRows, "skill");
  const evidence = tally(oRows, "evidence");
  const levels = [...new Set(oRows.map((o) => o.cefr_level))];
  const aboveCeiling = levels.filter((l) => !EXPECT.cefrCeiling.includes(l));
  const unitsWithObjs = new Set(oRows.map((o) => o.unit_id));
  const { data: allUnits } = await c.from("curriculum_units").select("unit_id");
  const emptyUnits = allUnits.map((u) => u.unit_id).filter((id) => !unitsWithObjs.has(id));

  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const checks = [
    ["units = 30", uCount, EXPECT.units, uCount === EXPECT.units],
    ["objectives = 215", oRows.length, EXPECT.objectives, oRows.length === EXPECT.objectives],
    ["skills dist", JSON.stringify(skills), JSON.stringify(EXPECT.skills), eq(skills, EXPECT.skills)],
    ["evidence dist", JSON.stringify(evidence), JSON.stringify(EXPECT.evidence), eq(evidence, EXPECT.evidence)],
    ["cefr ≤ B1+", aboveCeiling.length ? aboveCeiling.join(",") : "none", "none above B1+", aboveCeiling.length === 0],
    ["no empty units", emptyUnits.length ? emptyUnits.join(",") : "none", "none", emptyUnits.length === 0],
  ];
  console.log("\n========== GATE 1 — CATALOG ==========");
  for (const [name, got, exp, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}: ${got}${ok ? "" : `  (expected ${exp})`}`);
  const pass = checks.every((c) => c[3]);
  console.log(`\n  ${pass ? "PASS ✅ — ready for Phase 2 (await signal)" : "FAIL ❌ — do not proceed"}\n`);
  process.exit(pass ? 0 : 1);
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
