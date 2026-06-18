import { createClient } from "@/lib/supabase/server";
import { createRule, deleteRule, addException, removeException, regenerateSlots, removeSlot } from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SlotForm from "@/components/studio/SlotForm";
import { Card, Badge } from "@/components/ward/ui";
import { WEEKDAY_AR } from "@/lib/availability";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const sel = "ward-select__control";
const hm = (t: string) => (t ? t.slice(0, 5) : "");

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("timezone").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";

  const { data: rules } = await supabase.from("availability_rules").select("id, weekday, start_time, end_time, slot_minutes, active").order("weekday");
  const { data: exceptions } = await supabase.from("availability_exceptions").select("id, on_date, reason").order("on_date");
  const { data: slots } = await supabase.from("availability_slots").select("id, starts_at, status, source_rule_id, lead_id").order("starts_at");
  const open = (slots ?? []).filter((s: any) => s.status === "open");
  const booked = (slots ?? []).filter((s: any) => s.status === "booked");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", flex: 1 }}>
          الأوقات تُفسَّر بالمنطقة الزمنية <Badge tone="neutral">{tz}</Badge> وتُوَلَّد المواعيد لأربعة أسابيع قادمة.
        </p>
        <form action={regenerateSlots}>
          <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft", "md")}>أعِد توليد المواعيد</SubmitButton>
        </form>
      </div>

      {/* Weekly rules */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>القواعد الأسبوعية المتكرّرة</h2>
        {(rules ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا قواعد بعد — أضِف واحدةً أدناه.</p>}
        {(rules ?? []).map((r: any) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
            <Badge tone="brand">{WEEKDAY_AR[r.weekday]}</Badge>
            <span style={{ fontSize: 14, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{hm(r.start_time)} – {hm(r.end_time)}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>كلّ {r.slot_minutes} دقيقة</span>
            <form action={deleteRule} style={{ marginInlineStart: "auto" }}>
              <input type="hidden" name="ruleId" value={r.id} />
              <SubmitButton className={btn("ghost")}>حذف</SubmitButton>
            </form>
          </div>
        ))}
        <form action={createRule} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8 }}>
          <select name="weekday" defaultValue="1" className={sel} style={{ width: "auto", minHeight: 40 }}>
            {WEEKDAY_AR.map((w, i) => <option key={i} value={i}>{w}</option>)}
          </select>
          <input type="time" name="startTime" defaultValue="16:00" required className="ward-field__control" style={{ width: "auto" }} />
          <input type="time" name="endTime" defaultValue="18:00" required className="ward-field__control" style={{ width: "auto" }} />
          <select name="slotMinutes" defaultValue="30" className={sel} style={{ width: "auto", minHeight: 40 }}>
            <option value="30">30 دقيقة</option>
            <option value="45">45 دقيقة</option>
            <option value="60">60 دقيقة</option>
          </select>
          <SubmitButton pendingText="…" className={btn("primary")}>أضِف قاعدة</SubmitButton>
        </form>
      </Card>

      {/* Exceptions */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>الاستثناءات (أيّام محجوبة)</h2>
        {(exceptions ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا استثناءات.</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(exceptions ?? []).map((e: any) => (
            <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "var(--surface-sunken)", padding: "4px 10px", fontSize: 13 }}>
              {e.on_date}{e.reason ? ` · ${e.reason}` : ""}
              <form action={removeException}>
                <input type="hidden" name="exceptionId" value={e.id} />
                <SubmitButton className="ward-btn ward-btn--ghost ward-btn--sm" >✕</SubmitButton>
              </form>
            </span>
          ))}
        </div>
        <form action={addException} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8 }}>
          <input type="date" name="onDate" required className="ward-field__control" style={{ width: "auto" }} />
          <input type="text" name="reason" placeholder="السبب (اختياري)" className="ward-field__control" style={{ width: "auto" }} />
          <SubmitButton pendingText="…" className={btn("secondary")}>احجب اليوم</SubmitButton>
        </form>
      </Card>

      {/* Manual one-off + overview */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>إضافة موعدٍ مفرد (استثنائيّ)</h2>
        <SlotForm />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
          <span>مفتوحة: <strong style={{ color: "var(--text-strong)" }}>{open.length}</strong></span>
          <span>محجوزة: <strong style={{ color: "var(--text-strong)" }}>{booked.length}</strong></span>
        </div>
        {open.length > 0 && (
          <ul style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {open.slice(0, 40).map((s: any) => (
              <li key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--surface-card)", padding: "4px 10px", fontSize: 12.5 }}>
                <span>{fmtUTC(s.starts_at)}</span>
                {!s.source_rule_id && <Badge tone="neutral">يدويّ</Badge>}
                <form action={removeSlot}>
                  <input type="hidden" name="slotId" value={s.id} />
                  <SubmitButton className="ward-btn ward-btn--ghost ward-btn--sm">✕</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
