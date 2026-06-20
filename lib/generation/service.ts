import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ITEM_FORMATS, DIFFICULTIES, type ItemFormat, type Difficulty } from "@/lib/items";

/**
 * Generation Service — the SINGLE server-side boundary through which every
 * Claude call passes (PRD §6). v1 produces *original* content targeting an
 * objective; nothing here reaches a student until an Instructor approves it
 * (the approval gate lives in the database — see migration 0005).
 *
 * Keep all model access behind this module so caps, attribution hooks, and
 * model/version choices have exactly one place to live.
 */

export type GenerateItemInput = {
  objective: { description: string; track: "cefr" | "school"; level?: string | null };
  format: ItemFormat;
  difficulty: Difficulty;
};

export type GeneratedItem = {
  prompt: string;
  content: Record<string, unknown>; // format-specific (options, answer, explanation…)
  usage: { input_tokens: number; output_tokens: number };
};

// Cost guardrails (the account-level spend cap is set in the Anthropic console).
const MODEL = process.env.ANTHROPIC_GENERATION_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

// Lazy so merely importing this module has no side effects (and never throws
// for a missing key in contexts that don't call the model).
let _client: Anthropic | null = null;
function client() {
  return (_client ??= new Anthropic()); // reads ANTHROPIC_API_KEY
}

const SYSTEM = `You are an English-teaching content author for Ward Academy, a 1:1 tutoring platform for children aged 9–13.

Rules:
- Produce ONE original practice item. Never copy or paraphrase copyrighted textbooks, passages, or published exercises — invent fresh content.
- Target the given learning objective and level, in the requested format and difficulty.
- Keep language age-appropriate, clear, and encouraging. The item is reviewed by a teacher before any student sees it.
- Write clean text only: no stray characters, trailing braces, code fences, or markdown artifacts.
- For "multiple_choice", set "answer" to the EXACT text of the correct option (not an index).
- For "audio", the student READS the given word/sentence aloud and records themselves — do NOT assume any audio is played to them (there is no playback); the teacher may model the pronunciation. Put a short marking "rubric" in content.
- For "open", "answer" may be null; put a short marking "rubric" in content.
- Return the item ONLY by calling the emit_item tool.`;

const itemTool: Anthropic.Tool = {
  name: "emit_item",
  description: "Return exactly one original practice item targeting the objective.",
  input_schema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The question or instruction shown to the student.",
      },
      content: {
        type: "object",
        description:
          "Format-specific payload. multiple_choice: options[] + answer (the correct " +
          "option's exact text). matching: options[] + answer[]. true_false: answer " +
          "(boolean). fill_blank: answer (string). open/audio: answer null + a rubric. " +
          "Always include a teacher explanation.",
        properties: {
          options: { type: "array", items: { type: "string" } },
          answer: {
            description: "Correct answer as text (option text for multiple_choice), boolean, string, or array; null for open/audio.",
          },
          rubric: { type: "string", description: "Short marking rubric (for open/audio items)." },
          explanation: { type: "string", description: "Short rationale for the teacher." },
        },
        additionalProperties: true,
      },
    },
    required: ["prompt", "content"],
  },
};

function assertValid(input: GenerateItemInput) {
  if (!ITEM_FORMATS.includes(input.format)) throw new Error(`Unknown format: ${input.format}`);
  if (!DIFFICULTIES.includes(input.difficulty)) throw new Error(`Unknown difficulty: ${input.difficulty}`);
  if (!input.objective?.description?.trim()) throw new Error("Objective description is required");
}

