import { WEEKDAY_AR } from "@/lib/availability";

// Visual weekly availability: 7 day rows × a time axis, each day's windows as bars.
type Rule = { weekday: number; start_time: string; end_time: string };

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
// 12-hour Arabic format (ص/م), western digits.
const fmt = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "ص" : "م";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export default function AvailabilityMatrix({ rules }: { rules: Rule[] }) {
  const byDay = new Map<number, { start: number; end: number }[]>();
  for (const r of rules) {
    const arr = byDay.get(r.weekday) ?? [];
    arr.push({ start: toMin(r.start_time), end: toMin(r.end_time) });
    byDay.set(r.weekday, arr);
  }
  const allStarts = rules.map((r) => toMin(r.start_time));
  const allEnds = rules.map((r) => toMin(r.end_time));
  const minMin = rules.length ? Math.max(0, Math.floor(Math.min(...allStarts) / 60) * 60) : 8 * 60;
  const maxMin = rules.length ? Math.min(24 * 60, Math.ceil(Math.max(...allEnds) / 60) * 60) : 20 * 60;
  const range = Math.max(60, maxMin - minMin);
  // Hour ticks
  const ticks: number[] = [];
  for (let t = minMin; t <= maxMin; t += 120) ticks.push(t);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Time axis — RTL: early on the right → late on the left */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 64, flexShrink: 0 }} />
        <div style={{ position: "relative", flex: 1, height: 14 }}>
          {ticks.map((t) => (
            <span key={t} style={{ position: "absolute", right: `${((t - minMin) / range) * 100}%`, transform: "translateX(50%)", fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(t)}</span>
          ))}
        </div>
      </div>
      {WEEKDAY_AR.map((label, wd) => {
        const windows = byDay.get(wd) ?? [];
        return (
          <div key={wd} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 64, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: windows.length ? "var(--text-strong)" : "var(--text-muted)" }}>{label}</span>
            <div style={{ position: "relative", flex: 1, height: 22, borderRadius: 8, background: "var(--surface-sunken)", overflow: "hidden" }}>
              {ticks.map((t) => (
                <span key={t} style={{ position: "absolute", right: `${((t - minMin) / range) * 100}%`, top: 0, bottom: 0, width: 1, background: "var(--ink-100)" }} />
              ))}
              {windows.map((w, i) => (
                <span
                  key={i}
                  title={`${fmt(w.start)} – ${fmt(w.end)}`}
                  style={{ position: "absolute", right: `${((w.start - minMin) / range) * 100}%`, width: `${((w.end - w.start) / range) * 100}%`, top: 3, bottom: 3, borderRadius: 6, background: "var(--leaf-500)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
                >
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{fmt(w.start)} – {fmt(w.end)}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
      {rules.length === 0 && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا تفرّغ مُحدَّدٌ بعد.</p>}
    </div>
  );
}
