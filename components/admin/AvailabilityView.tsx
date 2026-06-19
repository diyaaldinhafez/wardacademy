/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";
import { WEEKDAY_AR, sessionsPerRule } from "@/lib/availability";

const hm = (t: string) => (t ? t.slice(0, 5) : "");

/** Read-only view of a teacher's schedule (admin watches; the teacher edits). */
export default async function AvailabilityView({ instructorId }: { instructorId: string }) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const brk = tenant?.slot_break_minutes ?? 15;

  const { data: rules } = await supabase.from("availability_rules").select("weekday, start_time, end_time, slot_minutes").eq("instructor_id", instructorId).order("weekday");
  const { data: exceptions } = await supabase.from("availability_exceptions").select("on_date, reason").order("on_date");
  const { data: slots } = await supabase.from("availability_slots").select("starts_at, status, source_rule_id").eq("instructor_id", instructorId).order("starts_at");
  const open = (slots ?? []).filter((s: any) => s.status === "open");
  const booked = (slots ?? []).filter((s: any) => s.status === "booked");

  const fmtDate = (iso: string) => new Intl.DateTimeFormat("ar", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
  const fmtTime = (iso: string) => new Intl.DateTimeFormat("ar", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const keyOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const byDay = new Map<string, { label: string; slots: any[] }>();
  for (const s of open) {
    const k = keyOf(s.starts_at);
    if (!byDay.has(k)) byDay.set(k, { label: fmtDate(s.starts_at), slots: [] });
    byDay.get(k)!.slots.push(s);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        للعرض فقط — المعلّمة تحدّد تفرّغها من حسابها. المنطقة الزمنية <Badge tone="neutral">{tz}</Badge>.
      </p>

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>التفرّغ الأسبوعيّ</h3>
        {(rules ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لم تحدّد المعلّمة تفرّغاً بعد.</p>}
        {(rules ?? []).map((r: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Badge tone="brand">{WEEKDAY_AR[r.weekday]}</Badge>
            <span style={{ fontSize: 14, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{hm(r.start_time)} – {hm(r.end_time)}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>كلّ {r.slot_minutes} دقيقة</span>
            <Badge tone="success">≈ {sessionsPerRule(r.start_time, r.end_time, r.slot_minutes, brk)} جلسة/أسبوع</Badge>
          </div>
        ))}
        {(exceptions ?? []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>أيّام محجوبة:</span>
            {(exceptions ?? []).map((e: any, i: number) => (
              <Badge key={i} tone="warning">{e.on_date}{e.reason ? ` · ${e.reason}` : ""}</Badge>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
          <span>مواعيد مفتوحة: <strong style={{ color: "var(--text-strong)" }}>{open.length}</strong></span>
          <span>محجوزة: <strong style={{ color: "var(--text-strong)" }}>{booked.length}</strong></span>
        </div>
        {open.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا مواعيد مفتوحة حالياً.</p>}
        {[...byDay.values()].map((day) => (
          <div key={day.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{day.label}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {day.slots.map((s: any, i: number) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--surface-card)", padding: "4px 10px", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                  {fmtTime(s.starts_at)}
                  {!s.source_rule_id && <Badge tone="neutral">يدويّ</Badge>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
