/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { tDeleteRule, tAddRule } from "@/app/studio/availability-actions";
import SubmitButton from "@/components/studio/SubmitButton";
import RuleForm from "@/components/admin/RuleForm";
import AvailabilityMatrix from "@/components/availability/AvailabilityMatrix";
import { Card, Badge } from "@/components/ward/ui";
import { WEEKDAY_EN, sessionsPerRule } from "@/lib/availability";

const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const hm = (t: string) => (t ? t.slice(0, 5) : "");

export default async function MyAvailabilityPage() {
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "availability" });
  const { data: tenant } = await supabase.from("tenants").select("timezone, slot_break_minutes").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";
  const brk = tenant?.slot_break_minutes ?? 15;

  // RLS scopes these to the signed-in teacher's own rows.
  const { data: rules } = await supabase.from("availability_rules").select("id, weekday, start_time, end_time, slot_minutes").order("weekday");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", flex: 1, minWidth: 220 }}>
          {t("introA")} <Badge tone="neutral">{tz}</Badge> {t("introB")}
        </p>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{t("visualTitle")}</h2>
        <AvailabilityMatrix rules={(rules ?? []) as any} />
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{t("weeklyTitle")}</h2>
        {(rules ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("empty")}</p>}
        {(rules ?? []).map((r: any) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
            <Badge tone="brand">{WEEKDAY_EN[r.weekday]}</Badge>
            <span style={{ fontSize: 14, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{hm(r.start_time)} – {hm(r.end_time)}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{t("everyMinutes", { n: r.slot_minutes })}</span>
            <Badge tone="success">{t("sessionsPerWeek", { n: sessionsPerRule(r.start_time, r.end_time, r.slot_minutes, brk) })}</Badge>
            <form action={tDeleteRule} style={{ marginInlineStart: "auto" }}>
              <input type="hidden" name="ruleId" value={r.id} />
              <SubmitButton className={btn("danger")}>{t("delete")}</SubmitButton>
            </form>
          </div>
        ))}
        <RuleForm breakMinutes={brk} action={tAddRule} />
      </Card>
    </div>
  );
}
