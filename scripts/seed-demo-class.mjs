// Seed a whole demo CLASS — 5 varied students with ~months of hand-authored
// history (NO AI / zero tokens). Plans are aggregated from the Ward Curriculum via
// the SAME path as production (aggregatePlanMirror == aggregatePlanItems), and
// progress is seeded through objective_assessments so the DB trigger computes the
// decaying-average bloom (no direct injection). Re-runnable. Run:
//   node scripts/seed-demo-class.mjs
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";
import { aggregatePlanMirror } from "./lib/aggregatePlanMirror.mjs";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const iso = (d) => new Date(d).toISOString();
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const DAY = 86400000;
const unitIdOf = (objectiveId) => objectiveId.split("-").slice(0, 2).join("-"); // "A1-U01-W1" → "A1-U01"
// The ONE shared 0–10 → state band (mirrors ward_stage_for_value / lib/skills).
const stageFor = (v) => (v < 2 ? "seed" : v < 5.5 ? "bud" : v < 8.5 ? "balloon" : "bloom");
const clamp = (v) => Math.max(0, Math.min(10, Math.round(v * 100) / 100));

const REPORTS = [
  ["جلسةٌ مثمرة؛ تابع الطالب الدرس باهتمامٍ وأنجز التمارين بدقّة.", "تركيزٌ وحماسٌ للمشاركة.", "مزيدٌ من القراءة الجهرية في البيت."],
  ["فهمٌ جيّدٌ لمقطع الاستماع والتقاطٌ للتفاصيل.", "إصغاءٌ نشطٌ ومنظّم.", "التدرّب على المفردات الجديدة بالبطاقات."],
  ["قراءةٌ بطلاقةٍ معقولةٍ وإجابةٌ عن معظم الأسئلة.", "استيعابٌ جيّدٌ للفكرة العامّة.", "الانتباه لأزمنة الأفعال."],
  ["كتابةٌ مرتّبةٌ باستخدام روابط التسلسل.", "تنظيمٌ جميلٌ للأفكار.", "تنويع المفردات في الكتابة."],
  ["مشاركةٌ شفهيةٌ بثقةٍ متزايدة.", "ثقةٌ أكبر في التحدّث.", "إبطاء الإيقاع قليلاً للوضوح."],
  ["مراجعةٌ شاملةٌ للوحدة بنشاطٍ ومثابرة.", "مثابرةٌ واضحة.", "حلّ تمرينٍ إضافيٍّ قبل الاختبار."],
  ["تطبيقٌ جيّدٌ للقاعدة الجديدة في جُمَلٍ من إنشائه.", "فهمٌ سريعٌ للقاعدة.", "مزيدٌ من الأمثلة المتنوّعة."],
  ["تفاعلٌ ممتازٌ في النشاط الزوجيّ والحوار.", "تعاونٌ ولباقة.", "استخدام عباراتٍ أطول في الحوار."],
];
const HW_TITLES = ["ورقة عمل: القاعدة الجديدة", "مطابقة المفردات بالصور", "كتابة فقرةٍ قصيرة", "تمرين الاستماع والإجابة", "مراجعة الوحدة", "بطاقات المفردات"];

// Generic MCQ bank (skill, prompt, options, answer)
const QBANK = [
  ["reading", "She ___ to school every day.", ["goes", "go", "going", "gone"], "goes"],
  ["reading", "I ___ breakfast at seven o'clock.", ["have", "haves", "having", "had"], "have"],
  ["reading", "The text says the boy ___ before school.", ["reads", "swims", "cooks", "drives"], "reads"],
  ["reading", "The story is mainly about ___.", ["a daily routine", "a holiday", "a recipe", "a match"], "a daily routine"],
  ["listening", "From the audio, she wakes up at ___.", ["seven", "six", "eight", "nine"], "seven"],
  ["listening", "After breakfast she goes to ___.", ["school", "the park", "bed", "work"], "school"],
  ["writing", "Which word orders events first?", ["first", "fast", "funny", "free"], "first"],
  ["reading", "My mother's mother is my ___.", ["grandmother", "aunt", "sister", "cousin"], "grandmother"],
];

