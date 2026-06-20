// Seed a whole demo CLASS — 5 varied students with ~months of hand-authored
// history (NO AI / zero tokens). Re-runnable: each student's data is cleared
// first. Run: node scripts/seed-demo-class.mjs
import pkg from "@next/env";
pkg.loadEnvConfig(process.cwd());
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const iso = (d) => new Date(d).toISOString();
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const DAY = 86400000;

// — Unit library: theme → 4 lessons {description, skill} —
const U = (unit, ...ls) => ({ unit, lessons: ls.map(([description, skill]) => ({ description, skill })) });
const LIB = {
  routines: U("الروتين اليوميّ", ["المضارع البسيط للعادات", "vocabulary"], ["الاستماع إلى وصف يومٍ دراسيّ", "listening"], ["قراءة فقرةٍ عن روتينٍ صباحيّ", "reading"], ["كتابة فقرةٍ عن يومك", "writing"]),
  family: U("عائلتي وأصدقائي", ["مفردات أفراد العائلة", "vocabulary"], ["التحدّث: تقديم عائلتك", "speaking"], ["الاستماع إلى حوارٍ بين صديقين", "listening"], ["قراءة رسالةٍ من صديق", "reading"]),
  town: U("في المدينة", ["مفردات الأماكن والاتّجاهات", "vocabulary"], ["التحدّث: السؤال عن الطريق", "speaking"], ["الاستماع إلى إعلاناتٍ في المدينة", "listening"], ["كتابة بطاقةٍ بريديةٍ عن مدينتك", "writing"]),
  food: U("الطعام والمطاعم", ["مفردات الطعام والمقادير", "vocabulary"], ["التحدّث: الطلب في مطعم", "speaking"], ["قراءة قائمة طعامٍ ووصفة", "reading"], ["كتابة وصفةٍ بسيطة", "writing"]),
  hobbies: U("هواياتي ووقت الفراغ", ["مفردات الهوايات", "vocabulary"], ["الاستماع إلى أشخاصٍ يصفون هواياتهم", "listening"], ["قراءة مقالٍ عن الرياضة", "reading"], ["التحدّث: هوايتك المفضّلة", "speaking"]),
  school: U("الحياة المدرسيّة", ["مفردات المواد والصفّ", "vocabulary"], ["الاستماع إلى جدولٍ دراسيّ", "listening"], ["قراءة قواعد المدرسة", "reading"], ["كتابة عن مادّتك المفضّلة", "writing"]),
  travel: U("السفر والعُطَل", ["مفردات السفر والمطار", "vocabulary"], ["الزمن الماضي: عُطلتي الأخيرة", "writing"], ["الاستماع إلى إعلانات السفر", "listening"], ["التحدّث: التخطيط لرحلة", "speaking"]),
  shopping: U("التسوّق", ["مفردات الملابس والأسعار", "vocabulary"], ["التحدّث: في المتجر", "speaking"], ["قراءة إعلاناتِ تخفيضات", "reading"], ["كتابة قائمة تسوّق", "writing"]),
  future: U("خططي المستقبليّة", ["زمن المستقبل (will / going to)", "writing"], ["التحدّث: أحلامي ووظيفتي", "speaking"], ["الاستماع إلى أهدافِ أشخاص", "listening"], ["قراءة مقالٍ عن المهن", "reading"]),
};

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
  ["vocabulary", "She ___ to school every day.", ["goes", "go", "going", "gone"], "goes"],
  ["vocabulary", "I ___ breakfast at seven o'clock.", ["have", "haves", "having", "had"], "have"],
  ["reading", "The text says the boy ___ before school.", ["reads", "swims", "cooks", "drives"], "reads"],
  ["reading", "The story is mainly about ___.", ["a daily routine", "a holiday", "a recipe", "a match"], "a daily routine"],
  ["listening", "From the audio, she wakes up at ___.", ["seven", "six", "eight", "nine"], "seven"],
  ["listening", "After breakfast she goes to ___.", ["school", "the park", "bed", "work"], "school"],
  ["writing", "Which word orders events first?", ["first", "fast", "funny", "free"], "first"],
  ["vocabulary", "My mother's mother is my ___.", ["grandmother", "aunt", "sister", "cousin"], "grandmother"],
  ["reading", "A 'bakery' is a place to buy ___.", ["bread", "books", "shoes", "fruit"], "bread"],
  ["writing", "Choose the correct adjective: He is very ___.", ["kind", "kindly", "kindness", "kinds"], "kind"],
];
const SPEAK = [{ v: 0.25, l: "يبدأ" }, { v: 0.5, l: "تتطوّر" }, { v: 0.75, l: "جيّدة" }, { v: 1, l: "متمكّنة" }];
const speakFor = (s) => SPEAK.reduce((a, b) => (Math.abs(b.v - s) < Math.abs(a.v - s) ? b : a));

