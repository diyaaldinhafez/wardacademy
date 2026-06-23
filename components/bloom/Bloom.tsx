import { stageForValue, type BloomStage } from "@/lib/skills";

// Ward Academy "garden" primitives — ported from the Ward Academy Design System.
// Pure SVG + ward.css tokens, SSR-safe (inline styles + ward.css classes for the
// few animated bits). The design carries NO assessment logic: every component
// takes plain props (value 0–10, fraction 0..1, counts). Source of the model:
// Ward_Curriculum_Master_Reference.md.

export { stageForValue };
export type { BloomStage };

// ————— shapes (approved faceted-lantern silhouettes + the 4-petal flower) —————
const PETAL = "M50,50 C38.7,46.2 31.2,35 34,22.7 C35.9,12.4 42.5,6.8 50,3 C57.5,6.8 64.1,12.4 66,22.7 C68.8,35 61.3,46.2 50,50 Z";
const SPARK = "M50,42 C51,47.4 52.6,49 58,50 C52.6,51 51,52.6 50,58 C49,52.6 47.4,51 42,50 C47.4,49 49,47.4 50,42 Z";
const UNIT_BUD = "M50 14 C60.1 17.3 74.2 27.1 78.9 41.9 C75.7 59.9 68.7 73 60.9 81.2 C59.4 86.2 54.7 88.6 50 88.6 C45.3 88.6 40.6 86.2 39.1 81.2 C31.3 73 24.3 59.9 21.1 41.9 C25.8 27.1 39.9 17.3 50 14 Z";
const UNIT_BALLOON = "M50 6 C62 10 79 21 85 38 C81 59 72 74 62 84 C60 90 55 92 50 92 C45 92 40 90 38 84 C28 74 19 59 15 38 C21 21 38 10 50 6 Z";