/** Generate one original draft item for an objective. Server-only. */
export async function generateItem(input: GenerateItemInput): Promise<GeneratedItem> {
  assertValid(input);

  const { objective, format, difficulty } = input;
  const levelLine = objective.level
    ? `Level (${objective.track}): ${objective.level}`
    : `Track: ${objective.track}`;

  const userPrompt = [
    `Objective: ${objective.description}`,
    levelLine,
    `Format: ${format}`,
    `Difficulty: ${difficulty}`,
    `Write one original item that practices this objective. Call emit_item with the result.`,
  ].join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    tools: [itemTool],
    tool_choice: { type: "tool", name: "emit_item" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_item",
  );
  if (!toolUse) throw new Error("Generation did not return an item");

  const out = toolUse.input as { prompt: string; content: Record<string, unknown> };
  return {
    prompt: out.prompt,
    content: out.content ?? {},
    usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
  };
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

const REPORT_SYSTEM =
  "تكتب تقريراً عربياً موجزاً ودافئاً ومهنياً لوليّ الأمر بعد جلسةٍ فرديةٍ لطفله في أكاديمية وَرد (أعمار 9–13). " +
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

/** Draft a post-session report from the learner's progress. Teacher edits + approves. */
export async function generateSessionReportDraft(input: ReportInput): Promise<GeneratedReport> {
  const lines = [
    `اسم الطالب: ${input.learnerName}`,
    input.lessonTitle ? `درس الجلسة: ${input.lessonTitle}` : "",
    input.engagement ? `تفاعل الطالب وحضوره: ${input.engagement}` : "",
    input.comprehension ? `فهم الدرس: ${input.comprehension}` : "",
    input.behavior ? `المشاركة والسلوك: ${input.behavior}` : "",
    input.focusNext ? `تركيز الجلسة القادمة: ${input.focusNext}` : "",
    input.teacherNote ? `ملاحظة المعلّم: ${input.teacherNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1000, // Arabic is token-dense; the tool JSON must finish
    system: REPORT_SYSTEM,
    tools: [reportTool],
    tool_choice: { type: "tool", name: "emit_report" },
    messages: [{ role: "user", content: `${lines}\n\nاكتب التقرير الآن.` }],
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
      "تكتب تقرير تشخيصٍ تعليميّ موجزاً وداخلياً للمعلّمة (ليس للأهل) عن طالبٍ جديدٍ في أكاديمية وَرد (أعمار 9–13)، " +
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
      "تكتب تقريراً عربياً دافئاً ومهنياً لوليّ أمرٍ بعد جلسةٍ تعريفيةٍ مجانيةٍ لطفله في أكاديمية وَرد (أعمار 9–13). " +
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

export type PlanObjective = { description: string; level: string; skill: string; unit: string };
export type GeneratedPlan = { title: string; items: PlanObjective[] };

const planTool: Anthropic.Tool = {
  name: "emit_plan",
  description: "Return a short, progressive study plan: units, each holding a few measurable lesson objectives.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "A clear, original, measurable learning objective (one lesson)." },
            level: { type: "string", description: "The CEFR sub-level it targets (e.g. A2)." },
            skill: {
              type: "string",
              enum: ["listening", "speaking", "reading", "writing", "vocabulary"],
              description: "The single primary language skill this objective builds.",
            },
            unit: { type: "string", description: "The unit/theme this lesson belongs to (e.g. 'Unit 1: Daily routines'). Lessons of the same unit share the exact same unit string." },
          },
          required: ["description", "level", "skill", "unit"],
        },
      },
    },
    required: ["title", "items"],
  },
};

/** Generate a draft study plan (units → measurable lesson objectives), CEFR or school-aligned. */
export async function generatePlan(opts: { track: "cefr" | "school"; level: string; learnerName: string; grade?: string; term?: string }): Promise<GeneratedPlan> {
  const { track, level, learnerName, grade, term } = opts;
  const tagging =
    "Tag every objective with: the level ref it targets, exactly one primary skill " +
    "(listening | speaking | reading | writing | vocabulary — 'vocabulary' here means the language foundation: vocabulary + grammar), " +
    "and the unit it belongs to (lessons in the same unit must share the identical unit string). Order the items unit by unit.";
  const system =
    track === "school"
      ? "You design a short reinforcement (tutoring) English plan for a child that FOLLOWS their real government-school curriculum. " +
        `Produce 2–3 units matching the themes of a typical ${grade || "middle-school"} ${term || ""} English coursebook, ` +
        "each with 2–4 measurable, original lesson objectives (no copied material) that reinforce what the school teaches. " +
        `Use the grade (e.g. ${grade || "G7"}) as the level ref. ${tagging} Return via emit_plan.`
      : "You design a short English study plan for a child aged 9–13. Given a starting CEFR level, " +
        "produce 2–3 units, each with 2–4 progressive, original, measurable lesson objectives (no copied material) that build on each other. " +
        `Use the CEFR sub-level as the level ref. ${tagging} Return via emit_plan.`;
  const userMsg =
    track === "school"
      ? `Student: ${learnerName}. School: ${grade || "?"} ${term || ""}. Create a plan that reinforces their school English course.`
      : `Student: ${learnerName}. Starting level: ${level}. Create the plan.`;
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1200,
    system,
    tools: [planTool],
    tool_choice: { type: "tool", name: "emit_plan" },
    messages: [{ role: "user", content: userMsg }],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_plan",
  );
  if (!toolUse) throw new Error("Plan generation did not return a plan");
  const out = toolUse.input as GeneratedPlan;
  return { title: out.title, items: out.items ?? [] };
}

export type PlanIndexSource =
  | { kind: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string }
  | { kind: "pdf"; base64: string }
  | { kind: "text"; text: string };

/**
 * Build a study plan by reading an uploaded curriculum INDEX (image / PDF / text)
 * and extracting its real units and lessons exactly — no invention/authoring.
 */
export async function generatePlanFromIndex(opts: { track: "cefr" | "school"; context?: string; source: PlanIndexSource }): Promise<GeneratedPlan> {
  const { track, context, source } = opts;
  const instruction =
    "You are given the table of contents / index of an English coursebook. " +
    "Extract its REAL units and lessons EXACTLY as listed — do NOT invent, add, or author anything not present in the index. " +
    "Preserve the index's order and its actual unit and lesson names. For each lesson, produce one objective whose description is that lesson's topic/title from the index, " +
    "tagged with: the single primary skill it builds (listening | speaking | reading | writing | vocabulary — 'vocabulary' = the language foundation: vocabulary + grammar), " +
    "the unit it belongs to (the book's unit; lessons of the same unit share the identical unit string), and a level ref " +
    (track === "school" ? "(use the grade/term as the level ref). " : "(use the CEFR sub-level if the index shows one, else a short ref). ") +
    (context ? `Context: ${context}. ` : "") +
    "Include every lesson in order. The plan title should be the book/course name if visible. Return via emit_plan.";

  const content: Anthropic.MessageParam["content"] =
    source.kind === "text"
      ? [{ type: "text", text: `${instruction}\n\n--- INDEX ---\n${source.text.slice(0, 30000)}` }]
      : source.kind === "pdf"
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: source.base64 } }, { type: "text", text: instruction }]
        : [{ type: "image", source: { type: "base64", media_type: source.mediaType, data: source.base64 } }, { type: "text", text: instruction }];

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: "You faithfully convert a coursebook index into a structured study plan. You never invent content that is not present in the index.",
    tools: [planTool],
    tool_choice: { type: "tool", name: "emit_plan" },
    messages: [{ role: "user", content }],
  });

  const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_plan");
  if (!toolUse) throw new Error("لم يُرجِع الذكاء خطّةً من الفهرس");
  const out = toolUse.input as GeneratedPlan;
  if (!out.items?.length) throw new Error("لم أستطع استخراج الخطّة من الفهرس — جرّب صورةً أوضح أو ملفّاً نصّياً.");
  return { title: out.title, items: out.items };
}