const PERSONAS = [
  { name: "سارة عبدالله", match: "سارة", level: "A2", units: ["routines", "family", "town"], taught: 7, strength: 0.72, lag: ["speaking"], wd: 2, time: "15:00", tasks: true },
  { name: "يوسف الخطيب", match: "يوسف", level: "B1", units: ["food", "travel", "future"], taught: 10, strength: 0.86, lag: ["writing"], wd: 1, time: "16:00", tasks: false },
  { name: "لمى الحربي", level: "A2", units: ["school", "hobbies", "shopping"], taught: 8, strength: 0.74, lag: ["speaking"], wd: 3, time: "14:00", tasks: false },
  { name: "عمر الزهراني", level: "B1", units: ["travel", "food", "future"], taught: 11, strength: 0.9, lag: [], wd: 4, time: "17:00", tasks: false },
  { name: "رغد القحطاني", level: "A2", units: ["hobbies", "routines", "family"], taught: 5, strength: 0.58, lag: ["writing"], wd: 0, time: "13:00", tasks: true },
];

function weeklyDates(wd, time, taught) {
  const [hh, mm] = time.split(":").map(Number);
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
  while (d.getUTCDay() !== wd || d.getTime() < now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  const future = [new Date(d), new Date(d.getTime() + 7 * DAY)];
  const past = [];
  let p = new Date(d.getTime() - 7 * DAY);
  for (let i = 0; i < taught; i++) { past.unshift(new Date(p)); p = new Date(p.getTime() - 7 * DAY); }
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
  await c.from("progress_records").delete().eq("learner_id", L);
  await c.from("manual_homework").delete().eq("learner_id", L);
  await c.from("assessments").delete().eq("learner_id", L);
  await c.from("sessions").delete().eq("learner_id", L);
  await c.from("skill_assessments").delete().eq("learner_id", L);
  await c.from("placement_tests").delete().eq("learner_id", L);
  const { data: ps } = await c.from("study_plans").select("id").eq("learner_id", L);
  if ((ps ?? []).length) await c.from("objectives").delete().in("plan_id", ps.map((p) => p.id));
  await c.from("study_plans").delete().eq("learner_id", L);
}

async function seed(persona, ctx) {
  const prof = await ensureLearner(persona, ctx);
  const L = prof.id, { T, I } = ctx;
  await clearLearner(L);

  await c.from("placement_tests").insert({ tenant_id: T, learner_id: L, status: "completed", suggested_level: persona.level, completed_at: iso(Date.now() - 90 * DAY) });

  const lessons = persona.units.flatMap((k) => LIB[k].lessons.map((l) => ({ id: randomUUID(), description: l.description, level: persona.level, skill: l.skill, unit: LIB[k].unit })));
  const plan = must(await c.from("study_plans").insert({ tenant_id: T, learner_id: L, title: `منهاج وَرد — المستوى ${persona.level}`, level: persona.level, items: lessons, status: "approved", track: "cefr", scope_label: `${persona.level} · منهاج وَرد`, milestone_label: "تقييمٌ عند إتمام المنهاج", created_by: I, approved_at: iso(Date.now() - 92 * DAY) }).select("id").single(), "plan");
  must(await c.from("objectives").insert(lessons.map((l) => ({ tenant_id: T, track: "cefr", level: persona.level, description: l.description, skill: l.skill, unit: l.unit, plan_id: plan.id, plan_lesson_id: l.id, created_by: I }))), "objectives");
  const { data: objs } = await c.from("objectives").select("id, plan_lesson_id").eq("plan_id", plan.id);
  const objOf = (i) => objs.find((o) => o.plan_lesson_id === lessons[i].id).id;

  // Progress for taught lessons (varied; lag skills weaker; current lesson partial)
  const prog = [];
  for (let i = 0; i < persona.taught; i++) {
    const sk = lessons[i].skill;
    const ratio = Math.max(0.2, Math.min(0.95, persona.strength - (persona.lag.includes(sk) ? 0.28 : 0) + (((i * 17) % 7) - 3) * 0.02));
    const last = i === persona.taught - 1;
    const attempts = last ? 3 : 5 + ((i * 13) % 4);
    const correct = Math.max(0, Math.min(attempts, Math.round(attempts * ratio)));
    prog.push({ tenant_id: T, learner_id: L, objective_id: objOf(i), attempts, correct, completions: 0, last_activity_at: iso(Date.now() - (persona.taught - i) * 7 * DAY) });
  }
  must(await c.from("progress_records").insert(prog), "progress");

  const sp = speakFor(persona.strength - (persona.lag.includes("speaking") ? 0.25 : 0));
  must(await c.from("skill_assessments").insert({ tenant_id: T, learner_id: L, skill: "speaking", value: sp.v, label: sp.l, updated_by: I }), "speaking");

  // Sessions
  const { past, future } = weeklyDates(persona.wd, persona.time, persona.taught);
  const pastIds = [], futureIds = [];
  for (let i = 0; i < past.length; i++) {
    const s = must(await c.from("sessions").insert({ tenant_id: T, instructor_id: I, learner_id: L, scheduled_at: iso(past[i]), duration_minutes: 30, status: "completed", lesson_title: lessons[i].description, plan_item_index: i }).select("id").single(), "past session");
    pastIds.push(s.id);
  }
  for (let i = 0; i < future.length; i++) {
    const li = Math.min(persona.taught + i, lessons.length - 1);
    const s = must(await c.from("sessions").insert({ tenant_id: T, instructor_id: I, learner_id: L, scheduled_at: iso(future[i]), duration_minutes: 30, status: "scheduled", lesson_title: lessons[li].description, plan_item_index: li }).select("id").single(), "future session");
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

  // Digital homework: 2 items + graded submissions (feed progress on 2 taught objectives)
  const mkItem = async (objIndex, q, sessionId, correct) => {
    const item = must(await c.from("items").insert({ tenant_id: T, objective_id: objOf(objIndex), format: "multiple_choice", difficulty: "easy", prompt: q[1], content: { options: q[2] }, origin: "manual", status: "approved", created_by: I, target_learner_id: L, approved_by: I, approved_at: iso(Date.now() - 15 * DAY) }).select("id").single(), "item");
    await c.from("item_keys").insert({ item_id: item.id, tenant_id: T, answer: q[3] });
    await c.from("assignments").insert({ tenant_id: T, item_id: item.id, learner_id: L, assigned_by: I, session_id: sessionId });
    await c.from("submissions").insert({ item_id: item.id, learner_id: L, response: { answer: correct ? q[3] : q[2][1] }, is_correct: correct, graded: true, graded_by: I, graded_at: iso(Date.now() - 12 * DAY) });
  };
  await mkItem(1, QBANK[0], pastIds[1], true);
  await mkItem(Math.min(3, persona.taught - 1), QBANK[2], pastIds[Math.min(3, pastIds.length - 1)], persona.strength > 0.7);

  // Assessments: 1 completed (unit 1, per-skill result) + (tasks: 1 draft unit 2)
  const flags = QBANK.slice(0, 8).map(([skill], i) => ({ skill, ok: ((i * 37 + 13) % 100) / 100 < (persona.strength - (persona.lag.includes(skill) ? 0.3 : 0)) }));
  const result = {};
  for (const f of flags) { const r = result[f.skill] ?? { correct: 0, total: 0 }; r.total++; if (f.ok) r.correct++; result[f.skill] = r; }
  const score = flags.filter((f) => f.ok).length;
  const u1 = LIB[persona.units[0]].unit, u2 = LIB[persona.units[1]].unit;
  const comp = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${u1}`, scope: "unit", unit: u1, status: "completed", score, max_score: 8, result, created_by: I, completed_at: iso(Date.now() - 30 * DAY) }).select("id").single(), "completed assessment");
  must(await c.from("assessment_questions").insert(QBANK.slice(0, 8).map((q, i) => ({ assessment_id: comp.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i, response: { answer: flags[i].ok ? q[3] : q[2][1] }, is_correct: flags[i].ok }))), "completed questions");

  if (persona.tasks) {
    const draftA = must(await c.from("assessments").insert({ tenant_id: T, learner_id: L, title: `اختبار وحدة: ${u2}`, scope: "unit", unit: u2, status: "draft", created_by: I }).select("id").single(), "draft assessment");
    must(await c.from("assessment_questions").insert(QBANK.slice(2, 8).map((q, i) => ({ assessment_id: draftA.id, tenant_id: T, skill: q[0], format: "multiple_choice", prompt: q[1], content: { options: q[2] }, answer: q[3], position: i }))), "draft questions");
  }

  const A = prog.reduce((s, r) => s + r.attempts, 0), C = prog.reduce((s, r) => s + r.correct, 0);
  console.log(`  ✓ ${persona.name} — ${persona.level} · ${persona.taught}/${lessons.length} دروس · جلسات ${past.length} · إتقان ${Math.round((C / A) * 100)}%${persona.tasks ? " · لديه مهامّ" : ""}`);
}

const main = async () => {
  const { data: people } = await c.from("profiles").select("id, full_name, roles, tenant_id");
  const instructor = (people ?? []).find((p) => (p.roles ?? []).includes("instructor"));
  if (!instructor) throw new Error("no instructor");
  const T = instructor.tenant_id, I = instructor.id;
  console.log(`Seeding 5 demo students under "${instructor.full_name}"...`);
  const ctx = { people: people ?? [], T, I };
  for (const p of PERSONAS) await seed(p, ctx);
  console.log("✓ Done — a class of 5.");
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
