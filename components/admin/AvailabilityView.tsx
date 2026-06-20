/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";
import AvailabilityMatrix from "@/components/availability/AvailabilityMatrix";
import { WEEKDAY_AR, sessionsPerRule } from "@/lib/availability";

const hm = (t: string) => (t ? t.slice(0, 5) : "");

/** Read-only view of a teacher's regular-lesson availability (admin watches; teacher edits). */
export default async function AvailabilityView({ instructorId }: { instructorId: string }) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const brk = tenant?.slot_break_minutes ?? 15;

  const { data: rules } = await supabase.from("availability_rules").select("weekday, start_time, end_time, slot_minutes").eq("instructor_id", instructorId).order("weekday");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        للعرض فقط — المعلّمة تحدّد تفرّغها من حسابها. منه تُجدوَل جلسات طلابها المنتظمة. المنطقة الزمنية <Badge tone="neutral">{tz}</Badge>.
      </p>

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>تقويم التفرّغ الأسبوعيّ</h3>
        <AvailabilityMatrix rules={(rules ?? []) as any} />
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>التفرّغ الأسبوعيّ (تفصيليّ)</h3>
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
    </div>
  );
}
