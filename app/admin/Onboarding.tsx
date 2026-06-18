import { createClient } from "@/lib/supabase/server";
import { generateLeadTestAction, approveLeadTestAction, resendConfirmation, saveIntroReport } from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ProvisionPanel from "@/components/studio/ProvisionPanel";
import { fmtUTC } from "@/lib/datetime";
import { labelOf, SKILL_AR, ENROLL_SKILLS } from "@/lib/enrollOptions";

function ageFrom(dob?: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return `${a} سنة`;
}

const SITE_URL = "https://ward.academy";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Onboarding() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, guardian_name, guardian_email, guardian_phone, guardian_country, guardian_nationality, guardian_relation, referral_source, online_ready, consent_accepted, student_name, student_dob, student_grade, student_level, school_type, learning_goal, prior_study, english_use, home_language, skill_levels, student_notes, status, created_at, intro_outcome, intro_notes, intro_done_at")
    .order("created_at", { ascending: false });
  const { data: slots } = await supabase
    .from("availability_slots")
    .select("id, starts_at, status, lead_id")
    .order("starts_at");
  const { data: tests } = await supabase
    .from("lead_tests")
    .select("id, lead_id, status, share_token, suggested_level")
    .order("created_at", { ascending: false });
  const { data: questions } = await supabase
    .from("lead_test_questions")
    .select("lead_test_id, prompt, content, answer, level, position, response, is_correct")
    .order("position");

  const slotByLead = new Map<string, any>();
  for (const s of (slots ?? []) as any[]) if (s.lead_id) slotByLead.set(s.lead_id, s);
  const testByLead = new Map<string, any>();
  for (const t of (tests ?? []) as any[]) if (!testByLead.has(t.lead_id)) testByLead.set(t.lead_id, t);
  const qByTest = new Map<string, any[]>();
  for (const q of (questions ?? []) as any[]) {
    const a = qByTest.get(q.lead_test_id) ?? [];
    a.push(q);
    qByTest.set(q.lead_test_id, a);
  }
  return (
    <>
      {/* Registration requests */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          طلبات التسجيل <span className="text-ink-soft">({(leads ?? []).length})</span>
        </h2>
        {(leads ?? []).length === 0 && <p className="text-sm text-ink-soft">لا طلبات بعد.</p>}
        <ul className="flex flex-col gap-3">
          {(leads ?? []).map((lead: any) => {
            const booked = slotByLead.get(lead.id);
            const test = testByLead.get(lead.id);
            const qs = test ? qByTest.get(test.id) ?? [] : [];
            const phone = (lead.guardian_phone ?? "").replace(/[^0-9]/g, "");
            const shareLink = test?.share_token ? `${SITE_URL}/t/${test.share_token}` : "";
            const wa = phone && shareLink ? `https://wa.me/${phone}?text=${encodeURIComponent("اختبار تحديد المستوى لطفلك: " + shareLink)}` : "";
            return (
              <li key={lead.id} className="rounded-xl border border-brand-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {lead.student_name}{" "}
                      <span className="text-sm text-ink-soft">
                        · {labelOf("stage", lead.student_grade)} · {labelOf("level", lead.student_level)} · {ageFrom(lead.student_dob)}
                      </span>
                    </p>
                    <p className="text-sm text-ink-soft">
                      وليّ الأمر: {lead.guardian_name}
                      {lead.guardian_relation ? ` (${labelOf("relation", lead.guardian_relation)})` : ""} · {lead.guardian_email}
                      {lead.guardian_phone ? ` · ${lead.guardian_phone}` : ""}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {lead.guardian_country ? `الإقامة: ${lead.guardian_country}` : ""}
                      {lead.guardian_nationality ? ` · الجنسية: ${lead.guardian_nationality}` : ""}
                      {lead.referral_source ? ` · عرفنا عبر: ${labelOf("referral", lead.referral_source)}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-ink-soft">التعليم: {labelOf("schoolType", lead.school_type)}</span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-ink-soft">الهدف: {labelOf("goal", lead.learning_goal)}</span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-ink-soft">الاستخدام: {labelOf("englishUse", lead.english_use)}</span>
                      {lead.home_language && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-ink-soft">لغة البيت: {lead.home_language}</span>}
                      {lead.prior_study && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-ink-soft">سابقاً: {labelOf("priorStudy", lead.prior_study)}</span>}
                      {lead.online_ready && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-ink-soft">أونلاين: {labelOf("onlineReady", lead.online_ready)}</span>}
                      {lead.consent_accepted && <span className="rounded-full bg-leaf/10 px-2 py-0.5 font-medium text-leaf">وافق على الخصوصية ✓</span>}
                    </div>
                    {lead.skill_levels && (
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        {ENROLL_SKILLS.filter((sk) => lead.skill_levels?.[sk]).map((sk) => (
                          <span key={sk} className="rounded-full border border-brand-100 px-2 py-0.5 text-ink-soft">
                            {SKILL_AR[sk]}: {labelOf("rating", lead.skill_levels[sk])}
                          </span>
                        ))}
                      </div>
                    )}
                    {lead.student_notes && <p className="mt-1 text-sm text-ink-soft">ملاحظات: {lead.student_notes}</p>}
                    <p className="mt-1 text-xs text-ink-soft">الموعد: {booked ? fmtUTC(booked.starts_at) : "لم يُحجز بعد"}</p>
                    {booked && (
                      <form action={resendConfirmation} className="mt-1">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <SubmitButton pendingText="…" className="text-xs font-medium text-brand-700 hover:underline">
                          أعِد إرسال بريد التأكيد
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                  {phone && (
                    <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                      واتساب
                    </a>
                  )}
                </div>

                <div className="mt-3 border-t border-brand-100 pt-3">
                  {!test && (
                    <form action={generateLeadTestAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <SubmitButton pendingText="جارٍ التوليد…" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                        ولّد اختبار تحديد المستوى
                      </SubmitButton>
                    </form>
                  )}
                  {test?.status === "draft" && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-amber-700">مسودّة الاختبار — راجِع ثمّ اعتمِد للمشاركة</p>
                      <ol className="mb-3 list-decimal space-y-2 pr-5 text-sm">
                        {qs.map((q: any, i: number) => (
                          <li key={i}>
                            <span className="text-ink-soft">[{q.level}]</span> {q.prompt}
                            <ul className="mt-1 pr-4 text-xs text-ink-soft">
                              {((q.content?.options ?? []) as string[]).map((o, j) => (
                                <li key={j}>– {o}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-emerald-700">
                              الإجابة: {typeof q.answer === "string" ? q.answer : JSON.stringify(q.answer)}
                            </p>
                          </li>
                        ))}
                      </ol>
                      <form action={approveLeadTestAction}>
                        <input type="hidden" name="testId" value={test.id} />
                        <SubmitButton pendingText="…" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                          اعتمِد وأنشئ رابط المشاركة
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                  {test?.status === "shared" && (
                    <div className="text-sm">
                      <p className="font-medium text-emerald-700">الاختبار جاهزٌ للمشاركة:</p>
                      <p className="mt-1 break-all rounded bg-brand-50 p-2 text-xs" dir="ltr">{shareLink}</p>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          شارك عبر واتساب
                        </a>
                      )}
                    </div>
                  )}
                  {test?.status === "completed" && (
                    <div>
                      <p className="mb-2 text-sm text-ink">
                        اكتمل الاختبار · المستوى المقترح:{" "}
                        <span className="font-semibold text-emerald-700">{test.suggested_level ?? "—"}</span>
                      </p>
                      <ol className="list-decimal space-y-1.5 pr-5 text-sm">
                        {qs.map((q: any, i: number) => (
                          <li key={i}>
                            <span dir="ltr">{q.prompt}</span>
                            <div className="text-xs">
                              <span className={q.is_correct ? "text-emerald-700" : "text-rose-600"}>
                                {q.is_correct ? "✓" : "✗"} إجابة الطالب: {String(q.response?.answer ?? "—")}
                              </span>
                              {!q.is_correct && (
                                <span className="text-ink-soft">
                                  {" "}· الصحيح: {typeof q.answer === "string" ? q.answer : JSON.stringify(q.answer)}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Intro session report */}
                <div className="mt-3 border-t border-brand-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-ink">
                    تقرير الجلسة التعريفية {lead.intro_done_at && <span className="text-emerald-700">· سُجّل ✓</span>}
                  </p>
                  <form action={saveIntroReport} className="flex flex-col gap-2">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <select name="outcome" defaultValue={lead.intro_outcome ?? ""} className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm">
                      <option value="">— النتيجة —</option>
                      <option value="interested">مهتمّ — نُكمل التسجيل</option>
                      <option value="follow_up">يحتاج متابعة</option>
                      <option value="declined">اعتذر</option>
                    </select>
                    <textarea name="notes" rows={2} defaultValue={lead.intro_notes ?? ""} placeholder="ملاحظات الجلسة التعريفية" className="rounded border border-brand-200 px-2 py-1 text-sm" />
                    <SubmitButton pendingText="…" className="self-start rounded-lg border border-brand-200 px-3 py-1.5 text-sm hover:bg-brand-50 disabled:opacity-60">
                      {lead.intro_done_at ? "حدّث التقرير" : "احفظ التقرير"}
                    </SubmitButton>
                  </form>
                </div>

                {lead.status === "converted" ? (
                  <p className="mt-3 border-t border-brand-100 pt-3 text-sm font-medium text-emerald-700">
                    تمّ تجهيز حسابات وليّ الأمر والطالب ✓
                  </p>
                ) : (
                  <div className="mt-3 border-t border-brand-100 pt-3">
                    <ProvisionPanel leadId={lead.id} guardianPhone={lead.guardian_phone} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
