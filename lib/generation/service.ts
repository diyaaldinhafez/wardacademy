import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Generation Service — the SINGLE server-side boundary through which every
 * Claude call passes (PRD §6). v1 AI scope (LOCKED, AE-7): placement test ·
 * plan/diagnostic · session-report drafts ONLY. Homework/unit-test items are
 * NOT generated here — they are served from the pre-built objective-tagged bank
 * (`items`); see migration 0070. (generateItem/generateAssessment were retired
 * in AE-7.) Nothing here reaches a student until an Instructor approves it.
 *
 * Keep all model access behind this module so caps, attribution hooks, and
 * model/version choices have exactly one place to live.
 */

// Cost guardrails (the account-level spend cap is set in the Anthropic console).
const MODEL = process.env.ANTHROPIC_GENERATION_MODEL ?? "claude-sonnet-4-6";

// Lazy so merely importing this module has no side effects (and never throws
// for a missing key in contexts that don't call the model).
let _client: Anthropic | null = null;
function client() {
  return (_client ??= new Anthropic()); // reads ANTHROPIC_API_KEY
}

export type ReportInput = {
  learnerName: string;
  lessonTitle?: string | null;
  engagement?: string; // Arabic label
  comprehension?: string; // Arabic label
  behavior?: string; // Arabic label
  focusNext?: string; // Arabic label
  teacherNote?: string; // free text
};
export type GeneratedReport = { summary: string; strengths: string; improve: string };

const REPORT_SYSTEM_AR =
  "تكتب تقريراً عربياً موجزاً ودافئاً ومهنياً لوليّ الأمر بعد جلسةٍ فرديةٍ لطفله في وَرد أكاديمي (أعمار 9–13). " +
  "ابنِ التقرير فقط على مُدخَلات المعلّم المُعطاة ولا تختلق وقائع أو أرقاماً أو أحداثاً. يجب أن يُقرأ في أقلّ من دقيقة، بنبرةٍ لطيفةٍ مشجّعةٍ غير تسويقية، بصيغة المخاطب لوليّ الأمر. " +
  "summary: ٢–٣ جُمَلٍ تلخّص الجلسة بإيجابيةٍ وصدق. strengths: جملةٌ واحدةٌ عن أبرز نقطة قوّة. improve: خطوةٌ تاليةٌ لطيفةٌ وعملية. " +
  "أعِد التقرير عبر أداة emit_report فقط.";

const reportTool: Anthropic.Tool = {
  name: "emit_report",
  description: "Return a short post-session report based on the progress data.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      strengths: { type: "string" },
      improve: { type: "string" },
    },
    required: ["summary", "strengths", "improve"],
  },
};

