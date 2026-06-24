import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Avatar, Badge } from "@/components/ward/ui";
import PipelineStepper from "@/components/admin/PipelineStepper";
import RuleForm from "@/components/admin/RuleForm";
import AvailabilityMatrix from "@/components/availability/AvailabilityMatrix";
import SubmitButton from "@/components/studio/SubmitButton";
import { addIntroRule, deleteIntroRule, regenerateIntroSlots } from "@/app/admin/actions";
import { getTranslations } from "next-intl/server";
import { labelOfEn } from "@/lib/enrollOptions";
import { WEEKDAY_EN, sessionsPerRule } from "@/lib/availability";
import { PIPELINE, PIPELINE_EN, ACTION_LABEL_EN, computePipeline } from "@/lib/leads";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "", q = "" } = await searchParams;
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.registrations" });
  const ta = await getTranslations({ locale: "en", namespace: "availability" });

  const { data: leadsRaw } = await supabase
    .from("leads")
    .select("id, student_name, student_age, student_level, status, payment_status, archived, guardian_name, guardian_phone, created_at")
    .order("created_at", { ascending: false });
  const { data: slots } = await supabase.from("availability_slots").select("lead_id, starts_at, status");
  const { data: tests } = await supabase.from("lead_tests").select("lead_id, status, created_at").order("created_at", { ascending: false });
  const { data: intros } = await supabase.from("intro_reports").select("lead_id, status");
  const { data: introRules } = await supabase.from("intro_availability_rules").select("id, weekday, start_time, end_time, slot_minutes").order("weekday");
  const { data: introTenant } = await supabase.from("tenants").select("slot_break_minutes").maybeSingle();
  const introBrk = introTenant?.slot_break_minutes ?? 15;

  const bookedByLead = new Map<string, string>();
  for (const s of (slots ?? []) as any[]) if (s.lead_id && s.status === "booked") bookedByLead.set(s.lead_id, s.starts_at);
  const testByLead = new Map<string, string>();
  for (const t of (tests ?? []) as any[]) if (!testByLead.has(t.lead_id)) testByLead.set(t.lead_id, t.status);
  const introByLead = new Map<string, string>();
  for (const r of (intros ?? []) as any[]) introByLead.set(r.lead_id, r.status);

  const all = (leadsRaw ?? []) as any[];
  const active = all.filter((l) => !l.archived);
  const counts: Record<string, number> = { "": active.length, archived: all.length - active.length };
  for (const l of active) counts[l.status] = (counts[l.status] ?? 0) + 1;

  const qn = q.trim().toLowerCase();
  const base = status === "archived" ? all.filter((l) => l.archived) : active;
  const leads = base.filter((l) => {
    if (status && status !== "archived" && l.status !== status) return false;
    if (qn) {
      const hay = `${l.student_name ?? ""} ${l.guardian_name ?? ""} ${l.guardian_phone ?? ""}`.toLowerCase();
      if (!hay.includes(qn)) return false;
    }
    return true;
  });

  const tabs = [...PIPELINE.map((p) => ({ key: p.key, label: PIPELINE_EN[p.key] ?? p.label })), { key: "archived", label: t("archivedTab") }];
  const tabHref = (key: string) => `/admin/registrations${key ? `?status=${key}` : ""}`;

  return (
    <>
      {/* Intro/trial session availability — admin-owned, independent of any teacher */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
            {t("introSlotsTitle")}
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>{t("introSlotsHint")}</span>
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {(introRules ?? []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("introSlotsEmpty")}</p>}
            {(introRules ?? []).map((r: any) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--ink-100)", paddingBottom: 8 }}>
                <Badge tone="brand">{WEEKDAY_EN[r.weekday]}</Badge>
                <span style={{ fontSize: 14, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>{String(r.start_time).slice(0, 5)} – {String(r.end_time).slice(0, 5)}</span>
                <Badge tone="success">{t("slotsPerWeek", { n: sessionsPerRule(r.start_time, r.end_time, r.slot_minutes, introBrk) })}</Badge>
                <form action={deleteIntroRule} style={{ marginInlineStart: "auto" }}>
                  <input type="hidden" name="ruleId" value={r.id} />
                  <SubmitButton className="ward-btn ward-btn--danger ward-btn--sm">{ta("delete")}</SubmitButton>
                </form>
              </div>
            ))}
            <RuleForm breakMinutes={introBrk} action={addIntroRule} />
            <form action={regenerateIntroSlots}>
              <SubmitButton pendingText="…" className="ward-btn ward-btn--ghost ward-btn--sm">{t("refreshSlots")}</SubmitButton>
            </form>
            <AvailabilityMatrix rules={(introRules ?? []) as any} />
          </div>
        </details>
      </Card>

      {/* Filter tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tabs.map((t) => {
          const activeTab = status === t.key;
          return (
            <Link
              key={t.key || "all"}
              href={tabHref(t.key)}
              className="ward-btn ward-btn--sm"
              style={{
                background: activeTab ? "var(--brand)" : "var(--surface-card)",
                color: activeTab ? "#fff" : "var(--text-muted)",
                border: activeTab ? "none" : "1px solid var(--border-soft)",
              }}
            >
              {t.label}
              <span style={{ marginInlineStart: 6, opacity: 0.8 }}>{counts[t.key] ?? 0}</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="get" action="/admin/registrations" style={{ display: "flex", gap: 8 }}>
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder={t("searchPh")} className="ward-field__control" style={{ maxWidth: 320 }} />
        <button type="submit" className="ward-btn ward-btn--secondary ward-btn--md">{t("search")}</button>
      </form>

      {leads.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("noMatch")}</p>}

      {/* List */}
      {leads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {leads.map((l) => {
            const booked = bookedByLead.get(l.id);
            const { steps, currentIndex, nextAction } = computePipeline({
              hasBooking: !!booked,
              testStatus: testByLead.get(l.id),
              introStatus: introByLead.get(l.id),
              paymentStatus: l.payment_status,
              converted: l.status === "converted",
            });
            return (
              <Card key={l.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <Link
                    href={`/admin/registrations/${l.id}`}
                    title={t("viewLeadTitle")}
                    style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160, textDecoration: "none" }}
                  >
                    <Avatar name={l.student_name ?? "?"} size={40} />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>
                        {l.student_name}{" "}
                        <span style={{ fontWeight: 400, fontSize: 13, color: "var(--text-muted)" }}>
                          · {l.student_age ? t("yearsOld", { n: l.student_age }) : "—"} · {labelOfEn("level", l.student_level)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {l.guardian_name} {booked ? t("leadAppt", { time: fmtUTC(booked) }) : t("leadNoBooking")}
                      </div>
                    </div>
                  </Link>
                  <Link
                    href={`/admin/registrations/${l.id}`}
                    className={`ward-btn ${nextAction ? "ward-btn--warm" : "ward-btn--ghost"} ward-btn--sm`}
                  >
                    {nextAction ? `${ACTION_LABEL_EN[nextAction.key]} →` : t("view")}
                  </Link>
                </div>
                <PipelineStepper steps={steps} currentIndex={currentIndex} size="sm" />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
