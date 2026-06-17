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
          "Format-specific payload. multiple_choice/matching: options[] + answer. " +
          "true_false: answer (boolean). fill_blank: answer (string). open/audio: " +
          "answer may be null; include a short rubric. Always include a teacher explanation.",
        properties: {
          options: { type: "array", items: { type: "string" } },
          answer: {
            description: "Correct answer: string, boolean, index, or array depending on format.",
          },
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
