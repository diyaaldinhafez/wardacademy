import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { type Step, PIPELINE_LABEL_EN } from "@/lib/leads";

/** Visual registration pipeline: connected dots with three states
 * (done / current / upcoming). LTR (flex order), no positioning tricks. */
export default async function PipelineStepper({
  steps,
  currentIndex,
  size = "md",
}: {
  steps: Step[];
  currentIndex: number;
  size?: "sm" | "md";
}) {
  const t = await getTranslations({ locale: "en", namespace: "admin.pipeline" });
  const dot = size === "sm" ? 12 : 16;
  const labelSize = size === "sm" ? 10.5 : 12.5;
  const lineTop = dot / 2 - 1;
  const stepLabel = (s: Step) => PIPELINE_LABEL_EN[s.key] ?? s.label;
  const caption = currentIndex < steps.length ? stepLabel(steps[currentIndex]) : t("complete");

  return (
    <div style={{ width: "100%" }}>
      <div className="only-mobile" style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
        {t("currentStage")} <b style={{ color: currentIndex < steps.length ? "var(--text-strong)" : "var(--leaf-700)" }}>{caption}</b>
      </div>
      <div role="list" aria-label={t("stagesAria")} style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {steps.map((s, i) => {
        const state = s.done ? "done" : i === currentIndex ? "current" : "upcoming";
        const bg = state === "done" ? "var(--leaf-500)" : state === "current" ? "#fff" : "var(--ink-200)";
        const border = state === "current" ? "2px solid var(--leaf-500)" : "none";
        const labelColor = state === "upcoming" ? "var(--text-muted)" : "var(--text-strong)";
        const labelWeight = state === "current" ? 700 : 500;
        return (
          <Fragment key={s.key}>
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{ flex: 1, height: 2, marginTop: lineTop, minWidth: 14, background: steps[i - 1].done ? "var(--leaf-500)" : "var(--ink-200)" }}
              />
            )}
            <div
              role="listitem"
              aria-label={`${stepLabel(s)}: ${state === "done" ? t("done") : state === "current" ? t("current") : t("upcoming")}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              <span
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: "50%",
                  background: bg,
                  border,
                  boxShadow: state === "current" ? "0 0 0 3px rgba(46,158,107,.18)" : "none",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {state === "done" && (
                  <svg width={dot * 0.62} height={dot * 0.62} viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="step-label" style={{ fontSize: labelSize, fontWeight: labelWeight, color: labelColor, whiteSpace: "nowrap" }}>
                {stepLabel(s)}
              </span>
            </div>
          </Fragment>
        );
      })}
      </div>
    </div>
  );
}
