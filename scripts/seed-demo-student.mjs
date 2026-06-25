// Seed one rich demo student (سارة, A2) with ~3 months of hand-authored history.
// NO AI (zero tokens). The plan is aggregated from the Ward Curriculum via the SAME
// path as production (aggregatePlanMirror == aggregatePlanItems); progress is seeded
// through objective_assessments so the DB trigger computes the decaying-average bloom
// (no direct injection). Run: node scripts/seed-demo-student.mjs
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";
import { aggregatePlanMirror } from "./lib/aggregatePlanMirror.mjs";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const iso = (d) => new Date(d).toISOString();
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const unitIdOf = (objectiveId) => objectiveId.split("-").slice(0, 2).join("-"); // "A2-U01-W1" → "A2-U01"
const stageFor = (v) => (v < 2 ? "seed" : v < 5.5 ? "bud" : v < 8.5 ? "balloon" : "bloom");
const clamp = (v) => Math.max(0, Math.min(10, Math.round(v * 100) / 100));

const main = async () => {
  const { data: people } = await c.from("profiles").select("id, full_name, roles, tenant_id");
  const learner = (people ?? []).find((p) => (p.roles ?? []).includes("learner") && (p.full_name ?? "").includes("سارة"))
    ?? (people ?? []).find((p) => (p.roles ?? []).includes("learner"));
  const instructor = (people ?? []).find((p) => (p.roles ?? []).includes("instructor"));
  if (!learner || !instructor) throw new Error("need a learner + instructor");
  const L = learner.id, I = instructor.id, T = learner.tenant_id;
  const LEVEL = "A2", TAUGHT = 11, STRENGTH = 0.72, LAG = ["speaking"];
  console.log(`Seeding "${learner.full_name}" (${L.slice(0, 8)}) under "${instructor.full_name}" — Level ${LEVEL}`);

  // — Clean prior data (new model) —
  await c.from("submissions").delete().eq("learner_id", L);
  await c.from("assignments").delete().eq("learner_id", L);
  await c.from("objective_assessments").delete().eq("student_id", L);
  await c.from("objective_progress").delete().eq("student_id", L);
  await c.from("manual_homework").delete().eq("learner_id", L);
  await c.from("assessments").delete().eq("learner_id", L); // cascades assessment_questions
  await c.from("sessions").delete().eq("learner_id", L);     // cascades session_reports
  await c.from("placement_tests").delete().eq("learner_id", L);
  await c.from("study_plans").delete().eq("learner_id", L);
  await c.from("profiles").update({ assigned_instructor_id: I }).eq("id", L);

  // — Structured placement (suggested = machine; confirmed = human) —
  await c.from("placement_tests").insert({ tenant_id: T, learner_id: L, status: "completed", suggested_level: LEVEL, confirmed_level: LEVEL, completed_at: iso("2026-03-30T12:00:00Z") });

  // — Plan aggregated from the catalog (same as production) —
  const items = await aggregatePlanMirror(c, LEVEL);
  const plan = must(await c.from("study_plans").insert({
    tenant_id: T, learner_id: L, title: `Ward Curriculum · Level ${LEVEL}`, level: LEVEL, items,
    status: "approved", track: "cefr", scope_label: `Ward Curriculum · Level ${LEVEL}`, milestone_label: `Level assessment on completing ${LEVEL}`,
    created_by: I, approved_at: iso("2026-04-01T10:00:00Z"),
  }).select("id").single(), "plan");

  // — Progress: ONE objective_assessments row per taught objective → trigger rolls up —
  const firstUnit = unitIdOf(items[0].id);
  const rows = [];
  for (let i = 0; i < Math.min(TAUGHT, items.length); i++) {
    const it = items[i];
    const value = clamp(STRENGTH * 10 - (LAG.includes(it.skill) ? 2.8 : 0) + ((((i * 17) % 7) - 3) * 0.3));
    rows.push({ tenant_id: T, student_id: L, objective_id: it.id, value, state: stageFor(value), evidence: unitIdOf(it.id) === firstUnit ? "auto" : "teacher", assessed_at: iso("2026-06-14T15:00:00Z") });
  }
  must(await c.from("objective_assessments").insert(rows), "objective_assessments");

  // — Sessions: weekly Tuesdays 15:00 UTC, 11 past + 2 future —
  const tuesdays = ["2026-04-07", "2026-04-14", "2026-04-21", "2026-04-28", "2026-05-05", "2026-05-12", "2026-05-19", "2026-05-26", "2026-06-02", "2026-06-09", "2026-06-16", "2026-06-23", "2026-06-30"];
  const sessionIds = [];
  for (let k = 0; k < tuesdays.length; k++) {
    const at = iso(`${tuesdays[k]}T15:00:00Z`);
    const past = new Date(at).getTime() < Date.now();
    const li = Math.min(k, items.length - 1);
    const s = must(await c.from("sessions").insert({ tenant_id: T, instructor_id: I, learner_id: L, scheduled_at: at, duration_minutes: 30, status: past ? "completed" : "scheduled", lesson_title: items[li].description, plan_item_index: li }).select("id").single(), `session ${k}`);
    sessionIds.push(s.id);
  }
  const pastSessions = sessionIds.slice(0, 11), futureSessions = sessionIds.slice(11);

  // — Reports: 9 approved + 1 draft (Jun9) + Jun16 left WITHOUT a report (a demo task) —
  const REPORTS = [
    ["جلسةٌ مثمرة؛ تابعَت سارة الدرس باهتمامٍ وأنجزت التمارين بدقّة.", "تركيزٌ وحماسٌ للمشاركة.", "مزيدٌ من القراءة الجهرية في البيت."],
    ["فهمٌ جيّدٌ لمقطع الاستماع والتقاطٌ للتفاصيل.", "إصغاءٌ نشطٌ ومنظّم.", "التدرّب على المفردات بالبطاقات."],
    ["قراءةٌ بطلاقةٍ معقولةٍ وإجابةٌ عن معظم الأسئلة.", "استيعابٌ جيّدٌ للفكرة العامّة.", "الانتباه لأزمنة الأفعال."],
    ["كتابةٌ مرتّبةٌ باستخدام روابط التسلسل.", "تنظيمٌ جميلٌ للأفكار.", "تنويع المفردات في الكتابة."],
    ["تعرّفت على المفردات الجديدة وربطتها بصورٍ بسهولة.", "ذاكرةٌ قويّةٌ للمفردات.", "استخدام الصفات في جُمَلٍ كاملة."],
    ["مشاركةٌ شفهيةٌ بثقةٍ متزايدة.", "ثقةٌ أكبر في التحدّث.", "إبطاء الإيقاع قليلاً للوضوح."],
    ["تابعت الحوار وفهمت أدوار المتحدّثين.", "إصغاءٌ نشط.", "إعادة الاستماع مرّةً في البيت."],
    ["قراءةٌ وفهمٌ سياقيٌّ جيّدٌ للنصّ.", "فهمٌ سياقيٌّ ممتاز.", "ملاحظة علامات الترقيم."],
    ["مراجعةٌ شاملةٌ للوحدتين بنشاطٍ ومثابرة.", "مثابرةٌ واضحة.", "حلّ تمرينٍ إضافيٍّ قبل الاختبار."],
  ];
  for (let k = 0; k < 9; k++) {
    const r = REPORTS[k];
    must(await c.from("session_reports").insert({ session_id: pastSessions[k], tenant_id: T, learner_id: L, summary: r[0], strengths: r[1], improve: r[2], status: "approved", approved_at: iso(`${tuesdays[k]}T16:00:00Z`) }), `report ${k}`);
  }
  must(await c.from("session_reports").insert({ session_id: pastSessions[9], tenant_id: T, learner_id: L, summary: "تقدّمٌ جيّدٌ في وحدةٍ جديدة؛ تفاعلت سارة بنشاط.", strengths: "فضولٌ ورغبةٌ في التعلّم.", improve: "حفظ خمس كلماتٍ جديدةٍ هذا الأسبوع.", status: "draft" }), "draft report");
  // pastSessions[10] (Jun16) → intentionally NO report (an "اكتب تقرير" task)

  // — Manual homework: 3 graded + 1 submitted + 1 assigned —
  const mh = [
    { title: "ورقة عمل: القاعدة الجديدة", status: "graded", score: 9, max_score: 10, feedback: "عملٌ رائع!", session: pastSessions[0], created: "2026-04-07", submitted: "2026-04-08", graded: "2026-04-09" },
    { title: "مطابقة المفردات بالصور", status: "graded", score: 8, max_score: 10, feedback: "أحسنتِ، انتبهي للتفاصيل.", session: pastSessions[4], created: "2026-05-05", submitted: "2026-05-06", graded: "2026-05-07" },
    { title: "كتابة: فقرة عن يومي", status: "graded", score: 7, max_score: 10, feedback: "فكرةٌ جميلة، راجعي الأزمنة.", session: pastSessions[3], created: "2026-04-28", submitted: "2026-04-29", graded: "2026-04-30" },
    { title: "تمرين الاستماع والإجابة", status: "submitted", session: pastSessions[10], created: "2026-06-16", submitted: "2026-06-17" },
    { title: "مراجعة الوحدة", status: "assigned", session: futureSessions[0], created: "2026-06-19" },
  ];
  for (const h of mh) {
    must(await c.from("manual_homework").insert({ tenant_id: T, learner_id: L, instructor_id: I, session_id: h.session, title: h.title, instructions: "حلّي التمرين وارفعي صورة الحلّ.", status: h.status, score: h.score ?? null, max_score: h.max_score ?? null, feedback: h.feedback ?? null, created_at: iso(`${h.created}T15:30:00Z`), submitted_at: h.submitted ? iso(`${h.submitted}T18:00:00Z`) : null, graded_at: h.graded ? iso(`${h.graded}T09:00:00Z`) : null }), `manual hw ${h.title}`);
  }

  // — Digital homework on catalog objectives (submissions carry no objective_id — like the live flow) —
  const mkItem = async (objIndex, prompt, options, answer, sessionId, correct) => {
    const item = must(await c.from("items").insert({ tenant_id: T, objective_id: items[Math.min(objIndex, items.length - 1)].id, format: "multiple_choice", difficulty: "easy", prompt, content: { options }, origin: "manual", status: "approved", created_by: I, target_learner_id: L, approved_by: I, approved_at: iso("2026-06-10T10:00:00Z") }).select("id").single(), "item");
    must(await c.from("item_keys").insert({ item_id: item.id, tenant_id: T, answer }), "item_keys");
    must(await c.from("assignments").insert({ tenant_id: T, item_id: item.id, learner_id: L, assigned_by: I, session_id: sessionId }), "assignment");
    must(await c.from("submissions").insert({ item_id: item.id, learner_id: L, response: { answer: correct ? answer : options[0] }, is_correct: correct, graded: true, graded_by: I, graded_at: iso("2026-06-12T18:00:00Z") }), "submission");
  };
  await mkItem(2, "She ___ to school every day.", ["goes", "go", "going", "gone"], "goes", pastSessions[9], true);
  await mkItem(5, "How do you introduce your sister?", ["This is my sister, Sara.", "She sister.", "Sister is.", "My is sister."], "This is my sister, Sara.", pastSessions[10], false);

  // — Assessments: completed (unit 1, catalog-tied) + draft (unit 2) —
  const u1Title = items[0].unit;
  const completed = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${u1Title}`, scope: "unit", unit: u1Title, curriculum_unit_id: firstUnit, status: "completed", score: 7, max_score: 8, result: { vocabulary: { correct: 3, total: 3 }, listening: { correct: 2, total: 2 }, reading: { correct: 1, total: 2 }, writing: { correct: 1, total: 1 } }, created_by: I, completed_at: iso("2026-05-02T16:00:00Z") }).select("id").single(), "completed assessment");
  const QB = [
    ["vocabulary", "She ___ to school every day.", ["goes", "go", "going", "gone"], "goes", true],
    ["vocabulary", "I ___ breakfast at 7 o'clock.", ["have", "haves", "having", "had"], "have", true],
    ["vocabulary", "He ___ his teeth in the morning.", ["brushes", "brush", "brushing", "broke"], "brushes", true],
    ["listening", "The girl wakes up at ___ (audio).", ["six", "seven", "eight", "nine"], "seven", true],
    ["listening", "After breakfast she goes to ___.", ["school", "the park", "bed", "work"], "school", true],
    ["reading", "The boy's routine starts with ___.", ["waking up", "lunch", "homework", "sleeping"], "waking up", true],
    ["reading", "The text says he ___ before school.", ["reads", "swims", "cooks", "drives"], "reads", false],
    ["writing", "Which word orders events correctly?", ["first", "fast", "funny", "free"], "first", true],
  ];
  must(await c.from("assessment_questions").insert(QB.map((q, i) => ({ assessment_id: completed.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i, response: { answer: q[4] ? q[3] : q[2][1] }, is_correct: q[4] }))), "completed questions");

  const u2 = items.find((it) => unitIdOf(it.id) !== firstUnit);
  const draft = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${u2?.unit ?? u1Title}`, scope: "unit", unit: u2?.unit ?? u1Title, curriculum_unit_id: u2 ? unitIdOf(u2.id) : firstUnit, status: "draft", created_by: I }).select("id").single(), "draft assessment");
  must(await c.from("assessment_questions").insert(QB.slice(2, 8).map((q, i) => ({ assessment_id: draft.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i }))), "draft questions");

  const stages = rows.reduce((m, r) => ((m[r.state] = (m[r.state] ?? 0) + 1), m), {});
  console.log(`✓ Done. سارة — catalog plan ${items.length} (L${LEVEL}) · taught ${rows.length} · stages ${JSON.stringify(stages)} · 13 sessions · 10 reports · 5+2 homework · 2 assessments.`);
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
