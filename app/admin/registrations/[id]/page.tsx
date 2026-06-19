import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  generateLeadTestAction,
  approveLeadTestAction,
  resendConfirmation,
  generateIntroReportAction,
  updateIntroReport,
  sendIntroReportAction,
  setPaymentStatus,
  updateLeadContact,
  cancelBooking,
  rebookByAdmin,
  updateOpsNote,
  archiveLead,
  unarchiveLead,
} from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ProvisionPanel from "@/components/studio/ProvisionPanel";
import PipelineStepper from "@/components/admin/PipelineStepper";
import DeleteLeadButton from "@/components/admin/DeleteLeadButton";
import { Card, Badge, Avatar, Spark } from "@/components/ward/ui";
import { labelOf, SKILL_AR, ENROLL_SKILLS, LEVELS } from "@/lib/enrollOptions";
import { ENGAGEMENT, STRENGTHS, FOCUS, DECISION } from "@/lib/introReport";
import { LEAD_STATUS_AR, LEAD_STATUS_TONE, computePipeline } from "@/lib/leads";
import { fmtUTC } from "@/lib/datetime";

const pillCls =
  "cursor-pointer rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50";
const flabel = { fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 } as const;

function Pills({
  name,
  options,
  type,
  selected,
}: {
  name: string;
  options: { value: string; label: string }[];
  type: "radio" | "checkbox";
  selected: string | string[] | null | undefined;
}) {
  const isSel = (v: string) => (Array.isArray(selected) ? selected.includes(v) : selected === v);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className={pillCls}>
          <input type={type} name={name} value={o.value} defaultChecked={isSel(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity -- server component: per-request date math is intentional */
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

  const { data: intro } = await supabase.from("intro_reports").select("*").eq("lead_id", id).maybeSingle();
  const { data: events } = await supabase.from("lead_events").select("kind, actor_name, at").eq("lead_id", id).order("at", { ascending: false }).limit(20);
  const twoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const { data: openSlots } = await supabase
    .from("availability_slots")
    .select("id, starts_at, duration_minutes")
    .eq("status", "open")
    .gte("starts_at", new Date().toISOString())
    .lt("starts_at", twoWeeks)
    .order("starts_at")
    .limit(40);

  const phone = (lead.guardian_phone ?? "").replace(/[^0-9]/g, "");
  const shareLink = test?.share_token ? `${SITE_URL}/t/${test.share_token}` : "";
  const waTest = phone && shareLink ? `https://wa.me/${phone}?text=${encodeURIComponent("اختبار تحديد المستوى لطفلك: " + shareLink)}` : "";
  const bookUrl = lead.book_token ? `${SITE_URL}/book/${lead.book_token}` : "";
  const waBook = phone && bookUrl ? `https://wa.me/${phone}?text=${encodeURIComponent("احجز جلسة طفلك التعريفية المجانية: " + bookUrl)}` : "";

  const pipeline = computePipeline({
    hasBooking: !!slot,
    testStatus: test?.status,
    introStatus: intro?.status,
    paymentStatus: lead.payment_status,
    converted: lead.status === "converted",
  });

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

      {/* Pipeline */}
      <Card style={{ paddingBlock: 18 }}>
        <PipelineStepper steps={pipeline.steps} currentIndex={pipeline.currentIndex} size="md" />
      </Card>

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

        <details style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--text-brand)" }}>تعديل بيانات التواصل</summary>
          <form action={updateLeadContact} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input name="studentName" defaultValue={lead.student_name ?? ""} className={ctl} placeholder="اسم الطالب" />
            <input name="guardianName" defaultValue={lead.guardian_name ?? ""} className={ctl} placeholder="اسم وليّ الأمر" />
            <input name="guardianEmail" type="email" defaultValue={lead.guardian_email ?? ""} className={ctl} dir="ltr" placeholder="البريد الإلكتروني" />
            <input name="guardianPhone" type="tel" defaultValue={lead.guardian_phone ?? ""} className={ctl} dir="ltr" placeholder="رقم الواتساب" />
            <SubmitButton pendingText="…" className={btn("secondary", "md")}>احفظ التعديلات</SubmitButton>
          </form>
        </details>
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
        {slot && (
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {(openSlots ?? []).length > 0 && (
              <form action={rebookByAdmin} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <input type="hidden" name="leadId" value={lead.id} />
                <select name="slotId" required defaultValue="" className={ctl} style={{ width: "auto" }}>
                  <option value="" disabled>اختر موعداً جديداً…</option>
                  {(openSlots ?? []).map((s: any) => (
                    <option key={s.id} value={s.id}>{fmtUTC(s.starts_at)}</option>
                  ))}
                </select>
                <SubmitButton pendingText="…" className={btn("secondary")}>إعادة الجدولة</SubmitButton>
              </form>
            )}
            <form action={cancelBooking}>
              <input type="hidden" name="leadId" value={lead.id} />
              <SubmitButton pendingText="…" className={btn("danger")}>إلغاء الحجز</SubmitButton>
            </form>
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

      {/* Intro session report (AI) */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={secTitle}>تقرير الجلسة التعريفية {intro?.status === "sent" && <Badge tone="success">أُرسل ✓</Badge>}</div>

        <form action={generateIntroReportAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="leadId" value={lead.id} />
          <div>
            <label style={flabel}>تفاعل الطفل</label>
            <Pills name="engagement" type="radio" options={ENGAGEMENT} selected={intro?.engagement} />
          </div>
          <div>
            <label style={flabel}>أبرز نقاط القوّة</label>
            <Pills name="strengths" type="checkbox" options={STRENGTHS} selected={intro?.strengths} />
          </div>
          <div>
            <label style={flabel}>أولويات التركيز</label>
            <Pills name="focus" type="checkbox" options={FOCUS} selected={intro?.focus} />
          </div>
          <div>
            <label style={flabel}>المستوى المؤكَّد</label>
            <Pills name="level" type="radio" options={LEVELS} selected={intro?.level ?? lead.student_level} />
          </div>
          <div>
            <label style={flabel}>قرار التسجيل</label>
            <Pills name="decision" type="radio" options={DECISION} selected={intro?.decision} />
          </div>
          <textarea name="teacherNote" rows={2} defaultValue={intro?.teacher_note ?? ""} placeholder="ملاحظةٌ تثري التقرير (اختياريّة)" className={ctl} />
          <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft", "md")}>
            <Spark size={15} /> {intro?.ai_report ? "أعِد توليد التقرير" : "ولّد التقرير بالذكاء"}
          </SubmitButton>
        </form>

        {intro?.ai_report && intro.status === "sent" && (
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--leaf-700)", fontWeight: 600 }}>
              أُرسل التقرير لوليّ الأمر ✓ {intro.sent_at ? `· ${fmtUTC(intro.sent_at)}` : ""}
            </p>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.9, fontSize: 14, color: "var(--text-body)", background: "var(--surface-soft)", borderRadius: 12, padding: 14 }}>
              {intro.ai_report}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>التقرير مُرسَلٌ ومُقفَل. لتعديله، أعِد توليده أعلاه ثمّ أرسِله من جديد.</p>
          </div>
        )}

        {intro?.ai_report && intro.status !== "sent" && (
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Spark size={16} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ward-purple-800)" }}>مسودّة التقرير — راجِعها وعدّلها قبل الإرسال</span>
            </div>
            <form action={updateIntroReport} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="hidden" name="leadId" value={lead.id} />
              <textarea name="aiReport" rows={9} defaultValue={intro.ai_report} className={ctl} dir="rtl" />
              <SubmitButton pendingText="…" className={btn("secondary")}>احفظ التعديلات</SubmitButton>
            </form>
            <form action={sendIntroReportAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <SubmitButton pendingText="جارٍ الإرسال…" className={btn("success", "md")}>اعتمِد وأرسِل لوليّ الأمر</SubmitButton>
            </form>
          </div>
        )}
      </Card>

      {/* Payment (manual until a real gateway exists) */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>
          الدفع {lead.payment_status === "paid" && <Badge tone="success">مدفوع ✓</Badge>}
        </div>
        <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>
          الحالة: {lead.payment_status === "paid" ? "تمّ الدفع" : lead.payment_status === "link_sent" ? "أُرسل رابط الدفع — بانتظار الدفع" : "بانتظار إرسال رابط الدفع"}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {lead.payment_status === "pending" && (
            <form action={setPaymentStatus}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value="link_sent" />
              <SubmitButton pendingText="…" className={btn("warm")}>سجّل: أُرسل رابط الدفع</SubmitButton>
            </form>
          )}
          {lead.payment_status !== "paid" && (
            <form action={setPaymentStatus}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value="paid" />
              <SubmitButton pendingText="…" className={btn("success")}>سجّل: تمّ الدفع</SubmitButton>
            </form>
          )}
          {lead.payment_status === "paid" && (
            <form action={setPaymentStatus}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value="pending" />
              <SubmitButton pendingText="…" className={btn("ghost")}>تراجع</SubmitButton>
            </form>
          )}
          {phone && (
            <a href={`https://wa.me/${phone}?text=${encodeURIComponent("رابط الدفع لإتمام تسجيل طفلكم في أكاديمية وَرد:")}`} target="_blank" rel="noopener noreferrer" className={btn("ghost")}>
              أرسِل رابط الدفع عبر واتساب
            </a>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>حالةٌ يدويّة مؤقّتة — بوابة دفعٍ حقيقية تأتي لاحقاً.</p>
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

      {/* Internal ops note */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>ملاحظة تشغيلية داخلية</div>
        <form action={updateOpsNote} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="leadId" value={lead.id} />
          <textarea name="opsNote" rows={2} defaultValue={lead.ops_note ?? ""} placeholder="ملاحظةٌ للفريق (لا تظهر لوليّ الأمر)" className={ctl} />
          <SubmitButton pendingText="…" className={btn("secondary")}>احفظ الملاحظة</SubmitButton>
        </form>
      </Card>

      {/* Activity log */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>سجلّ النشاط</div>
        {(events ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا نشاط بعد.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(events ?? []).map((e: any, i: number) => (
              <li key={i} style={{ display: "flex", gap: 8, justifyContent: "space-between", fontSize: 12.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-body)", fontWeight: 600 }}>{e.kind}</span>
                <span>{e.actor_name ?? "—"} · {fmtUTC(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Manage: archive / delete */}
      <Card style={{ borderColor: "var(--rose-300, #f0c8d2)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>إدارة الطلب</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {lead.archived ? (
            <form action={unarchiveLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <SubmitButton pendingText="…" className={btn("secondary")}>إلغاء الأرشفة</SubmitButton>
            </form>
          ) : (
            <form action={archiveLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <SubmitButton pendingText="…" className={btn("ghost")}>أرشِف الطلب</SubmitButton>
            </form>
          )}
          <DeleteLeadButton leadId={lead.id} studentName={lead.student_name ?? "الطالب"} />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>الأرشفة تُخفي الطلب دون حذفه. الحذف نهائيّ ويُحرّر الموعد المحجوز.</p>
      </Card>
    </div>
  );
}
