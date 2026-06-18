import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateLeadTestAction, approveLeadTestAction, resendConfirmation, saveIntroReport } from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ProvisionPanel from "@/components/studio/ProvisionPanel";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import { labelOf, SKILL_AR, ENROLL_SKILLS } from "@/lib/enrollOptions";
import { LEAD_STATUS_AR, LEAD_STATUS_TONE } from "@/lib/leads";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SITE_URL = "https://ward.academy";
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 12 } as const;
const ctl = "ward-field__control";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const { data: slot } = await supabase
    .from("availability_slots")
    .select("starts_at, status")
    .eq("lead_id", id)
    .eq("status", "booked")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: test } = await supabase
    .from("lead_tests")
    .select("id, status, share_token, suggested_level")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let qs: any[] = [];
  if (test) {
    const { data } = await supabase
      .from("lead_test_questions")
      .select("prompt, content, answer, level, position, response, is_correct")
      .eq("lead_test_id", test.id)
      .order("position");
    qs = data ?? [];
  }

  const phone = (lead.guardian_phone ?? "").replace(/[^0-9]/g, "");
  const shareLink = test?.share_token ? `${SITE_URL}/t/${test.share_token}` : "";
  const waTest = phone && shareLink ? `https://wa.me/${phone}?text=${encodeURIComponent("اختبار تحديد المستوى لطفلك: " + shareLink)}` : "";
  const bookUrl = lead.book_token ? `${SITE_URL}/book/${lead.book_token}` : "";
  const waBook = phone && bookUrl ? `https://wa.me/${phone}?text=${encodeURIComponent("احجز جلسة طفلك التعريفية المجانية: " + bookUrl)}` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <Link href="/admin/registrations" className={btn("ghost")} style={{ alignSelf: "flex-start" }}>
        → كلّ الطلبات
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={lead.student_name ?? "?"} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>
            {lead.student_name}{" "}
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>
              · {lead.student_age ? `${lead.student_age} سنة` : "—"} · {labelOf("level", lead.student_level)}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>وليّ الأمر: {lead.guardian_name}</div>
        </div>
        <Badge tone={LEAD_STATUS_TONE[lead.status] ?? "neutral"}>{LEAD_STATUS_AR[lead.status] ?? lead.status}</Badge>
      </div>

      {/* Details */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>تفاصيل الطلب</div>
        <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>
          {lead.guardian_name}
          {lead.guardian_relation ? ` (${labelOf("relation", lead.guardian_relation)})` : ""} · {lead.guardian_email}
          {lead.guardian_phone ? ` · ${lead.guardian_phone}` : ""}
        </p>
        <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>
          {lead.guardian_country ? `الإقامة: ${lead.guardian_country}` : ""}
          {lead.guardian_nationality ? ` · الجنسية: ${lead.guardian_nationality}` : ""}
          {lead.referral_source ? ` · عرفنا عبر: ${labelOf("referral", lead.referral_source)}` : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Badge tone="neutral">التعليم: {labelOf("schoolType", lead.school_type)}</Badge>
          <Badge tone="neutral">الهدف: {labelOf("goal", lead.learning_goal)}</Badge>
          <Badge tone="neutral">الاستخدام: {labelOf("englishUse", lead.english_use)}</Badge>
          {lead.home_language && <Badge tone="neutral">لغة البيت: {lead.home_language}</Badge>}
          {lead.prior_study && <Badge tone="neutral">سابقاً: {labelOf("priorStudy", lead.prior_study)}</Badge>}
          {lead.consent_accepted && <Badge tone="success">وافق على الخصوصية ✓</Badge>}
        </div>
        {lead.skill_levels && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ENROLL_SKILLS.filter((sk) => lead.skill_levels?.[sk]).map((sk) => (
              <Badge key={sk} tone="brand">
                {SKILL_AR[sk]}: {labelOf("rating", lead.skill_levels[sk])}
              </Badge>
            ))}
          </div>
        )}
        {lead.student_notes && <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>ملاحظات: {lead.student_notes}</p>}
      </Card>

      {/* Booking */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={secTitle}>الجلسة التعريفية</div>
            <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>{slot ? `الموعد: ${fmtUTC(slot.starts_at)}` : "لم يُحجز موعدٌ بعد."}</p>
          </div>
          {slot && (
            <form action={resendConfirmation}>
              <input type="hidden" name="leadId" value={lead.id} />
              <SubmitButton pendingText="…" className={btn("ghost")}>أعِد إرسال بريد التأكيد</SubmitButton>
            </form>
          )}
        </div>
        {!slot && lead.book_token && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>أرسِل رابط الحجز لوليّ الأمر ليختار موعداً:</p>
            <p dir="ltr" style={{ wordBreak: "break-all", background: "var(--surface-soft)", borderRadius: 8, padding: 8, fontSize: 12 }}>{bookUrl}</p>
            {waBook && (
              <a href={waBook} target="_blank" rel="noopener noreferrer" className={btn("success", "md")} style={{ alignSelf: "flex-start" }}>
                أرسِل رابط الحجز عبر واتساب
              </a>
            )}
          </div>
        )}
      </Card>

      {/* Placement test */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={secTitle}>اختبار تحديد المستوى</div>
        {!test && (
          <form action={generateLeadTestAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft", "md")}>ولّد اختبار التحديد بالذكاء</SubmitButton>
          </form>
        )}
        {test?.status === "draft" && (
          <>
            <p style={{ fontSize: 12.5, color: "var(--warning-fg)", fontWeight: 600 }}>مسودّة — راجِع ثمّ اعتمد للمشاركة</p>
            <ol style={{ display: "flex", flexDirection: "column", gap: 8, paddingInlineStart: 18, listStyle: "decimal" }}>
              {qs.map((q, i) => (
                <li key={i}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>[{q.level}]</span>{" "}
                  <span dir="ltr" style={{ fontFamily: "var(--font-en-body)" }}>{q.prompt}</span>
                  <div dir="ltr" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {((q.content?.options ?? []) as string[]).map((o, j) => (
                      <span key={j} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: o === q.answer ? "var(--leaf-100)" : "var(--ink-100)", color: o === q.answer ? "var(--leaf-700)" : "var(--ink-600)" }}>{o}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <form action={approveLeadTestAction}>
              <input type="hidden" name="testId" value={test.id} />
              <SubmitButton pendingText="…" className={btn("success", "md")}>اعتمِد وأنشئ رابط المشاركة</SubmitButton>
            </form>
          </>
        )}
        {test?.status === "shared" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 13.5, color: "var(--leaf-700)", fontWeight: 600 }}>الاختبار جاهزٌ للمشاركة:</p>
            <p dir="ltr" style={{ wordBreak: "break-all", background: "var(--surface-soft)", borderRadius: 8, padding: 8, fontSize: 12 }}>{shareLink}</p>
            {waTest && (
              <a href={waTest} target="_blank" rel="noopener noreferrer" className={btn("success", "md")} style={{ alignSelf: "flex-start" }}>
                شارك عبر واتساب
              </a>
            )}
          </div>
        )}
        {test?.status === "completed" && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>
              اكتمل الاختبار · المستوى المقترح: <span style={{ fontWeight: 700, color: "var(--leaf-700)" }}>{test.suggested_level ?? "—"}</span>
            </p>
            <ol style={{ display: "flex", flexDirection: "column", gap: 6, paddingInlineStart: 18, listStyle: "decimal" }}>
              {qs.map((q, i) => (
                <li key={i} style={{ fontSize: 13 }}>
                  <span dir="ltr" style={{ fontFamily: "var(--font-en-body)" }}>{q.prompt}</span>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: q.is_correct ? "var(--leaf-700)" : "var(--rose-700)" }}>
                      {q.is_correct ? "✓" : "✗"} إجابة الطالب: {String(q.response?.answer ?? "—")}
                    </span>
                    {!q.is_correct && <span style={{ color: "var(--text-muted)" }}> · الصحيح: {String(q.answer)}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </Card>

      {/* Intro report */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>تقرير الجلسة التعريفية {lead.intro_done_at && <Badge tone="success">سُجّل ✓</Badge>}</div>
        <form action={saveIntroReport} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="leadId" value={lead.id} />
          <select name="outcome" defaultValue={lead.intro_outcome ?? ""} className={ctl}>
            <option value="">— النتيجة —</option>
            <option value="interested">مهتمّ — نُكمل التسجيل</option>
            <option value="follow_up">يحتاج متابعة</option>
            <option value="declined">اعتذر</option>
          </select>
          <textarea name="notes" rows={2} defaultValue={lead.intro_notes ?? ""} placeholder="ملاحظات الجلسة التعريفية" className={ctl} />
          <SubmitButton pendingText="…" className={btn("secondary", "md")} >{lead.intro_done_at ? "حدّث التقرير" : "احفظ التقرير"}</SubmitButton>
        </form>
      </Card>

      {/* Provisioning */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>إنشاء الحسابات</div>
        {lead.status === "converted" ? (
          <p style={{ fontSize: 13.5, color: "var(--leaf-700)", fontWeight: 600 }}>تمّ تجهيز حسابات وليّ الأمر والطالب ✓</p>
        ) : (
          <ProvisionPanel leadId={lead.id} guardianPhone={lead.guardian_phone} />
        )}
      </Card>
    </div>
  );
}
