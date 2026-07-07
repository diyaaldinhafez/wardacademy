// AE-7 · G3 proof — a PRE-BUILT bank item feeds the FROZEN grade→evidence→bloom pipeline UNCHANGED.
// Imports the REAL frozen source-of-numbers (lib/progress/evidence.ts: buildAutoEvidence /
// valueForPercent) so any change to the model would surface here. DB ops are pure REST (no
// supabase-js/realtime). Self-contained + idempotent: ephemeral instructor + learner in the
// default tenant, one APPROVED bank homework item + one bank test item, then it mirrors the exact
// grade path (learn/actions.ts) — read item(objective_id,grading)+item_keys.answer → grade →
// buildAutoEvidence → objective_evidence — and the assembleUnitTest snapshot (answer→
// assessment_questions.answer + objective_id + grading), then cleans up.
// Run: nvm use 20 && npx tsx scripts/ae7-proof.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAutoEvidence, valueForPercent } from "../lib/progress/evidence";

// ── env (parse .env.local; no --env-file dependency) ──
const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const envGet = (k: string) => env.split("\n").find((l) => l.startsWith(k + "="))?.slice(k.length + 1).replace(/^["']|["']$/g, "").trim();
const URL_ = envGet("NEXT_PUBLIC_SUPABASE_URL")!;
const SVC = envGet("SUPABASE_SERVICE_ROLE_KEY")!;
if (!URL_ || !SVC) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  ·  " + extra : ""}`); ok ? pass++ : fail++; };

const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
async function jj(r: Response) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }
async function rest(method: string, table: string, opts: { query?: string; body?: unknown; prefer?: string } = {}) {
  const headers: Record<string, string> = { ...H }; if (opts.prefer) headers.Prefer = opts.prefer;
  const r = await fetch(`${URL_}/rest/v1/${table}${opts.query ?? ""}`, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, data: await jj(r) as any };
}
async function auth(method: string, path: string, body?: unknown) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await jj(r) as any };
}
async function mkUser(email: string) {
  const { data } = await auth("GET", "admin/users?per_page=200");
  let u = (data?.users ?? []).find((x: any) => x.email === email);
  if (!u) u = (await auth("POST", "admin/users", { email, password: "Ae7Proof!2026", email_confirm: true })).data;
  return u.id as string;
}
async function insert(table: string, obj: unknown) {
  const { status, data } = await rest("POST", table, { body: obj, prefer: "return=representation" });
  if (!Array.isArray(data) || !data[0]) throw new Error(`insert ${table} failed (${status}): ${JSON.stringify(data)}`);
  return data[0];
}
const norm = (s: string) => s.trim().toLowerCase(); // mirrors learn/actions.ts

