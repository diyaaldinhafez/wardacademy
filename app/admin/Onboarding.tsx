import { createClient } from "@/lib/supabase/server";
import { generateLeadTestAction, approveLeadTestAction, removeSlot } from "./actions";
import SubmitButton from "@/components/studio/SubmitButton";
import SlotForm from "@/components/studio/SlotForm";
import ProvisionPanel from "@/components/studio/ProvisionPanel";
import { fmtUTC } from "@/lib/datetime";

const SITE_URL = "https://ward.academy";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Onboarding() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, guardian_name, guardian_email, guardian_phone, student_name, student_grade, student_level, student_notes, status, created_at")
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
  const openSlots = (slots ?? []).filter((s: any) => s.status === "open");

  return (
    <>
      {/* Availability */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">المواعيد المتاحة (جلسات تعريفية)</h2>
        <div className="mb-3 rounded-xl border border-brand-100 bg-white p-4">
          <SlotForm />
          <p className="mt-2 text-xs text-ink-soft">يُدخَل بتوقيتك المحلّي ويُخزَّن UTC. المواعيد المفتوحة تظهر في صفحة الحجز العامّة.</p>
        </div>
        {openSlots.length === 0 ? (
          <p className="text-sm text-ink-soft">لا مواعيد مفتوحة — أضِف موعداً أعلاه.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {openSlots.map((s: any) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-sm">
                <span>{fmtUTC(s.starts_at)}</span>
                <form action={removeSlot}>
                  <input type="hidden" name="slotId" value={s.id} />
                  <SubmitButton className="text-xs font-medium text-rose-600 hover:underline">إزالة</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                      <span className="text-sm text-ink-soft">· {lead.student_grade ?? "—"} · {lead.student_level ?? "—"}</span>
                    </p>
                    <p className="text-sm text-ink-soft">
                      وليّ الأمر: {lead.guardian_name} · {lead.guardian_email}
                      {lead.guardian_phone ? ` · ${lead.guardian_phone}` : ""}
                    </p>
                    {lead.student_notes && <p className="mt-1 text-sm text-ink-soft">ملاحظات: {lead.student_notes}</p>}
                    <p className="mt-1 text-xs text-ink-soft">الموعد: {booked ? fmtUTC(booked.starts_at) : "لم يُحجز بعد"}</p>
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