// level + how far along (taught objectives) + mastery profile. Levels span A1+A2+B1.
// suggested → confirmed shows the human level decision (رغد: A2 suggested, A1 confirmed).
const PERSONAS = [
  { name: "سارة عبدالله", match: "سارة", level: "A1", suggested: "A1", taught: 6, strength: 0.5, lag: ["speaking"], wd: 2, time: "15:00", tasks: true },
  { name: "رغد القحطاني", level: "A1", suggested: "A2", taught: 5, strength: 0.42, lag: ["writing"], wd: 0, time: "13:00", tasks: true },
  { name: "لمى الحربي", level: "A2", suggested: "A2", taught: 11, strength: 0.72, lag: ["speaking"], wd: 3, time: "14:00", tasks: false },
  { name: "يوسف الخطيب", match: "يوسف", level: "B1", suggested: "B1", taught: 16, strength: 0.84, lag: ["writing"], wd: 1, time: "16:00", tasks: false },
  { name: "عمر الزهراني", level: "B1", suggested: "B1", taught: 24, strength: 0.94, lag: [], wd: 4, time: "17:00", tasks: false },
];

function weeklyDates(wd, time, taught) {
  const [hh, mm] = time.split(":").map(Number);
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
  while (d.getUTCDay() !== wd || d.getTime() < now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  const sessions = Math.min(taught, 8); // show up to 8 past sessions
  const future = [new Date(d), new Date(d.getTime() + 7 * DAY)];
  const past = [];
  let p = new Date(d.getTime() - 7 * DAY);
  for (let i = 0; i < sessions; i++) { past.unshift(new Date(p)); p = new Date(p.getTime() - 7 * DAY); }
  return { past, future };
}

async function ensureLearner(persona, ctx) {
  const { people, T, I } = ctx;
  let prof = persona.match ? people.find((p) => (p.roles ?? []).includes("learner") && (p.full_name ?? "").includes(persona.match)) : null;
  if (!prof) {
    const slug = "demo-" + Buffer.from(persona.name).toString("hex").slice(0, 10);
    const email = `${slug}@ward.local`;
    const list = await c.auth.admin.listUsers();
    let u = (list.data?.users ?? []).find((x) => x.email === email);
    if (!u) u = must(await c.auth.admin.createUser({ email, password: "Demo#2026", email_confirm: true }), "createUser").user;
    must(await c.from("profiles").upsert({ id: u.id, tenant_id: T, full_name: persona.name, roles: ["learner"], assigned_instructor_id: I }, { onConflict: "id" }), "profile upsert");
    return { id: u.id };
  }
  must(await c.from("profiles").update({ full_name: persona.name, assigned_instructor_id: I }).eq("id", prof.id), "profile update");
  return prof;
}

async function clearLearner(L) {
  await c.from("submissions").delete().eq("learner_id", L);
  await c.from("assignments").delete().eq("learner_id", L);
  await c.from("manual_homework").delete().eq("learner_id", L);
  await c.from("assessments").delete().eq("learner_id", L);
  await c.from("sessions").delete().eq("learner_id", L);
  await c.from("placement_tests").delete().eq("learner_id", L);
  await c.from("study_plans").delete().eq("learner_id", L);
}

async function seed(persona, ctx) {
  const prof = await ensureLearner(persona, ctx);
  const L = prof.id, { T, I } = ctx;
  await clearLearner(L);

  // Structured placement (suggested = machine; confirmed = human decision).
  await c.from("placement_tests").insert({ tenant_id: T, learner_id: L, status: "completed", suggested_level: persona.suggested, confirmed_level: persona.level, completed_at: iso(Date.now() - 90 * DAY) });

  // The plan is aggregated from the catalog — SAME as production (no LIB, no authoring).
  const items = await aggregatePlanMirror(c, persona.level);
  const plan = must(await c.from("study_plans").insert({ tenant_id: T, learner_id: L, title: `Ward Curriculum · Level ${persona.level}`, level: persona.level, items, status: "approved", track: "cefr", scope_label: `Ward Curriculum · Level ${persona.level}`, milestone_label: `Level assessment on completing ${persona.level}`, created_by: I, approved_at: iso(Date.now() - 92 * DAY) }).select("id").single(), "plan");

  // Progress is now the evidence model (objective_evidence): seed it via
  // scripts/seed-evidence.mjs. The old objective_assessments/objective_progress tables were
  // hard-deleted in AE-8.

  // Sessions
  const { past, future } = weeklyDates(persona.wd, persona.time, taught);
  const pastIds = [], futureIds = [];
  for (let i = 0; i < past.length; i++) {
    const s = must(await c.from("sessions").insert({ tenant_id: T, instructor_id: I, learner_id: L, scheduled_at: iso(past[i]), duration_minutes: 30, status: "completed", lesson_title: items[Math.min(i, items.length - 1)].description, plan_item_index: Math.min(i, items.length - 1) }).select("id").single(), "past session");
    pastIds.push(s.id);
  }
  for (let i = 0; i < future.length; i++) {
    const li = Math.min(taught + i, items.length - 1);
    const s = must(await c.from("sessions").insert({ tenant_id: T, instructor_id: I, learner_id: L, scheduled_at: iso(future[i]), duration_minutes: 30, status: "scheduled", lesson_title: items[li].description, plan_item_index: li }).select("id").single(), "future session");
    futureIds.push(s.id);
  }

  // Reports: approved for all past, except (when tasks) leave last past without a report + 2nd-last as draft.
  const skipLast = persona.tasks ? 1 : 0;
  for (let i = 0; i < pastIds.length - skipLast; i++) {
    const r = REPORTS[i % REPORTS.length];
    const draft = persona.tasks && i === pastIds.length - 2;
    must(await c.from("session_reports").insert({ session_id: pastIds[i], tenant_id: T, learner_id: L, summary: r[0], strengths: r[1], improve: r[2], status: draft ? "draft" : "approved", approved_at: draft ? null : iso(past[i].getTime() + 3600000) }), "report");
  }

  // Manual homework: 3 graded + (tasks: 1 submitted) + 1 assigned
  const mh = [
    { title: HW_TITLES[0], status: "graded", score: 9, max_score: 10, feedback: "عملٌ رائع!", s: pastIds[0], off: 1 },
    { title: HW_TITLES[1], status: "graded", score: 8, max_score: 10, feedback: "أحسنتَ، انتبه للتفاصيل.", s: pastIds[Math.min(2, pastIds.length - 1)], off: 1 },
    { title: HW_TITLES[2], status: "graded", score: 7, max_score: 10, feedback: "فكرةٌ جميلة، راجع الأزمنة.", s: pastIds[Math.min(3, pastIds.length - 1)], off: 1 },
  ];
  if (persona.tasks) mh.push({ title: HW_TITLES[3], status: "submitted", s: pastIds[pastIds.length - 1], off: 0 });
  mh.push({ title: HW_TITLES[4], status: "assigned", s: futureIds[0], off: -7 });
  for (const h of mh) {
    must(await c.from("manual_homework").insert({ tenant_id: T, learner_id: L, instructor_id: I, session_id: h.s, title: h.title, instructions: "حلّ التمرين وارفع صورة الحلّ.", status: h.status, score: h.score ?? null, max_score: h.max_score ?? null, feedback: h.feedback ?? null, created_at: iso(Date.now() - 20 * DAY), submitted_at: h.status !== "assigned" ? iso(Date.now() - h.off * DAY) : null, graded_at: h.status === "graded" ? iso(Date.now() - (h.off - 1) * DAY) : null }), "manual hw");
  }

  // Digital homework: 2 items on catalog objectives + graded submissions (no objective_id on the submission — like the live flow).
  const mkItem = async (objIndex, q, sessionId, correct) => {
    const objectiveId = items[Math.min(objIndex, items.length - 1)].id;
    const item = must(await c.from("items").insert({ tenant_id: T, objective_id: objectiveId, format: "multiple_choice", difficulty: "easy", prompt: q[1], content: { options: q[2] }, origin: "manual", status: "approved", created_by: I, target_learner_id: L, approved_by: I, approved_at: iso(Date.now() - 15 * DAY) }).select("id").single(), "item");
    must(await c.from("item_keys").insert({ item_id: item.id, tenant_id: T, answer: q[3] }), "item_keys");
    must(await c.from("assignments").insert({ tenant_id: T, item_id: item.id, learner_id: L, assigned_by: I, session_id: sessionId }), "assignment");
    must(await c.from("submissions").insert({ item_id: item.id, learner_id: L, response: { answer: correct ? q[3] : q[2][1] }, is_correct: correct, graded: true, graded_by: I, graded_at: iso(Date.now() - 12 * DAY) }), "submission");
  };
  await mkItem(1, QBANK[0], pastIds[Math.min(1, pastIds.length - 1)], true);
  await mkItem(Math.min(3, taught - 1), QBANK[2], pastIds[Math.min(3, pastIds.length - 1)], persona.strength > 0.7);

  // Assessments: 1 completed unit test (tied to a real catalog unit, per-skill result) + (tasks: 1 draft).
  const flags = QBANK.slice(0, 8).map(([skill], i) => ({ skill, ok: ((i * 37 + 13) % 100) / 100 < (persona.strength - (persona.lag.includes(skill) ? 0.3 : 0)) }));
  const result = {};
  for (const f of flags) { const r = result[f.skill] ?? { correct: 0, total: 0 }; r.total++; if (f.ok) r.correct++; result[f.skill] = r; }
  const score = flags.filter((f) => f.ok).length;
  const u1Title = items[0]?.unit ?? "—";
  const comp = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${u1Title}`, scope: "unit", unit: u1Title, curriculum_unit_id: firstUnit, status: "completed", score, max_score: 8, result, created_by: I, completed_at: iso(Date.now() - 30 * DAY) }).select("id").single(), "completed assessment");
  must(await c.from("assessment_questions").insert(QBANK.slice(0, 8).map((q, i) => ({ assessment_id: comp.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i, response: { answer: flags[i].ok ? q[3] : q[2][1] }, is_correct: flags[i].ok }))), "completed questions");

  if (persona.tasks) {
    const u2 = items.find((it) => unitIdOf(it.id) !== firstUnit);
    const u2Unit = u2 ? unitIdOf(u2.id) : firstUnit;
    const draftA = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${u2?.unit ?? u1Title}`, scope: "unit", unit: u2?.unit ?? u1Title, curriculum_unit_id: u2Unit, status: "draft", created_by: I }).select("id").single(), "draft assessment");
    must(await c.from("assessment_questions").insert(QBANK.slice(2, 8).map((q, i) => ({ assessment_id: draftA.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i }))), "draft questions");
  }

  const stages = rows.reduce((m, r) => ((m[r.state] = (m[r.state] ?? 0) + 1), m), {});
  console.log(`  ✓ ${persona.name} — ${persona.level} (suggested ${persona.suggested}) · plan ${items.length} · taught ${taught} · stages ${JSON.stringify(stages)}`);
}

const main = async () => {
  const { data: people } = await c.from("profiles").select("id, full_name, roles, tenant_id");
  const instructor = (people ?? []).find((p) => (p.roles ?? []).includes("instructor"));
  if (!instructor) throw new Error("no instructor");
  const T = instructor.tenant_id, I = instructor.id;
  console.log(`Seeding 5 demo students under "${instructor.full_name}"...`);
  const ctx = { people: people ?? [], T, I };
  for (const p of PERSONAS) await seed(p, ctx);
  console.log("✓ Done — a class of 5 (catalog plans, A1+A2+B1).");
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
