export type SkillBarRow = { key: string; label: string; fraction: number; value: number; total: number };

/**
 * Per-skill mastery meters — name + colored bar + adjacent value — shared by the
 * teacher studio and the guardian surface so both read identically (same shape,
 * same diagnostic cue). The bar LENGTH encodes the value; its COLOR is a single flat
 * brand purple (--brand) — NOT a good-vs-bad signal and NOT a multi-shade gradient
 * (adjacent shades were too close to distinguish). Empty/transparent when no data.
 *
 * `valueFormat` switches only the trailing value: "outOf10" (teacher, e.g. 7.5/10)
 * or "percent" (parent, e.g. 75%). Direction-agnostic: the row is a flex line, so
 * it follows the surrounding dir (LTR studio, locale-driven guardian).
 */
export function SkillBars({
  skills,
  valueFormat = "outOf10",
}: {
  skills: SkillBarRow[];
  valueFormat?: "outOf10" | "percent";
}) {
  return (
    <>
      {skills.map((s) => {
        const frac = Math.max(0, Math.min(1, s.fraction));
        const pct = Math.round(frac * 100);
        const valueText = valueFormat === "percent" ? `${pct}%` : `${s.value.toFixed(1)}/10`;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", width: 72, flexShrink: 0 }}>{s.label}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: s.total === 0 ? "transparent" : "var(--brand)" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums", width: 48, textAlign: "end", flexShrink: 0 }}>{valueText}</span>
          </div>
        );
      })}
    </>
  );
}