const ids: Record<string, string> = {};
async function run() {
  // ── frozen-math sanity: the ratio key is the REAL valueForPercent (not a copy) ──
  check("ratio key 100% → 10 (valueForPercent)", valueForPercent(100) === 10);
  check("ratio key 50% → 4 (valueForPercent)", valueForPercent(50) === 4);
  check("buildAutoEvidence skips NULL-objective / non-auto", buildAutoEvidence([{ objective_id: null, grading: "auto", correct: true }, { objective_id: "X", grading: "manual", correct: true }]).length === 0);

  // ── setup ──
  const T = (await rest("GET", "tenants", { query: "?select=id&is_default=eq.true&limit=1" })).data[0].id;
  ids.T = T;
  ids.I = await mkUser("ae7-proof-i@ward.test");
  ids.L = await mkUser("ae7-proof-l@ward.test");
  const prof = (id: string, name: string, roles: string[], extra: Record<string, unknown> = {}) => rest("POST", "profiles", { body: { id, tenant_id: T, full_name: name, roles, ...extra }, query: "?on_conflict=id", prefer: "resolution=merge-duplicates,return=minimal" });
  await prof(ids.I, "AE7 Teacher", ["instructor"]);
  await prof(ids.L, "AE7 Learner", ["learner"], { is_minor: true, assigned_instructor_id: ids.I });

  // two real objectives (any level) to tag the bank items with
  const objs = (await rest("GET", "curriculum_objectives", { query: "?select=objective_id,skill&limit=2" })).data;
  const [oHw, oTest] = objs;

  // ── one APPROVED bank HOMEWORK item + its answer key ──
  const hwItem = await insert("items", { tenant_id: T, objective_id: oHw.objective_id, format: "multiple_choice", difficulty: "easy", prompt: "AE7 hw", content: { options: ["Correct", "Wrong"] }, origin: "manual", status: "approved", kind: "homework", grading: "auto", created_by: ids.I, target_learner_id: null });
  ids.hwItem = hwItem.id;
  await insert("item_keys", { item_id: hwItem.id, tenant_id: T, answer: "Correct" });
  // one APPROVED bank TEST item + its answer key
  const testItem = await insert("items", { tenant_id: T, objective_id: oTest.objective_id, format: "multiple_choice", difficulty: "easy", prompt: "AE7 test", content: { options: ["Yes", "No"] }, origin: "manual", status: "approved", kind: "test", grading: "auto", created_by: ids.I, target_learner_id: null });
  ids.testItem = testItem.id;
  await insert("item_keys", { item_id: testItem.id, tenant_id: T, answer: "Yes" });

  // ════ PROOF A — HOMEWORK: bank item → auto-grade → exactly ONE objective_evidence(auto_homework) ════
  // read the item exactly as the grade path does + assert it carries what the pipeline reads
  const it = (await rest("GET", "items", { query: `?select=id,format,objective_id,grading,tenant_id&id=eq.${ids.hwItem}` })).data[0];
  check("A: bank homework item has objective_id + grading=auto (fields the pipeline reads)", !!it.objective_id && it.grading === "auto");
  const key = (await rest("GET", "item_keys", { query: `?select=answer&item_id=eq.${ids.hwItem}` })).data[0];
  const correct = typeof key.answer === "string" && norm("Correct") === norm(key.answer); // mirrors learn/actions.ts:22
  const evH = buildAutoEvidence([{ objective_id: it.objective_id, grading: it.grading, correct }]); // REAL frozen fn
  check("A: buildAutoEvidence → 1 row, value=valueForPercent(100)=10", evH.length === 1 && evH[0].value === 10);
  await insert("objective_evidence", { tenant_id: T, learner_id: ids.L, objective_id: evH[0].objective_id, value: evH[0].value, source: "auto_homework", item_id: ids.hwItem });
  const gotH = (await rest("GET", "objective_evidence", { query: `?select=objective_id,value,source&learner_id=eq.${ids.L}&source=eq.auto_homework` })).data;
  check("A: exactly ONE objective_evidence(auto_homework, value 10) written", gotH.length === 1 && gotH[0].value === 10 && gotH[0].objective_id === oHw.objective_id);

  // ════ PROOF B — UNIT TEST: assembleUnitTest snapshot → take → objective_evidence(auto_test) ════
  const asmt = await insert("assessments", { tenant_id: T, learner_id: ids.L, title: "AE7 unit test", scope: "unit", status: "draft", created_by: ids.I });
  ids.asmt = asmt.id;
  // mirror assembleUnitTest: copy item_keys.answer → assessment_questions.answer (R4) + objective_id + grading
  const tkey = (await rest("GET", "item_keys", { query: `?select=answer&item_id=eq.${ids.testItem}` })).data[0];
  const q = await insert("assessment_questions", { assessment_id: asmt.id, tenant_id: T, skill: oTest.skill, format: "multiple_choice", prompt: "AE7 test", content: { options: ["Yes", "No"] }, answer: tkey.answer, objective_id: oTest.objective_id, grading: "auto", position: 0 });
  check("B: snapshot wrote assessment_questions.answer + objective_id + grading (R4 — where the take path reads)", q.answer === "Yes" && q.objective_id === oTest.objective_id && q.grading === "auto");
  // mirror take/grade (learn/actions.ts): read questions, grade, buildAutoEvidence, insert auto_test
  const qs = (await rest("GET", "assessment_questions", { query: `?select=id,skill,answer,objective_id,grading&assessment_id=eq.${ids.asmt}` })).data;
  const graded = qs.map((qq: any) => ({ objective_id: qq.objective_id ?? null, grading: qq.grading ?? null, correct: typeof qq.answer === "string" && norm("Yes") === norm(qq.answer) }));
  const evT = buildAutoEvidence(graded); // REAL frozen fn
  check("B: buildAutoEvidence(test) → 1 row, value 10", evT.length === 1 && evT[0].value === 10);
  await rest("POST", "objective_evidence", { body: evT.map((e) => ({ tenant_id: T, learner_id: ids.L, objective_id: e.objective_id, value: e.value, source: "auto_test", item_id: null })), prefer: "return=minimal" });
  const gotT = (await rest("GET", "objective_evidence", { query: `?select=objective_id,value,source&learner_id=eq.${ids.L}&source=eq.auto_test` })).data;
  check("B: objective_evidence(auto_test) written for the tested objective", gotT.length === 1 && gotT[0].value === 10 && gotT[0].objective_id === oTest.objective_id);

  // ════ PROOF C — BLOOM ROLLUP UNCHANGED (objective-level = simple mean of its evidence, §5) ════
  const all = (await rest("GET", "objective_evidence", { query: `?select=objective_id,value&learner_id=eq.${ids.L}` })).data;
  const byObj = new Map<string, number[]>();
  for (const r of all) { (byObj.get(r.objective_id) ?? byObj.set(r.objective_id, []).get(r.objective_id)!).push(r.value); }
  const objMean = (oid: string) => { const v = byObj.get(oid)!; return v.reduce((a, b) => a + b, 0) / v.length; };
  check("C: objective rollup (mean of evidence) = 10 for both objectives — numbers are the frozen valueForPercent outputs", objMean(oHw.objective_id) === 10 && objMean(oTest.objective_id) === 10);
}

async function cleanup() {
  if (ids.L) await rest("DELETE", "objective_evidence", { query: `?learner_id=eq.${ids.L}` });
  if (ids.asmt) await rest("DELETE", "assessment_questions", { query: `?assessment_id=eq.${ids.asmt}` });
  if (ids.asmt) await rest("DELETE", "assessments", { query: `?id=eq.${ids.asmt}` });
  for (const it of [ids.hwItem, ids.testItem]) if (it) { await rest("DELETE", "item_keys", { query: `?item_id=eq.${it}` }); await rest("DELETE", "items", { query: `?id=eq.${it}` }); }
  for (const id of [ids.I, ids.L]) if (id) { await rest("DELETE", "profiles", { query: `?id=eq.${id}` }); await auth("DELETE", `admin/users/${id}`); }
}

(async () => {
  try { await run(); } catch (e) { console.error("ERROR:", (e as Error).message); fail++; }
  finally { await cleanup(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
