import type { ReactNode } from "react";
import { FORMAT_LABELS } from "@/lib/items";
import { Badge } from "@/components/ward/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatAnswer(answer: unknown, options?: string[]): string {
  if (typeof answer === "number") return options?.[answer] ?? String(answer);
  if (typeof answer === "string" || typeof answer === "boolean") return String(answer);
  if (Array.isArray(answer)) return answer.map((a) => (typeof a === "number" ? options?.[a] ?? String(a) : String(a))).join(", ");
  return JSON.stringify(answer);
}

/** A single AI/teacher item rendered in the Ward kit style (question card). */
export default function ItemCard({ it, index, right }: { it: any; index?: number; right?: ReactNode }) {
  const content = (it.content ?? {}) as { options?: string[] };
  const keys = (Array.isArray(it.item_keys) ? it.item_keys[0] : it.item_keys) ?? {};
  const answer = keys.answer;
  const correctIdx = typeof answer === "number" ? answer : -1;
  const correctVal = typeof answer === "string" ? answer : null;
  const explanation: string | undefined = keys.explanation ?? undefined;
  const rubric: string | undefined = keys.rubric ?? undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 14, border: "1px solid var(--border-soft)", background: "var(--surface-card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {index != null && <Badge tone="neutral">{index}</Badge>}
        <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
          {FORMAT_LABELS[it.format as keyof typeof FORMAT_LABELS] ?? it.format}
          {it.difficulty ? ` · ${it.difficulty}` : ""}
        </span>
        {right}
      </div>
      <div dir="ltr" style={{ fontFamily: "var(--font-en-body)", fontSize: 15, fontWeight: 600, color: "var(--text-strong)", whiteSpace: "pre-line", textAlign: "start" }}>
        {it.prompt}
      </div>
      {Array.isArray(content.options) && content.options.length > 0 && (
        <div dir="ltr" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {content.options.map((o, j) => {
            const correct = j === correctIdx || (correctVal != null && o === correctVal);
            return (
              <span
                key={j}
                style={{
                  fontFamily: "var(--font-en-body)",
                  fontSize: 13,
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: correct ? "var(--leaf-100)" : "var(--ink-100)",
                  color: correct ? "var(--leaf-700)" : "var(--ink-600)",
                  fontWeight: correct ? 700 : 400,
                }}
              >
                {o}
              </span>
            );
          })}
        </div>
      )}
      {answer !== undefined && answer !== null && (!Array.isArray(content.options) || content.options.length === 0) && (
        <p style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: "var(--leaf-700)" }}>الإجابة:</span> {formatAnswer(answer, content.options)}
        </p>
      )}
      {rubric && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "pre-line" }}>
          <span style={{ fontWeight: 600 }}>سلّم التصحيح:</span> {rubric}
        </p>
      )}
      {explanation && (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>السبب:</span> {explanation}
        </p>
      )}
    </div>
  );
}
