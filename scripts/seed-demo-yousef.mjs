// DEMO scaffold (NOT real curriculum content). Makes the dev test login "Yousef (dev)" a
// full-coverage /learn account so every POSITIVE state is visible on the one available login:
//   • ONE genuinely UPCOMING session (relative now+3d) → "Your next lesson" + Join
//   • ONE READY unit test (+2 questions)               → "My tests" → Start (the takeover form)
//   • ONE homework assignment (→ an approved item)      → "My homework" shows assigned practice
// Idempotent + re-runnable: clears its own scaffold rows (marked "[demo] …") each run, relative-
// dated. Touches ONLY Yousef's sessions/assessments/assignments — no evidence model, no schema,
// no other persona, no production behaviour. Run:
//   node --env-file=.env.local scripts/seed-demo-yousef.mjs
import { createClient } from "@supabase/supabase-js";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();
const MARK = "[demo] "; // title prefix on rows we own (for idempotent cleanup)
const must = (res, what) => { if (res.error) { console.error("ERR", what, res.error.message); process.exit(1); } return res.data; };

const { data: people } = await c.from("profiles").select("id, full_name, roles, tenant_id");
const Y = (people ?? []).find((p) => (p.full_name ?? "").includes("Yousef (dev)") && (p.roles ?? []).includes("learner"));
if (!Y) { console.error("Yousef (dev) learner not found"); process.exit(1); }
const I = (people ?? []).find((p) => (p.roles ?? []).includes("instructor") && p.tenant_id === Y.tenant_id);
if (!I) { console.error("no instructor in Yousef's tenant"); process.exit(1); }
const T = Y.tenant_id;

// Ensure Yousef is assigned to the instructor (so he also surfaces on the teacher side).
must(await c.from("profiles").update({ assigned_instructor_id: I.id }).eq("id", Y.id), "assign instructor");

// 1) UPCOMING session (relative) — drives "Your next lesson" + Join.
await c.from("sessions").delete().eq("learner_id", Y.id).like("lesson_title", `${MARK}%`); // idempotent: only our scaffold
const sess = must(await c.from("sessions").insert({ tenant_id: T, instructor_id: I.id, learner_id: Y.id, scheduled_at: iso(Date.now() + 3 * DAY), duration_minutes: 30, status: "scheduled", lesson_title: `${MARK}Ward practice lesson` }).select("id").single(), "upcoming session");

// 2) READY unit test (+2 questions) — drives "My tests" → Start (the same takeover form).
await c.from("assessments").delete().eq("learner_id", Y.id).eq("status", "ready").like("title", `${MARK}%`); // cascades its questions
const asmt = must(await c.from("assessments").insert({ tenant_id: T, learner_id: Y.id, title: `${MARK}Unit test`, scope: "unit", unit: "Demo Unit — Greetings", status: "ready", created_by: I.id }).select("id").single(), "ready assessment");
must(await c.from("assessment_questions").insert([
  { assessment_id: asmt.id, tenant_id: T, skill: "reading", format: "multiple_choice", prompt: "Which one is a morning greeting?", content: { options: ["Good morning", "Good night", "Goodbye"] }, answer: "Good morning", position: 0 },
  { assessment_id: asmt.id, tenant_id: T, skill: "reading", format: "multiple_choice", prompt: "Which word is a greeting?", content: { options: ["Hello", "Table", "Run"] }, answer: "Hello", position: 1 },
]), "ready questions");

// 3) HOMEWORK assignment — point one approved item at Yousef (unique(item_id,learner_id) → upsert).
const { data: anItem } = await c.from("items").select("id").eq("status", "approved").eq("tenant_id", T).order("created_at", { ascending: false }).limit(1).maybeSingle();
if (anItem) must(await c.from("assignments").upsert({ tenant_id: T, item_id: anItem.id, learner_id: Y.id, assigned_by: I.id }, { onConflict: "item_id,learner_id" }), "assignment");

console.log(`✓ Yousef (dev) scaffolded — upcoming session ${sess.id.slice(0, 8)} (+3d) · ready test ${asmt.id.slice(0, 8)} (+2Q) · homework assignment → ${anItem ? anItem.id.slice(0, 8) : "NONE (no approved item in tenant)"}`);
console.log("done — Yousef demo-coverage scaffold seeded (idempotent).");