// Four-petal Ward flower with the AI-spark centre (the iconic bloom).
function FourPetalFlower({ fill = "var(--ward-purple-500)" }: { fill?: string }) {
  return (
    <g>
      {[0, 90, 180, 270].map((r) => (
        <path key={r} d={PETAL} fill={fill} transform={`rotate(${r} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="11" fill="var(--ward-purple-600)" />
      <path d={SPARK} fill="#F3EDFF" />
    </g>
  );
}

export type FlowerSkill = { label: string; value: number; detail?: string };

/**
 * The child's flower: FOUR petals = the four skills (Listening, Speaking,
 * Reading, Writing). Each petal scales from bud (0.34) to full bloom (1.0) by
 * value 0..1. Centre = the AI spark. Vocabulary is NOT here — see VocabCounter.
 */
export function FlowerProgress({ skills, size = 160, showLegend = false }: { skills: FlowerSkill[]; size?: number; showLegend?: boolean }) {
  const data = skills.length ? skills.slice(0, 4) : [{ label: "", value: 0 }, { label: "", value: 0 }, { label: "", value: 0 }, { label: "", value: 0 }];
  const step = 360 / data.length;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={data.map((s) => `${s.label}: ${Math.round(s.value * 100)}%`).join(", ")}>
        {data.map((s, i) => (
          <g key={"t" + i} transform={`rotate(${i * step} 50 50)`}>
            <path d={PETAL} fill="var(--ward-purple-50)" stroke="var(--ward-purple-100)" strokeWidth="1" />
          </g>
        ))}
        {data.map((s, i) => {
          const v = Math.max(0, Math.min(1, s.value));
          const sc = 0.34 + 0.66 * v;
          const tf = `rotate(${i * step} 50 50) translate(50 50) scale(${sc}) translate(-50 -50)`;
          return (
            <g key={"v" + i}>
              <path d={PETAL} transform={tf} fill={v >= 1 ? "var(--ward-purple-500)" : "var(--ward-purple-400)"} style={{ transition: "transform var(--duration-slow) var(--ease-out)" }} />
            </g>
          );
        })}
        <circle cx="50" cy="50" r="11" fill="var(--ward-purple-600)" />
        <path d={SPARK} fill="#F3EDFF" />
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

/**
 * UnitBloom — the unit hero: ONE shape-shifting object through the FOUR states
 * seed → bud → balloon → bloom. Drive it with `value` (0–10 → stageForValue) or
 * an explicit `stage`. The 4 petals of the bloom are iconic, not skills.
 */
export function UnitBloom({ stage, value, size = 64, label, pop = false }: { stage?: BloomStage; value?: number; size?: number; label?: string; pop?: boolean }) {
  const eff: BloomStage = stage ?? (value != null ? stageForValue(value) : "bud");
  const cls = ["bloom-unit", `bloom-unit--${eff}`, pop && eff === "bloom" ? "bloom-unit--pop" : ""].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span className="bloom-unit__art" style={{ display: "flex", width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label ?? "unit"} — ${eff}`}>
          {eff === "seed" ? (
            <g>
              <path d="M50 42 C60 50 64 61 59 73 C56 81 50 85 50 85 C50 85 44 81 41 73 C36 61 40 50 50 42 Z" fill="#8A7A53" />
              <path d="M50 44 C55 52 57 62 53 72" fill="none" stroke="#6E5F3E" strokeWidth="1.4" opacity="0.6" />
              <path d="M50 42 C50 33 54 26 61 22" fill="none" stroke="var(--leaf-500)" strokeWidth="3" strokeLinecap="round" />
              <path d="M61 22 C64 25 65 29 64 32 C60 31 58 27 61 22 Z" fill="var(--leaf-500)" />
            </g>
          ) : eff === "bud" ? (
            <g>
              <defs>
                <linearGradient id="wardBudGrad" x1="0.3" y1="1" x2="0.2" y2="0">
                  <stop offset="0" stopColor="#2E9E6B" />
                  <stop offset="0.46" stopColor="#2E9E6B" />
                  <stop offset="0.72" stopColor="#7E94B0" />
                  <stop offset="1" stopColor="#9F7DE7" />
                </linearGradient>
              </defs>
              <g fill="#4F9A52">
                <path d="M48 82 C43 90 38 96 32 99 C36 92 40 86 44 80 Z" />
                <path d="M52 82 C57 90 62 96 68 99 C64 92 60 86 56 80 Z" />
                <path d="M50 84 C49 91 49 96 50 99 C51 96 51 91 50 84 Z" />
              </g>
              <path d={UNIT_BUD} fill="url(#wardBudGrad)" />
              <path d="M26 41 C34 27 42 19 47 16 C42 24 35 34 31 45 Z" fill="#FFFFFF" opacity="0.24" />
            </g>
          ) : eff === "balloon" ? (
            <g>
              <g fill="#4F9A52">
                <path d="M48 82 C43 90 38 96 32 99 C36 92 40 86 44 80 Z" />
                <path d="M52 82 C57 90 62 96 68 99 C64 92 60 86 56 80 Z" />
                <path d="M50 84 C49 91 49 96 50 99 C51 96 51 91 50 84 Z" />
              </g>
              <path d={UNIT_BALLOON} fill="var(--ward-purple-400)" />
              <path d="M28 37 C37 22 45 14 50 11 C45 20 38 31 33 43 Z" fill="#FFFFFF" opacity="0.26" />
            </g>
          ) : (
            <FourPetalFlower />
          )}
        </svg>
      </span>
      {label ? <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)", textAlign: "center" }}>{label}</span> : null}
    </span>
  );
}

/** Names the cumulative scope of the flower: the Ward (CEFR) level. */
export function ScopeChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, fontSize: 12, fontWeight: 600, padding: "4px 11px", whiteSpace: "nowrap", background: "var(--brand-soft)", color: "var(--text-on-soft)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v6M12 21v-6M3 12h6M21 12h-6" />
      </svg>
      {children}
    </span>
  );
}

/**
 * VocabCounter — the honest tally of vocabulary words MASTERED. A clustered
 * stack of gem-cards: deliberately NOT a flower/petal — the third progress track.
 */
export function VocabCounter({ count = 0, label = "كلمة متقَنة", variant = "block", pop = false }: { count?: number; label?: string; variant?: "block" | "chip" | "stat"; pop?: boolean }) {
  const u = variant === "chip" ? 30 / 44 : variant === "stat" ? 34 / 44 : 52 / 44;
  const stack = (
    <span style={{ position: "relative", flexShrink: 0, width: 52 * u, height: 44 * u }} aria-hidden="true">
      <span className="bloom-vocab__gem" style={{ position: "absolute", width: 22 * u, height: 28 * u, left: 2 * u, top: 10 * u, transform: "rotate(-16deg)", background: "var(--ward-purple-300)", borderRadius: 6, boxShadow: "var(--shadow-1)" }} />
      <span className="bloom-vocab__gem" style={{ position: "absolute", width: 22 * u, height: 28 * u, left: 26 * u, top: 10 * u, transform: "rotate(15deg)", background: "var(--ward-purple-400)", borderRadius: 6, boxShadow: "var(--shadow-1)" }} />
      <span className={"bloom-vocab__gem" + (pop ? " bloom-vocab__top" : "")} style={{ position: "absolute", width: 26 * u, height: 32 * u, left: 13 * u, top: 6 * u, background: "var(--grad-bloom)", borderRadius: 6, boxShadow: "var(--shadow-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={14 * u} height={14 * u} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="#F3EDFF" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </span>
    </span>
  );
  const n = (fs: number) => <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--text-on-soft)", fontVariantNumeric: "tabular-nums", lineHeight: 1, fontSize: fs }}>{count}</span>;
  const lbl = (fs: number) => <span style={{ fontSize: fs, color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>;
  if (variant === "chip") {
    return <span className={pop ? "bloom-vocab--pop" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brand-soft)", borderRadius: 999, padding: "5px 13px 5px 8px" }}>{stack}{n(18)}{lbl(12)}</span>;
  }
  if (variant === "stat") {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>{stack}<span style={{ display: "flex", flexDirection: "column" }}>{n(22)}{lbl(13)}</span></span>;
  }
  return <span className={pop ? "bloom-vocab--pop" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>{stack}<span style={{ display: "flex", flexDirection: "column", gap: 2 }}>{n(34)}{lbl(13)}</span></span>;
}

/** Honest completion bar — shows the real fraction ("6 of 8"), never an inflated %. For COMPLETION, not mastery. */
export function ProgressBar({ value = 0, max = 1, tone = "brand", fractionLabel }: { value?: number; max?: number; tone?: "brand" | "success" | "apricot"; fractionLabel?: string | false }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  const bg = tone === "success" ? "var(--success)" : tone === "apricot" ? "var(--apricot-400)" : "var(--brand)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 999, background: bg, width: pct + "%", transition: "width var(--duration-slow) var(--ease-out)" }} />
      </div>
      {fractionLabel !== false ? <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fractionLabel ?? `${value} / ${max}`}</span> : null}
    </div>
  );
}

const PETAL_MINI = PETAL;
/** Level badge — bloom-gradient disc with the white flower + CEFR level. */
export function LevelBadge({ level, season, size = 64 }: { level: string | number; season?: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--grad-bloom)", color: "#fff", boxShadow: "var(--shadow-2)", width: size, height: size }}>
        <svg width={size * 0.3} height={size * 0.3} viewBox="0 0 100 100" aria-hidden="true">
          {[0, 90, 180, 270].map((r) => <path key={r} d={PETAL_MINI} fill="#FFFFFF" opacity="0.92" transform={`rotate(${r} 50 50)`} />)}
          <circle cx="50" cy="50" r="7" fill="var(--ward-purple-300)" />
        </svg>
        <span style={{ fontWeight: 800, lineHeight: 1, fontSize: size * 0.26 }}>{level}</span>
      </span>
      {season ? <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>{season}</span> : null}
    </span>
  );
}

/** Attendance/practice streak chip — continuity, not isolated wins. */
export function StreakChip({ count = 0, label = "جلسات متواصلة" }: { count?: number; label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, background: "var(--apricot-100)", color: "var(--apricot-600)", padding: "5px 14px", fontSize: 13.5, fontWeight: 700 }}>
      <svg width="14" height="17" viewBox="0 0 100 120" aria-hidden="true">
        <path d="M50,10 C63,28 70,42 70,57 C70,76 61,90 50,90 C39,90 30,76 30,57 C30,42 37,28 50,10 Z" fill="var(--apricot-400)" />
        <path d="M50,90 L50,118" stroke="var(--leaf-500)" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>
      <span>{label}</span>
    </span>
  );
}
