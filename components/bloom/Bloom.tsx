import type { BloomStage } from "@/lib/skills";

// Bloom Map presentational primitives (ported from the Claude Design handoff).
// Pure SVG + ward.css tokens — usable from server components on any surface.

const UNIT_BUD = "M50,10 C63,28 70,42 70,57 C70,76 61,90 50,90 C39,90 30,76 30,57 C30,42 37,28 50,10 Z";
const UNIT_BALLOON = "M50,12 C68,12 80,30 80,53 C80,75 67,89 50,89 C33,89 20,75 20,53 C20,30 32,12 50,12 Z";
const UNIT_PETAL = "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";

/** A single objective/unit progressing: bud → balloon → bloom. */
export function UnitBloom({ stage, size = 40, tally, pop = false, title }: { stage: BloomStage; size?: number; tally?: { correct: number; total: number }; pop?: boolean; title?: string }) {
  return (
    <span className={`bloom-unit${pop && stage === "bloom" ? " bloom-unit--pop" : ""}`} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${title ?? "unit"} — ${stage}${tally ? ` (${tally.correct}/${tally.total})` : ""}`}>
        {stage === "bud" ? (
          <g>
            <path d={UNIT_BUD} fill="var(--ward-purple-300)" />
            <path d="M50,12 C53,34 54,62 50,88" fill="none" stroke="var(--ward-purple-600)" strokeWidth="1.4" opacity="0.5" />
          </g>
        ) : stage === "balloon" ? (
          <g>
            <path d={UNIT_BALLOON} fill="var(--ward-purple-400)" />
            <ellipse cx="40" cy="34" rx="6.5" ry="10" fill="#F3EDFF" opacity="0.5" transform="rotate(-18 40 34)" />
          </g>
        ) : (
          <g>
            {[0, 72, 144, 216, 288].map((r) => (
              <path key={r} d={UNIT_PETAL} fill="var(--ward-purple-500)" transform={`rotate(${r} 50 50)`} />
            ))}
            <circle cx="50" cy="50" r="9" fill="var(--spark-1, #F3EDFF)" />
            <circle cx="50" cy="50" r="3.4" fill="var(--ward-purple-700)" />
          </g>
        )}
      </svg>
      {tally ? <span style={{ fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{tally.correct}/{tally.total}</span> : null}
    </span>
  );
}

const PETAL = "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";

export type FlowerSkill = { label: string; value: number; detail?: string };

/** The five-petal flower: each petal scales from bud (0.3) to full bloom (1.0) by value 0..1. */
export function FlowerProgress({ skills, size = 120, showLegend = false }: { skills: FlowerSkill[]; size?: number; showLegend?: boolean }) {
  const data = skills.length === 5 ? skills : [...skills, ...Array(5 - skills.length).fill({ label: "", value: 0 })].slice(0, 5);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={data.map((s) => `${s.label}: ${Math.round(s.value * 100)}%`).join(", ")}>
        {data.map((s, i) => (
          <g key={"t" + i} transform={`rotate(${i * 72} 50 50)`}>
            <path d={PETAL} fill="var(--ward-purple-100)" stroke="var(--ward-purple-200)" strokeWidth="1" />
          </g>
        ))}
        {data.map((s, i) => {
          const sc = 0.3 + 0.7 * Math.max(0, Math.min(1, s.value));
          return (
            <g key={"v" + i} transform={`rotate(${i * 72} 50 50) translate(50 50) scale(${sc}) translate(-50 -50)`}>
              <path d={PETAL} fill={s.value >= 1 ? "var(--ward-purple-500)" : "var(--ward-purple-400)"} />
            </g>
          );
        })}
        <circle cx="50" cy="50" r="8.5" fill="var(--spark-1, #F3EDFF)" stroke="var(--ward-purple-300)" strokeWidth="1" />
        <circle cx="50" cy="50" r="3.2" fill="var(--ward-purple-500)" />
      </svg>
      {showLegend && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, minWidth: 150 }}>
          {data.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: s.value >= 1 ? "var(--ward-purple-500)" : s.value > 0 ? "var(--ward-purple-400)" : "var(--ward-purple-100)" }} />
              <span style={{ color: "var(--text-body)", flex: 1 }}>{s.label}</span>
              <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{s.detail ?? `${Math.round(s.value * 100)}%`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Names the cumulative scope of the flower: CEFR level/season, or school textbook/term. */
export function ScopeChip({ track, children }: { track: "cefr" | "school"; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, fontSize: 12, fontWeight: 600, padding: "4px 11px", whiteSpace: "nowrap", background: "var(--brand-soft)", color: "var(--text-on-soft)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {track === "school" ? <path d="M4 5v14l8-3 8 3V5l-8 3-8-3z" /> : <path d="M12 3v6M12 21v-6M3 12h6M21 12h-6" />}
      </svg>
      {children}
    </span>
  );
}
