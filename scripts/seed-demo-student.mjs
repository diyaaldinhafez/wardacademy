// Seed one rich demo student (سارة) with ~3 months of hand-authored history.
// NO AI generation is used — every report, plan, question and homework is written
// here as plain data, so it costs zero tokens. Run: node scripts/seed-demo-student.mjs
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const iso = (d) => new Date(d).toISOString();
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const main = async () => {
  // — Who —
  const { data: people } = await c.from("profiles").select("id, full_name, roles, tenant_id");
  const learner = (people ?? []).find((p) => (p.roles ?? []).includes("learner") && (p.full_name ?? "").includes("سارة"))
    ?? (people ?? []).find((p) => (p.roles ?? []).includes("learner"));
  const instructor = (people ?? []).find((p) => (p.roles ?? []).includes("instructor"));
  if (!learner || !instructor) throw new Error("need a learner + instructor");
  const L = learner.id, I = instructor.id, T = learner.tenant_id;
  console.log(`Seeding "${learner.full_name}" (${L.slice(0, 8)}) under "${instructor.full_name}"`);

  // — Clean any prior data for this learner —
  await c.from("submissions").delete().eq("learner_id", L);
  await c.from("assignments").delete().eq("learner_id", L);
  await c.from("progress_records").delete().eq("learner_id", L);
  await c.from("manual_homework").delete().eq("learner_id", L);
  await c.from("assessments").delete().eq("learner_id", L); // cascades assessment_questions
  await c.from("sessions").delete().eq("learner_id", L);    // cascades session_reports
  await c.from("skill_assessments").delete().eq("learner_id", L);
  await c.from("placement_tests").delete().eq("learner_id", L);
  const { data: oldPlans } = await c.from("study_plans").select("id").eq("learner_id", L);
  const oldPlanIds = (oldPlans ?? []).map((p) => p.id);
  if (oldPlanIds.length) await c.from("objectives").delete().in("plan_id", oldPlanIds); // cascades items/keys/subs
  await c.from("study_plans").delete().eq("learner_id", L);

  await c.from("profiles").update({ assigned_instructor_id: I }).eq("id", L);

  // — Placement (level) —
  await c.from("placement_tests").insert({ tenant_id: T, learner_id: L, status: "completed", suggested_level: "A2", completed_at: iso("2026-03-30T12:00:00Z") });

  // — Study plan (approved) —
  const U1 = "الوحدة 1: روتيني اليوميّ", U2 = "الوحدة 2: عائلتي وأصدقائي", U3 = "الوحدة 3: في المدينة";
  const L_ = (description, skill, unit) => ({ id: randomUUID(), description, level: "A2", skill, unit });
  const lessons = [
    L_("المضارع البسيط للعادات اليوميّة", "vocabulary", U1),
    L_("الاستماع إلى وصف يومٍ دراسيّ", "listening", U1),
    L_("قراءة فقرةٍ عن روتينٍ صباحيّ", "reading", U1),
    L_("كتابة فقرةٍ عن يومك (first / then / finally)", "writing", U1),
    L_("مفردات أفراد العائلة وصفاتهم", "vocabulary", U2),
    L_("التحدّث: تقديم أفراد عائلتك", "speaking", U2),
    L_("الاستماع إلى حوارٍ بين صديقين", "listening", U2),
    L_("قراءة رسالةٍ قصيرةٍ من صديق", "reading", U2),
    L_("مفردات الأماكن والاتّجاهات", "vocabulary", U3),
    L_("التحدّث: السؤال عن الطريق", "speaking", U3),
    L_("الاستماع إلى إعلاناتٍ في المدينة", "listening", U3),
    L_("كتابة بطاقةٍ بريديةٍ عن مدينتك", "writing", U3),
  ];
  const plan = must(await c.from("study_plans").insert({
    tenant_id: T, learner_id: L, title: "منهاج وَرد — المستوى A2", level: "A2", items: lessons,
    status: "approved", track: "cefr", scope_label: "A2 · منهاج وَرد", milestone_label: "تقييمٌ عند إتمام المنهاج",
    created_by: I, approved_at: iso("2026-04-01T10:00:00Z"),
  }).select("id").single(), "plan");

  // — Objectives (materialised) —
  const objRows = lessons.map((l) => ({ tenant_id: T, track: "cefr", level: "A2", description: l.description, skill: l.skill, unit: l.unit, plan_id: plan.id, plan_lesson_id: l.id, created_by: I }));
  must(await c.from("objectives").insert(objRows), "objectives");
  const { data: objs } = await c.from("objectives").select("id, plan_lesson_id").eq("plan_id", plan.id);
  const objByLesson = new Map(objs.map((o) => [o.plan_lesson_id, o.id]));
  const objOf = (i) => objByLesson.get(lessons[i].id);

  // — Progress (drives the Bloom map). Lessons 9 & 10 get theirs from real submissions below. —
  const prog = [
    [0, 9, 8], [1, 7, 6], [2, 8, 5], [3, 6, 5],   // unit 1 — mostly mastered
    [4, 6, 4], [5, 4, 2], [6, 3, 1], [7, 2, 1],   // unit 2 — in progress (5 & 6 lagging)
    [8, 1, 0],                                      // unit 3 — just starting
  ].map(([i, attempts, correct]) => ({ tenant_id: T, learner_id: L, objective_id: objOf(i), attempts, correct, completions: 0, last_activity_at: iso("2026-06-14T15:00:00Z") }));
  must(await c.from("progress_records").insert(prog), "progress");

  // — Speaking (teacher-assessed) —
  must(await c.from("skill_assessments").insert({ tenant_id: T, learner_id: L, skill: "speaking", value: 0.75, label: "جيّدة", updated_by: I }), "speaking");

  // — Sessions: weekly Tuesdays 15:00 UTC, 11 past (completed) + 2 future (scheduled) —
  const tuesdays = ["2026-04-07", "2026-04-14", "2026-04-21", "2026-04-28", "2026-05-05", "2026-05-12", "2026-05-19", "2026-05-26", "2026-06-02", "2026-06-09", "2026-06-16", "2026-06-23", "2026-06-30"];
  const sessionIds = [];
  for (let k = 0; k < tuesdays.length; k++) {
    const at = iso(`${tuesdays[k]}T15:00:00Z`);
    const past = new Date(at).getTime() < Date.now();
    const li = Math.min(k, lessons.length - 1);
    const s = must(await c.from("sessions").insert({
      tenant_id: T, instructor_id: I, learner_id: L, scheduled_at: at, duration_minutes: 30,
      status: past ? "completed" : "scheduled", lesson_title: lessons[li].description, plan_item_index: li,
    }).select("id, scheduled_at").single(), `session ${k}`);
    sessionIds.push(s.id);
  }
  const pastSessions = sessionIds.slice(0, 11); // Apr7 .. Jun16
  const futureSessions = sessionIds.slice(11);  // Jun23, Jun30

  // — Session reports: 9 approved, 1 draft (Jun9), last one (Jun16) left WITHOUT a report (a demo task) —
  const reportText = [
    ["جلسةٌ مثمرة؛ تابعَت سارة الدرس باهتمامٍ وأنجزت تمارين المضارع البسيط بدقّة.", "نطقٌ واضحٌ وحماسٌ للمشاركة.", "مزيدٌ من القراءة الجهرية في البيت."],
    ["فهمت سارة الاستماع جيّداً والتقطت التفاصيل الأساسية من المقطع.", "تركيزٌ عالٍ أثناء الاستماع.", "التدرّب على الكلمات الجديدة بالبطاقات."],
    ["قرأت الفقرة بطلاقةٍ معقولةٍ وأجابت عن معظم الأسئلة.", "استيعابٌ جيّدٌ للفكرة العامّة.", "الانتباه لأزمنة الأفعال عند القراءة."],
    ["كتبت سارة فقرةً مرتّبةً مستخدمةً روابط التسلسل.", "تنظيمٌ جميلٌ للأفكار.", "تنويع المفردات قليلاً في الكتابة."],
    ["تعرّفت على مفردات العائلة وربطتها بصورٍ بسهولة.", "ذاكرةٌ قويّةٌ للمفردات.", "استخدام الصفات في جُمَلٍ كاملة."],
    ["شاركت سارة في تقديم عائلتها شفهياً بثقةٍ متزايدة.", "ثقةٌ أكبر في التحدّث.", "إبطاء الإيقاع قليلاً لوضوحٍ أكبر."],
    ["تابعت الحوار وفهمت أدوار المتحدّثين.", "إصغاءٌ نشط.", "إعادة الاستماع مرّةً في البيت."],
    ["قرأت الرسالة وفهمت مقصدها بشكلٍ جيّد.", "فهمٌ سياقيٌّ ممتاز.", "ملاحظة علامات الترقيم."],
    ["مراجعةٌ شاملةٌ للوحدتين الأولى والثانية بنشاط.", "مثابرةٌ واضحة.", "حلّ تمرينٍ إضافيٍّ قبل الاختبار."],
  ];
  for (let k = 0; k < 9; k++) {
    const r = reportText[k];
    must(await c.from("session_reports").insert({ session_id: pastSessions[k], tenant_id: T, learner_id: L, summary: r[0], strengths: r[1], improve: r[2], status: "approved", approved_at: iso(`${tuesdays[k]}T16:00:00Z`) }), `report ${k}`);
  }
  // Jun9 (index 9) → a DRAFT report awaiting approval
  must(await c.from("session_reports").insert({ session_id: pastSessions[9], tenant_id: T, learner_id: L, summary: "بدأنا مفردات الأماكن والاتّجاهات؛ تفاعلت سارة جيّداً.", strengths: "فضولٌ ورغبةٌ في التعلّم.", improve: "حفظ خمس كلماتٍ جديدةٍ هذا الأسبوع.", status: "draft" }), "draft report");
  // pastSessions[10] (Jun16) → intentionally NO report (becomes an "اكتب تقرير" task)

  // — Manual homework: 3 graded, 1 submitted (a "صحّح" task), 1 assigned —
  const mh = [
    { title: "ورقة عمل: المضارع البسيط", instructions: "أكمِلي الجُمَل بالفعل الصحيح.", status: "graded", score: 9, max_score: 10, feedback: "عملٌ رائع!", session: pastSessions[0], created: "2026-04-07", submitted: "2026-04-08", graded: "2026-04-09" },
    { title: "مفردات العائلة — مطابقة", instructions: "طابِقي الكلمة بالصورة.", status: "graded", score: 8, max_score: 10, feedback: "أحسنتِ، انتبهي للصفات.", session: pastSessions[4], created: "2026-05-05", submitted: "2026-05-06", graded: "2026-05-07" },
    { title: "كتابة: فقرة عن يومي", instructions: "اكتبي خمس جُمَلٍ عن روتينك.", status: "graded", score: 7, max_score: 10, feedback: "فكرةٌ جميلة، راجعي الأزمنة.", session: pastSessions[3], created: "2026-04-28", submitted: "2026-04-29", graded: "2026-04-30" },
    { title: "تمرين الاتّجاهات", instructions: "ارسمي الطريق ثمّ صِفيه.", status: "submitted", session: pastSessions[10], created: "2026-06-16", submitted: "2026-06-17" },
    { title: "مراجعة الوحدة الثانية", instructions: "حلّي صفحة المراجعة في الكتاب.", status: "assigned", session: futureSessions[0], created: "2026-06-19" },
  ];
  for (const h of mh) {
    must(await c.from("manual_homework").insert({
      tenant_id: T, learner_id: L, instructor_id: I, session_id: h.session, title: h.title, instructions: h.instructions,
      status: h.status, score: h.score ?? null, max_score: h.max_score ?? null, feedback: h.feedback ?? null,
      created_at: iso(`${h.created}T15:30:00Z`), submitted_at: h.submitted ? iso(`${h.submitted}T18:00:00Z`) : null, graded_at: h.graded ? iso(`${h.graded}T09:00:00Z`) : null,
    }), `manual hw ${h.title}`);
  }

  // — Digital homework (items + assignment + graded submission → feeds obj 9 & 10 progress via trigger) —
  const mkItem = async (objIndex, prompt, options, answer, sessionId, correct) => {
    const item = must(await c.from("items").insert({ tenant_id: T, objective_id: objOf(objIndex), format: "multiple_choice", difficulty: "easy", prompt, content: { options }, origin: "manual", status: "approved", created_by: I, target_learner_id: L, approved_by: I, approved_at: iso("2026-06-10T10:00:00Z") }).select("id").single(), "item");
    await c.from("item_keys").insert({ item_id: item.id, tenant_id: T, answer });
    await c.from("assignments").insert({ tenant_id: T, item_id: item.id, learner_id: L, assigned_by: I, session_id: sessionId });
    await c.from("submissions").insert({ item_id: item.id, learner_id: L, response: { answer: correct ? answer : options[0] }, is_correct: correct, graded: true, graded_by: I, graded_at: iso("2026-06-12T18:00:00Z") });
  };
  await mkItem(8, "Where can you buy bread?", ["bakery", "library", "bank", "park"], "bakery", pastSessions[9], true);
  await mkItem(9, "How do you ask for directions politely?", ["Excuse me, where is the station?", "Give me the station.", "Station now.", "You go station."], "Excuse me, where is the station?", pastSessions[10], false);

  // — Assessments: one completed (unit 1) + one draft (unit 2, an "اعتمِد اختبار" task) —
  const completed = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${U1}`, scope: "unit", unit: U1, status: "completed", score: 7, max_score: 8, result: { vocabulary: { correct: 3, total: 3 }, listening: { correct: 2, total: 2 }, reading: { correct: 1, total: 2 }, writing: { correct: 1, total: 1 } }, created_by: I, completed_at: iso("2026-05-02T16:00:00Z") }).select("id").single(), "completed assessment");
  const cq = [
    ["vocabulary", "She ___ to school every day.", ["goes", "go", "going", "gone"], "goes", true],
    ["vocabulary", "I ___ breakfast at 7 o'clock.", ["have", "haves", "having", "had"], "have", true],
    ["vocabulary", "He ___ his teeth in the morning.", ["brushes", "brush", "brushing", "broke"], "brushes", true],
    ["listening", "The girl wakes up at ___ (from the audio).", ["six", "seven", "eight", "nine"], "seven", true],
    ["listening", "After breakfast she goes to ___.", ["school", "the park", "bed", "work"], "school", true],
    ["reading", "In the paragraph, the boy's routine starts with ___.", ["waking up", "lunch", "homework", "sleeping"], "waking up", true],
    ["reading", "The text says he ___ before school.", ["reads", "swims", "cooks", "drives"], "reads", false],
    ["writing", "Which word orders events correctly?", ["first", "fast", "funny", "free"], "first", true],
  ].map((q, i) => ({ assessment_id: completed.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i, response: { answer: q[4] ? q[3] : q[2][1] }, is_correct: q[4] }));
  must(await c.from("assessment_questions").insert(cq), "completed questions");

  const draft = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${U2}`, scope: "unit", unit: U2, status: "draft", created_by: I }).select("id").single(), "draft assessment");
  const dq = [
    ["vocabulary", "My mother's mother is my ___.", ["grandmother", "aunt", "sister", "cousin"], "grandmother"],
    ["vocabulary", "My father's brother is my ___.", ["uncle", "nephew", "grandfather", "son"], "uncle"],
    ["speaking", "How do you introduce your sister?", ["This is my sister, Sara.", "She sister.", "Sister is.", "My is sister."], "This is my sister, Sara."],
    ["listening", "In the dialogue, the friends talk about ___.", ["weekend plans", "homework", "the weather", "food"], "weekend plans"],
    ["reading", "The letter is from Sara's ___.", ["friend", "teacher", "doctor", "neighbour"], "friend"],
    ["writing", "Choose the correct adjective: My brother is very ___.", ["kind", "kindly", "kindness", "kinds"], "kind"],
  ].map((q, i) => ({ assessment_id: draft.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i }));
  must(await c.from("assessment_questions").insert(dq), "draft questions");

  console.log("✓ Done. Seeded: plan(12 lessons) · 9 objectives w/ progress · 13 sessions (11 past) · 10 reports (1 draft, 1 missing) · 5 manual + 2 digital homework · 2 assessments (1 completed, 1 draft) · speaking + placement.");
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
