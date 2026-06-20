/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { tDeleteRule, tAddException, tRemoveException, tRegenerate, tAddRule, tAddSlot, tRemoveSlot } from "@/app/studio/availability-actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SlotForm from "@/components/studio/SlotForm";
import RuleForm from "@/components/admin/RuleForm";
import AvailabilityMatrix from "@/components/availability/AvailabilityMatrix";
import { Card, Badge } from "@/components/ward/ui";
import { WEEKDAY_AR, sessionsPerRule } from "@/lib/availability";

const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const hm = (t: string) => (t ? t.slice(0, 5) : "");

export default async function MyAvailabilityPage() {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const brk = tenant?.slot_break_minutes ?? 15;

  // RLS scopes these to the signed-in teacher's own rows.
  const { data: rules } = await supabase.from("availability_rules").select("id, weekday, start_time, end_time, slot_minutes").order("weekday");
  const { data: exceptions } = await supabase.from("availability_exceptions").select("id, on_date, reason").order("on_date");
  const { data: slots } = await supabase.from("availability_slots").select("id, starts_at, status, source_rule_id").order("starts_at");
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
      <Card style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", flex: 1, minWidth: 220 }}>
          حدّدي تفرّغك الأسبوعيّ بالمنطقة الزمنية <Badge tone="neutral">{tz}</Badge>؛ يُولِّد النظام مواعيد الحجز تلقائياً.
        </p>
        <form action={tRegenerate}>
          <SubmitButton pendingText="جارٍ التحديث…" className={btn("soft", "md")}>حدِّث المواعيد</SubmitButton>
        </form>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>تفرّغي الأسبوعيّ المتكرّر</h2>
        {(rules ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا أوقات بعد — أضيفي قاعدةً أدناه.</p>}
        {(rules ?? []).map((r: any) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
            <Badge tone="brand">{WEEKDAY_AR[r.weekday]}</Badge>
            <span style={{ fontSize: 14, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{hm(r.start_time)} – {hm(r.end_time)}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>كلّ {r.slot_minutes} دقيقة</span>
            <Badge tone="success">≈ {sessionsPerRule(r.start_time, r.end_time, r.slot_minutes, brk)} جلسة/أسبوع</Badge>
            <form action={tDeleteRule} style={{ marginInlineStart: "auto" }}>
              <input type="hidden" name="ruleId" value={r.id} />
              <SubmitButton className={btn("danger")}>حذف</SubmitButton>
            </form>
          </div>
        ))}
        <RuleForm breakMinutes={brk} action={tAddRule} />
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>نظرةٌ مرئيّة لتفرّغك</h2>
        <AvailabilityMatrix rules={(rules ?? []) as any} />
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>أيّامٌ محجوبة (إجازات)</h2>
        {(exceptions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا أيّام محجوبة.</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(exceptions ?? []).map((e: any) => (
            <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "var(--surface-sunken)", padding: "4px 10px", fontSize: 13 }}>
              {e.on_date}{e.reason ? ` · ${e.reason}` : ""}
              <form action={tRemoveException}>
                <input type="hidden" name="exceptionId" value={e.id} />
                <SubmitButton className="ward-btn ward-btn--ghost ward-btn--sm">✕</SubmitButton>
              </form>
            </span>
          ))}
        </div>
        <form action={tAddException} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8 }}>
          <input type="date" name="onDate" required className="ward-field__control" style={{ width: "auto" }} />
          <input type="text" name="reason" placeholder="السبب (اختياري)" className="ward-field__control" style={{ width: "auto" }} />
          <SubmitButton pendingText="…" className={btn("secondary")}>احجبي اليوم</SubmitButton>
        </form>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>موعدٌ مفرد (استثنائيّ)</h2>
        <SlotForm action={tAddSlot} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
          <span>مفتوحة: <strong style={{ color: "var(--text-strong)" }}>{open.length}</strong></span>
          <span>محجوزة: <strong style={{ color: "var(--text-strong)" }}>{booked.length}</strong></span>
        </div>
        {[...byDay.values()].map((day) => (
          <div key={day.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>{day.label}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {day.slots.map((s: any) => (
                <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--surface-card)", padding: "4px 10px", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                  {fmtTime(s.starts_at)}
                  {!s.source_rule_id && <Badge tone="neutral">يدويّ</Badge>}
                  <form action={tRemoveSlot}>
                    <input type="hidden" name="slotId" value={s.id} />
                    <SubmitButton className="ward-btn ward-btn--ghost ward-btn--sm">✕</SubmitButton>
                  </form>
                </span>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
