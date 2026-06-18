import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import { labelOf } from "@/lib/enrollOptions";
import { LEAD_STATUS_AR, LEAD_STATUS_TONE, PIPELINE, nextStep } from "@/lib/leads";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "", q = "" } = await searchParams;
  const supabase = await createClient();

  const { data: leadsRaw } = await supabase
    .from("leads")
    .select("id, student_name, student_age, student_level, status, guardian_name, guardian_phone, created_at")
    .order("created_at", { ascending: false });
  const { data: slots } = await supabase.from("availability_slots").select("lead_id, starts_at, status");
  const { data: tests } = await supabase.from("lead_tests").select("lead_id, status, created_at").order("created_at", { ascending: false });

  const bookedByLead = new Map<string, string>();
  for (const s of (slots ?? []) as any[]) if (s.lead_id && s.status === "booked") bookedByLead.set(s.lead_id, s.starts_at);
  const testByLead = new Map<string, string>();
  for (const t of (tests ?? []) as any[]) if (!testByLead.has(t.lead_id)) testByLead.set(t.lead_id, t.status);

  const all = (leadsRaw ?? []) as any[];
  const counts: Record<string, number> = { "": all.length };
  for (const l of all) counts[l.status] = (counts[l.status] ?? 0) + 1;

  const qn = q.trim().toLowerCase();
  const leads = all.filter((l) => {
    if (status && l.status !== status) return false;
    if (qn) {
      const hay = `${l.student_name ?? ""} ${l.guardian_name ?? ""} ${l.guardian_phone ?? ""}`.toLowerCase();
      if (!hay.includes(qn)) return false;
    }
    return true;
  });

  const tabHref = (key: string) => `/admin/registrations${key ? `?status=${key}` : ""}`;

  return (
    <>
      {/* Filter tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PIPELINE.map((t) => {
          const active = status === t.key;
          return (
            <Link
              key={t.key || "all"}
              href={tabHref(t.key)}
              className="ward-btn ward-btn--sm"
              style={{
                background: active ? "var(--brand)" : "var(--surface-card)",
                color: active ? "#fff" : "var(--text-muted)",
                border: active ? "none" : "1px solid var(--border-soft)",
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
        <input name="q" defaultValue={q} placeholder="ابحث بالاسم أو الجوال…" className="ward-field__control" style={{ maxWidth: 320 }} />
        <button type="submit" className="ward-btn ward-btn--secondary ward-btn--md">بحث</button>
      </form>

      {/* List */}
      {leads.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا طلبات مطابِقة.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {leads.map((l) => {
          const booked = bookedByLead.get(l.id);
          const step = nextStep(l.status, testByLead.get(l.id));
          const phone = (l.guardian_phone ?? "").replace(/[^0-9]/g, "");
          return (
            <Card key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Avatar name={l.student_name ?? "?"} size={40} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>
                  {l.student_name}{" "}
                  <span style={{ fontWeight: 400, fontSize: 13, color: "var(--text-muted)" }}>
                    · {l.student_age ? `${l.student_age} سنة` : "—"} · {labelOf("level", l.student_level)}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {l.guardian_name} {booked ? `· موعد: ${fmtUTC(booked)}` : "· بلا حجز"}
                </div>
              </div>
              <Badge tone={LEAD_STATUS_TONE[l.status] ?? "neutral"}>{LEAD_STATUS_AR[l.status] ?? l.status}</Badge>
              {phone && (
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="ward-btn ward-btn--ghost ward-btn--sm">
                  واتساب
                </a>
              )}
              {step ? (
                <Link href={`/admin/registrations/${l.id}`} className={`ward-btn ward-btn--${step.tone === "neutral" ? "secondary" : "soft"} ward-btn--sm`}>
                  {step.label} ←
                </Link>
              ) : (
                <Link href={`/admin/registrations/${l.id}`} className="ward-btn ward-btn--ghost ward-btn--sm">
                  عرض
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
