export type SkillBarRow = { key: string; label: string; fraction: number; value: number; total: number };

/**
 * Per-skill mastery meters — name + colored bar + adjacent value — shared by the
 * teacher studio and the guardian surface. The bar LENGTH always encodes the value;
 * its COLOR is AUDIENCE-aware via `colorMode`:
 *   • "growth" (DEFAULT, parent /guardian): a single flat brand purple — NO good-vs-bad
 *     signal, so a low value reads as "early", never a warning.
 *   • "performance" (teacher /studio): a 3-band diagnostic by value (0–10), mapping to the
 *     frozen ratio key — value <4 (<50%) → danger red · 4–<7 (50–69%) → warning orange ·
 *     ≥7 (70%+) → brand purple. Teacher-only; never shown to parents.
 * Empty/no-data bars are transparent (the light track shows through) in both modes.
 *
 * `valueFormat` switches only the trailing value: "outOf10" (teacher, e.g. 7.5/10)
 * or "percent" (parent, e.g. 75%). Direction-agnostic: the row is a flex line, so
 * it follows the surrounding dir (LTR studio, locale-driven guardian).
 */
function performanceColor(value: number): string {
  if (value < 4) return "var(--danger)"; // <50% (frozen ratio key)
  if (value < 7) return "var(--apricot-400)"; // 50–69%
  return "var(--brand)"; // 70%+
}
export function SkillBars({
  skills,
  valueFormat = "outOf10",
  colorMode = "growth",
}: {
  skills: SkillBarRow[];
  valueFormat?: "outOf10" | "percent";
  colorMode?: "performance" | "growth";
}) {
  return (
    <>
      {skills.map((s) => {
        const frac = Math.max(0, Math.min(1, s.fraction));
        const pct = Math.round(frac * 100);
        const valueText = valueFormat === "percent" ? `${pct}%` : `${s.value.toFixed(1)}/10`;
        const fill = s.total === 0 ? "transparent" : colorMode === "performance" ? performanceColor(s.value) : "var(--brand)";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", width: 72, flexShrink: 0 }}>{s.label}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: fill }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-brand)", fontVariantNumeric: "tabular-nums", width: 48, textAlign: "end", flexShrink: 0 }}>{valueText}</span>
          </div>
        );
      })}
    </>
  );
}