/** Draft a post-session report from the learner's progress (Arabic-only — PA-1/PA-4). Teacher edits + approves. */
export async function generateSessionReportDraft(input: ReportInput): Promise<GeneratedReport> {
  const L = { name: "اسم الطالب", lesson: "درس الجلسة", engagement: "تفاعل الطالب وحضوره", comprehension: "فهم الدرس", behavior: "المشاركة والسلوك", focusNext: "تركيز الجلسة القادمة", teacherNote: "ملاحظة المعلّم", go: "اكتب التقرير الآن." };
  const lines = [
    `${L.name}: ${input.learnerName}`,
    input.lessonTitle ? `${L.lesson}: ${input.lessonTitle}` : "",
    input.engagement ? `${L.engagement}: ${input.engagement}` : "",
    input.comprehension ? `${L.comprehension}: ${input.comprehension}` : "",
    input.behavior ? `${L.behavior}: ${input.behavior}` : "",
    input.focusNext ? `${L.focusNext}: ${input.focusNext}` : "",
    input.teacherNote ? `${L.teacherNote}: ${input.teacherNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1000, // Arabic is token-dense; the tool JSON must finish
    system: REPORT_SYSTEM_AR,
    tools: [reportTool],
    tool_choice: { type: "tool", name: "emit_report" },
    messages: [{ role: "user", content: `${lines}\n\n${L.go}` }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_report",
  );
  if (!toolUse) throw new Error("Report generation did not return a report");
  const out = toolUse.input as GeneratedReport;
  return { summary: out.summary, strengths: out.strengths, improve: out.improve };
}

export type PlacementQuestion = { level: string; prompt: string; options: string[]; answer: string };

const placementTool: Anthropic.Tool = {
  name: "emit_placement",
  description: "Return one original multiple-choice question per requested CEFR level.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            level: { type: "string", description: "The CEFR level this question targets (e.g. A1)." },
            prompt: { type: "string" },
            options: { type: "array", items: { type: "string" }, description: "Exactly 4 options." },
            answer: { type: "string", description: "The exact text of the correct option." },
          },
          required: ["level", "prompt", "options", "answer"],
        },
      },
    },
    required: ["questions"],
  },
};

/** Generate one original multiple-choice placement question per CEFR level. */
export async function generatePlacementQuestions(levels: string[]): Promise<PlacementQuestion[]> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You write original English placement questions for children aged 9–13. " +
      "For EACH requested CEFR level, write ONE multiple-choice question of difficulty appropriate to that level, " +
      "with exactly 4 options and the correct option's exact text as the answer. Invent fresh content — never copy " +
      "published material. Return everything by calling emit_placement.",
    tools: [placementTool],
    tool_choice: { type: "tool", name: "emit_placement" },
    messages: [{ role: "user", content: `Levels: ${levels.join(", ")}. One question each.` }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_placement",
  );
  if (!toolUse) throw new Error("Placement generation did not return questions");
  const out = toolUse.input as { questions: PlacementQuestion[] };
  return out.questions ?? [];
}

/** Generate a tailored placement test for a lead's student (grade + declared level). */
export async function generateLeadTest(input: {
  grade?: string | null;
  level?: string | null;
  count?: number;
}): Promise<PlacementQuestion[]> {
  const count = input.count ?? 10;
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 2500,
    system:
      `You write an English placement test for a child aged 9–13. Produce ${count} original multiple-choice ` +
      "questions tailored to the student's school grade and declared English level, spanning a RANGE of " +
      "difficulty around that level (some easier, some harder) so the result calibrates their TRUE level. " +
      "Each question has exactly 4 options, the correct option's exact text as the answer, and a CEFR level " +
      "tag. Invent fresh, age-appropriate content — never copy published material. Return via emit_placement.",
    tools: [placementTool],
    tool_choice: { type: "tool", name: "emit_placement" },
    messages: [
      {
        role: "user",
        content: `Student grade: "${input.grade ?? "unknown"}". Declared English level: "${input.level ?? "unknown"}". Generate ${count} questions.`,
      },
    ],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_placement",
  );
  if (!toolUse) throw new Error("Lead test generation returned nothing");
  const out = toolUse.input as { questions: PlacementQuestion[] };
  return out.questions ?? [];
}

export type DiagnosticInput = {
  studentName: string;
  age?: number | null;
  goal?: string | null;
  priorStudy?: string | null;
  englishUse?: string | null;
  homeLanguage?: string | null;
  selfLevels?: Record<string, string> | null;
  placementLevel?: string | null;
  introOutcome?: string | null;
  introNotes?: string | null;
  adminNote?: string | null;
};

const diagnosticTool: Anthropic.Tool = {
  name: "emit_diagnostic",
  description: "Return an internal Arabic teaching diagnostic for the teacher.",
  input_schema: {
    type: "object",
    properties: { report: { type: "string", description: "The diagnostic report text in Arabic." } },
    required: ["report"],
  },
};

/** Draft an internal Arabic diagnostic (baseline) from all of a new student's inputs. */
export async function generateDiagnostic(input: DiagnosticInput): Promise<string> {
  const lines = [
    `اسم الطالب: ${input.studentName}`,
    input.age != null ? `العمر: ${input.age}` : "",
    input.goal ? `هدف الانضمام: ${input.goal}` : "",
    input.priorStudy ? `دراسةٌ سابقة: ${input.priorStudy}` : "",
    input.englishUse ? `استخدام الإنجليزية: ${input.englishUse}` : "",
    input.homeLanguage ? `لغة المنزل: ${input.homeLanguage}` : "",
    input.selfLevels ? `تقييمٌ ذاتيّ للمهارات: ${Object.entries(input.selfLevels).map(([k, v]) => `${k}=${v}`).join("، ")}` : "",
    input.placementLevel ? `نتيجة اختبار التحديد: ${input.placementLevel}` : "",
    input.introOutcome ? `حصيلة الجلسة التعريفية: ${input.introOutcome}` : "",
    input.introNotes ? `ملاحظات الجلسة التعريفية: ${input.introNotes}` : "",
    input.adminNote ? `ملاحظة الإدارة الداخلية: ${input.adminNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      "تكتب تقرير تشخيصٍ تعليميّ موجزاً وداخلياً للمعلّمة (ليس للأهل) عن طالبٍ جديدٍ في وَرد أكاديمي (أعمار 9–13)، " +
      "بناءً على كلّ مدخلاته المُعطاة فقط دون اختلاق. نظّمه في أقسامٍ قصيرة: (1) المستوى التقديريّ ونقطة الانطلاق، " +
      "(2) نقاط القوّة عبر المهارات الخمس (استماع/تحدّث/قراءة/كتابة/مفردات)، (3) نقاط الضعف وأولويات التركيز، " +
      "(4) الدافعية والسلوك، (5) توصياتٌ تربويةٌ وتنبيهات. نقاطٌ موجزةٌ عملية، بلا مبالغةٍ ولا أرقامٍ مختلقة. " +
      "أعِد النصّ عبر أداة emit_diagnostic فقط.",
    tools: [diagnosticTool],
    tool_choice: { type: "tool", name: "emit_diagnostic" },
    messages: [{ role: "user", content: `${lines}\n\nاكتب تقرير التشخيص الآن.` }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_diagnostic",
  );
  if (!toolUse) throw new Error("Diagnostic generation returned nothing");
  const report = ((toolUse.input as { report?: string }).report ?? "").trim();
  if (!report) throw new Error("لم يكتمل توليد التشخيص — حاوِل مرّةً أخرى.");
  return report;
}

export type IntroReportInput = {
  studentName: string;
  engagement?: string; // Arabic label
  strengths?: string[]; // Arabic labels
  focus?: string[]; // Arabic labels
  level?: string;
  decision: "enroll" | "considering" | "declined";
  teacherNote?: string;
};

const introTool: Anthropic.Tool = {
  name: "emit_intro_report",
  description: "Return a warm Arabic intro-session report for the guardian.",
  input_schema: {
    type: "object",
    properties: { report: { type: "string", description: "The full report text in Arabic." } },
    required: ["report"],
  },
};

const DECISION_GUIDE: Record<string, string> = {
  enroll:
    "العائلة قرّرت التسجيل في الجلسة. اختم بلُطفٍ بأنّ الخطوة التالية هي تجهيز حسابَي وليّ الأمر والطالب ودعوتهم للدخول للمنصّة قريباً.",
  considering:
    "العائلة ما زالت تفكّر. اختم بدعوةٍ دافئةٍ غير ضاغطةٍ لاتخاذ خطوة التسجيل، مع الاستعداد للإجابة عن أيّ سؤال.",
  declined:
    "العائلة ليست مهتمّةً الآن. اختم بشكرٍ راقٍ وبابٍ مفتوحٍ للعودة متى رغبوا — دون أيّ ضغطٍ أو دعوةٍ للتسجيل.",
};

/** Draft a warm Arabic intro-session report for the guardian (operator edits + sends). */
export async function generateIntroReport(input: IntroReportInput): Promise<string> {
  const lines = [
    `اسم الطالب: ${input.studentName}`,
    input.engagement ? `تفاعل الطفل: ${input.engagement}` : "",
    input.strengths?.length ? `نقاط القوّة: ${input.strengths.join("، ")}` : "",
    input.focus?.length ? `أولويات التركيز: ${input.focus.join("، ")}` : "",
    input.level ? `المستوى المؤكَّد: ${input.level}` : "",
    input.teacherNote ? `ملاحظة المعلّم: ${input.teacherNote}` : "",
    `توجيه الخاتمة: ${DECISION_GUIDE[input.decision] ?? DECISION_GUIDE.considering}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 2000, // Arabic is token-dense; the tool JSON must finish or it returns empty
    system:
      "تكتب تقريراً عربياً دافئاً ومهنياً لوليّ أمرٍ بعد جلسةٍ تعريفيةٍ مجانيةٍ لطفله في وَرد أكاديمي (أعمار 9–13). " +
      "ابنِ التقرير فقط على المُدخَلات المُعطاة ولا تختلق وقائع أو أرقاماً. اكتب بنبرةٍ لطيفةٍ مشجّعةٍ غير تسويقية: " +
      "ابدأ بشكرٍ على الحضور، ثمّ ملخّصٌ موجزٌ وإيجابيٌّ للجلسة يُبرز نقاط قوّة الطفل، ثمّ نقطةٌ أو نقطتان للتركيز بلُطف، " +
      "ثمّ اختم حسب التوجيه المُعطى. فقرتان إلى ثلاث قصيرة، بصيغة المخاطب لوليّ الأمر، دون عناوين أو رموز. " +
      "أعِد النصّ عبر أداة emit_intro_report فقط.",
    tools: [introTool],
    tool_choice: { type: "tool", name: "emit_intro_report" },
    messages: [{ role: "user", content: `${lines}\n\nاكتب التقرير الآن.` }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_intro_report",
  );
  if (!toolUse) throw new Error("Intro report generation returned nothing");
  const report = ((toolUse.input as { report?: string }).report ?? "").trim();
  if (!report) throw new Error("لم يكتمل توليد التقرير — حاوِل مرّةً أخرى.");
  return report;
}

