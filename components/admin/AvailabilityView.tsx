/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";
import { WEEKDAY_AR, sessionsPerRule } from "@/lib/availability";

const hm = (t: string) => (t ? t.slice(0, 5) : "");

/** Read-only month calendar of a teacher's schedule: allocated time, booked
 * (purple) vs remaining (green) as colour areas. Admin watches; teacher edits. */
export default async function AvailabilityView({ instructorId }: { instructorId: string }) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const brk = tenant?.slot_break_minutes ?? 15;

  const { data: rules } = await supabase.from("availability_rules").select("weekday, start_time, end_time, slot_minutes").eq("instructor_id", instructorId).order("weekday");
  const { data: slots } = await supabase.from("availability_slots").select("starts_at, status").eq("instructor_id", instructorId);
  const all = (slots ?? []) as any[];
  const totalOpen = all.filter((s) => s.status === "open").length;
  const totalBooked = all.filter((s) => s.status === "booked").length;

  // Per-day open/booked counts (in the platform timezone).
  const byDay = new Map<string, { open: number; booked: number }>();
  const dts: DateTime[] = [];
  for (const s of all) {
    const dt = DateTime.fromISO(s.starts_at, { zone: "utc" }).setZone(tz);
    dts.push(dt);
    const k = dt.toFormat("yyyy-MM-dd");
    const c = byDay.get(k) ?? { open: 0, booked: 0 };
    if (s.status === "booked") c.booked++;
    else if (s.status === "open") c.open++;
    byDay.set(k, c);
  }

  // Build a week grid (Sun→Sat columns) from this week through the last slot.
  const now = DateTime.now().setZone(tz).startOf("day");
  const start = now.minus({ days: now.weekday % 7 }); // back to Sunday
  const maxDt = (dts.length ? DateTime.max(...dts) : now) ?? now;
  let end = maxDt.startOf("day");
  end = end.plus({ days: 6 - (end.weekday % 7) }); // forward to Saturday
  const weeks: DateTime[][] = [];
  for (let cur = start; cur <= end; ) {
    const week: DateTime[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cur);
      cur = cur.plus({ days: 1 });
    }
    weeks.push(week);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        للعرض فقط — المعلّمة تحدّد تفرّغها من حسابها. المنطقة الزمنية <Badge tone="neutral">{tz}</Badge>.
      </p>

      {/* Weekly pattern */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>التفرّغ الأسبوعيّ</h3>
        {(rules ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لم تحدّد المعلّمة تفرّغاً بعد.</p>
        ) : (
          (rules ?? []).map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Badge tone="brand">{WEEKDAY_AR[r.weekday]}</Badge>
              <span style={{ fontSize: 14, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{hm(r.start_time)} – {hm(r.end_time)}</span>
              <Badge tone="success">≈ {sessionsPerRule(r.start_time, r.end_time, r.slot_minutes, brk)} جلسة/أسبوع</Badge>
            </div>
          ))
        )}
      </Card>

      {/* Month calendar */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", flex: 1 }}>تقويم المواعيد</h3>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
            <i style={{ width: 12, height: 8, borderRadius: 2, background: "var(--brand)", display: "inline-block" }} /> محجوز ({totalBooked})
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
            <i style={{ width: 12, height: 8, borderRadius: 2, background: "var(--leaf-500)", display: "inline-block" }} /> متبقٍّ ({totalOpen})
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEKDAY_AR.map((w) => (
            <div key={w} style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textAlign: "center", paddingBottom: 2 }}>
              {w.replace("ال", "")}
            </div>
          ))}
          {weeks.flat().map((day) => {
            const key = day.toFormat("yyyy-MM-dd");
            const c = byDay.get(key);
            const total = c ? c.open + c.booked : 0;
            const isToday = day.hasSame(now, "day");
            const isPast = day < now;
            return (
              <div
                key={key}
                style={{
                  minHeight: 58,
                  border: isToday ? "1.5px solid var(--brand)" : "1px solid var(--border-soft)",
                  borderRadius: 8,
                  padding: 4,
                  background: total ? "var(--surface-card)" : "var(--surface-page)",
                  opacity: isPast && !total ? 0.5 : 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--brand)" : "var(--text-muted)" }}>{day.day}</span>
                {total > 0 && (
                  <>
                    <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: "var(--ink-100)" }}>
                      <span style={{ width: `${(c!.booked / total) * 100}%`, background: "var(--brand)" }} />
                      <span style={{ width: `${(c!.open / total) * 100}%`, background: "var(--leaf-500)" }} />
                    </div>
                    <span style={{ fontSize: 9.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{c!.booked}/{total}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {totalOpen + totalBooked === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا مواعيد مُولَّدة بعد.</p>}
      </Card>
    </div>
  );
}
