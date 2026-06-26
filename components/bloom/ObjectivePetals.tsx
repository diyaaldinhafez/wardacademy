"use client";
import { useState } from "react";
import { stageForValue, type BloomStage } from "@/lib/skills";

// Objective Petal-Lights — one objective = one petal with four illumination states
// (bloomed → half-lit → dim → not-started). The filled state carries the AI spark.
// NOT the unit's plant lifecycle (that is UnitBloom). Uses the ONE shared 0–10 →
// state scale (lib/skills.ts stageForValue) — never duplicated here.

type Objective = { id?: string; value?: number; label?: string; skill?: string | null; state?: BloomStage; dates?: string[] };

// Small almond petal, centroid at origin, pointing up (−y).
const OBJ_PETAL = "M0,-13 C6,-8 7,-1 4.6,6 C3.5,9.2 1.7,11 0,11 C-1.7,11 -3.5,9.2 -4.6,6 C-7,-1 -6,-8 0,-13 Z";
// AI spark — the four-point brand mark, centred in the petal.
const OBJ_SPARK = "M0,-7.18 C0.38,-4.71 1.71,-3.38 4.18,-3 C1.71,-2.62 0.38,-1.29 0,1.18 C-0.38,-1.29 -1.71,-2.62 -4.18,-3 C-1.71,-3.38 -0.38,-4.71 0,-7.18 Z";

function petalFill(state: BloomStage): { fill: string; stroke: string; halo?: boolean; dashed?: boolean } {
  switch (state) {
    case "bloom": return { fill: "var(--ward-purple-500)", stroke: "var(--ward-purple-600)", halo: true };
    case "balloon": return { fill: "var(--ward-purple-300)", stroke: "var(--ward-purple-400)" };
    case "bud": return { fill: "var(--ward-purple-100)", stroke: "var(--ward-purple-200)" };
    default: return { fill: "none", stroke: "var(--ward-purple-200)", dashed: true }; // seed
  }
}
const STATE_LABEL: Record<BloomStage, string> = { bloom: "Bloomed", balloon: "Half-lit", bud: "Dim", seed: "Not started" };

function Petal({ state, selected, onClick }: { state: BloomStage; selected?: boolean; onClick?: () => void }) {
  const f = petalFill(state);
  const clickable = !!onClick;
  return (
    <g style={{ cursor: clickable ? "pointer" : "default", transition: "transform var(--duration-fast) var(--ease-out)", transform: selected ? "scale(1.16)" : undefined }}
       onClick={onClick} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}
       onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}>
      {f.halo ? <path d={OBJ_PETAL} fill="var(--ward-purple-200)" opacity="0.55" transform="scale(1.5)" /> : null}
      <path d={OBJ_PETAL} fill={f.fill} stroke={f.stroke} strokeWidth={f.dashed ? 1.4 : 1.2} strokeDasharray={f.dashed ? "3 2.4" : undefined} />
      {state === "bloom" ? <path d={OBJ_SPARK} fill="var(--ward-spark)" /> : null}
    </g>
  );
}

export default function ObjectivePetals({ objectives = [], mode = "child", layout = "ring", size = 150, children }: {
  objectives?: Objective[];
  mode?: "child" | "teacher";
  layout?: "ring" | "row";
  size?: number;
  children?: React.ReactNode;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const teacher = mode === "teacher";
  const items = objectives.map((o) => ({ ...o, state: o.state || stageForValue(o.value ?? 0) }));
  const lit = items.filter((o) => o.state === "bloom").length;
  const ariaSummary = `${items.length} objectives, ${lit} bloomed`;
  const detail = sel != null && teacher && items[sel] ? items[sel] : null;
  const onPick = (i: number) => (teacher ? () => setSel(sel === i ? null : i) : undefined);

  let art: React.ReactNode;
  if (layout === "row") {
    art = (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }} role="img" aria-label={ariaSummary}>
        {items.map((o, i) => (
          <svg key={i} width={Math.max(20, size / 8)} height={Math.max(26, size / 6)} viewBox="-14 -16 28 30" style={{ overflow: "visible" }}>
            <Petal state={o.state} selected={sel === i} onClick={onPick(i)} />
          </svg>
        ))}
      </div>
    );
  } else {
    const n = items.length || 1;
    const R = n > 8 ? 30 : 28;
    const scale = n > 8 ? 0.85 : 1;
    art = (
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={ariaSummary} style={{ overflow: "visible" }}>
          {items.map((o, i) => {
            const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
            const x = 50 + R * Math.cos(a), y = 50 + R * Math.sin(a);
            const deg = -90 + i * (360 / n) + 90;
            return (
              <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(1)}) scale(${scale})`}>
                <Petal state={o.state} selected={sel === i} onClick={onPick(i)} />
              </g>
            );
          })}
        </svg>
        {children ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>{children}</div> : null}
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {art}
      {detail ? (
        <div dir="ltr" style={{ background: "var(--surface-card)", border: "1px solid var(--ward-purple-100)", borderRadius: "var(--radius-md)", padding: "9px 13px", maxWidth: 300, boxShadow: "var(--shadow-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBlockEnd: 4 }}>
            {detail.id ? <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color: "var(--ward-purple-700)", background: "var(--ward-purple-50)", borderRadius: 5, padding: "1px 6px" }}>{detail.id}</code> : null}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", marginInlineStart: "auto" }}>{STATE_LABEL[detail.state]}</span>
          </div>
          {detail.label ? <div dir="auto" style={{ fontSize: 13, color: "var(--text-strong)", lineHeight: 1.6 }}>{detail.label}</div> : null}
          {detail.dates && detail.dates.length ? <div style={{ fontSize: 11, color: "var(--text-muted)", marginBlockStart: 4 }}>Assessments: {detail.dates.join(" · ")}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
