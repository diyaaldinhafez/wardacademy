/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";

const ENR_TONE: Record<string, any> = { active: "success", paused: "warning", cancelled: "neutral" };

export default async function StudentsPage() {
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.students" });
  const enrLabel = (s: string) => (s === "active" ? t("enrActive") : s === "paused" ? t("enrPaused") : t("enrCancelled"));
  const { data: tenant } = await supabase.from("tenants").select("currency").maybeSingle();
  const currency = tenant?.currency ?? "SAR";

  const { data: people } = await supabase.from("profiles").select("id, full_name, roles");
  const learners = (people ?? []).filter((p: any) => ((p.roles as string[]) ?? []).includes("learner"));
  const { data: enrollments } = await supabase.from("enrollments").select("id, learner_id, status, monthly_fee");
  const { data: invoices } = await supabase.from("invoices").select("learner_id, period, status, due_date");

  const enrByLearner = new Map<string, any>();
  for (const e of (enrollments ?? []) as any[]) if (!enrByLearner.has(e.learner_id)) enrByLearner.set(e.learner_id, e);

  const d = new Date();
  const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const today = d.toISOString().slice(0, 10);
  const thisMonthByLearner = new Map<string, string>();
  const overdueByLearner = new Map<string, boolean>();
  for (const inv of (invoices ?? []) as any[]) {
    if (inv.period === period) thisMonthByLearner.set(inv.learner_id, inv.status);
    if (inv.status === "pending" && inv.due_date && inv.due_date < today) overdueByLearner.set(inv.learner_id, true);
  }

  return (
    <>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("listIntro")}</p>
      {learners.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("listEmpty")}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {learners.map((l: any) => {
          const enr = enrByLearner.get(l.id);
          const inv = thisMonthByLearner.get(l.id);
          return (
            <Card key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Link
                href={`/admin/students/${l.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160, textDecoration: "none" }}
              >
                <Avatar name={l.full_name ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{l.full_name ?? l.id}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    {enr ? t("perMonth", { fee: enr.monthly_fee, currency }) : t("noSubYet")}
                  </div>
                </div>
              </Link>
              {enr ? <Badge tone={ENR_TONE[enr.status] ?? "neutral"}>{enrLabel(enr.status)}</Badge> : <Badge tone="apricot">{t("noSub")}</Badge>}
              <Badge tone={inv === "paid" ? "success" : inv === "pending" ? "warning" : "neutral"}>
                {inv === "paid" ? t("monthPaid") : inv === "pending" ? t("monthPending") : t("noInvoiceThisMonth")}
              </Badge>
              {(overdueByLearner.get(l.id) || enr?.status === "paused") && <Badge tone="danger">{t("atRisk")}</Badge>}
              <Link href={`/admin/students/${l.id}`} className="ward-btn ward-btn--ghost ward-btn--sm">{t("manage")}</Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
