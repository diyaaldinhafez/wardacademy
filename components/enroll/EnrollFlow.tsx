"use client";

import { useActionState } from "react";
import { submitLead, bookSlot } from "@/app/enroll/actions";
import FlowerMark from "../FlowerMark";

type Slot = { id: string; starts_at: string; duration_minutes: number };

const pill =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold transition-all active:scale-[0.97] disabled:opacity-60";
const greenBtn = `${pill} bg-leaf text-white shadow-ward-1 hover:brightness-95`;
const primaryBtn = `${pill} bg-brand text-white shadow-ward-1 hover:bg-brand-600`;
const field =
  "w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-brand-400";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink-soft";

const fmtSlot = (iso: string) =>
  new Date(iso).toLocaleString("ar", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <FlowerMark className="h-12 w-12" />
      <h1 className="mt-3 text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{sub}</p>
    </div>
  );
}

export default function EnrollFlow({ slots }: { slots: Slot[] }) {
  const [leadState, leadAction, leadPending] = useActionState(submitLead, undefined);
  const [bookState, bookAction, bookPending] = useActionState(bookSlot, undefined);
  const leadId = leadState?.leadId;

  // ---- Confirmation ----
  if (bookState?.booked) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <FlowerMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold text-ink">تمّ الحجز بنجاح 🌸</h1>
        <div className="mt-4 rounded-3xl border border-brand-100 bg-white p-6 shadow-ward-1">
          <p className="text-ink">
            موعد جلستك التعريفية: <span className="font-bold text-brand-700">{bookState.at ? fmtSlot(bookState.at) : ""}</span>
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            استلمنا طلبك. سيُجهّز المعلّم اختبار تحديد المستوى لطفلك ويُرسله إليك عبر واتساب قبل الجلسة، وبعد الجلسة يُنشئ حسابيكما ويُسلّمك بيانات الدخول.
          </p>
        </div>
      </div>
    );
  }

  // ---- Booking ----
  if (leadId) {
    return (
      <div className="mx-auto w-full max-w-md">
        <Header title="احجز جلسةً تعريفيةً مجانية" sub="اختر وقتاً يناسبك من أوقات المعلّم المتاحة." />
        <form action={bookAction} className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1">
          <input type="hidden" name="leadId" value={leadId} />
          {slots.length === 0 ? (
            <p className="text-sm text-ink-soft">
              لا توجد أوقاتٌ متاحةٌ حالياً — سيتواصل المعلّم معك لتحديد موعدٍ مناسب.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {slots.map((s, i) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
                >
                  <input type="radio" name="slotId" value={s.id} required defaultChecked={i === 0} className="h-4 w-4 accent-[#7F55D9]" />
                  <span className="text-ink">
                    {fmtSlot(s.starts_at)} · {s.duration_minutes} دقيقة
                  </span>
                </label>
              ))}
            </div>
          )}
          {bookState?.error && <p className="mt-3 text-sm font-semibold text-red-600">{bookState.error}</p>}
          <button type="submit" disabled={bookPending || slots.length === 0} className={`${greenBtn} mt-4 w-full`}>
            {bookPending ? "جارٍ الحجز…" : "تأكيد الحجز"}
          </button>
        </form>
      </div>
    );
  }

  // ---- Registration form (lead) ----
  return (
    <div className="mx-auto w-full max-w-md">
      <Header title="سجّل طفلك في أكاديمية وَرد" sub="املأ النموذج واحجز جلسةً تعريفيةً مجانية — لا حاجة لإنشاء حساب الآن." />
      <form action={leadAction} className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1">
        <p className="mb-3 text-sm font-semibold text-brand-700">بياناتك (وليّ الأمر)</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>اسمك الكامل</label>
            <input name="guardianName" required className={field} placeholder="مثال: سارة محمد" />
          </div>
          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input name="guardianEmail" type="email" required className={field} dir="ltr" placeholder="you@example.com" />
          </div>
          <div>
            <label className={labelCls}>رقم الواتساب</label>
            <input name="guardianPhone" type="tel" className={field} dir="ltr" placeholder="+9665…" />
          </div>
        </div>

        <p className="mb-3 mt-5 text-sm font-semibold text-brand-700">بيانات الطفل</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>اسم الطفل</label>
            <input name="studentName" required className={field} placeholder="مثال: يوسف" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>الصف</label>
              <input name="studentGrade" className={field} placeholder="مثال: الثالث" />
            </div>
            <div>
              <label className={labelCls}>مستوى الإنجليزية</label>
              <select name="studentLevel" defaultValue="" className={field}>
                <option value="" disabled>اختر…</option>
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسّط</option>
                <option value="advanced">متقدّم</option>
                <option value="unknown">لا أعرف</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>أهداف أو ملاحظات (اختياري)</label>
            <textarea name="studentNotes" rows={3} className={field} placeholder="مثال: يحتاج تقويةً في المحادثة والقراءة." />
          </div>
        </div>

        {/* honeypot */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        {leadState?.error && <p className="mt-3 text-sm font-semibold text-red-600">{leadState.error}</p>}

        <button type="submit" disabled={leadPending} className={`${primaryBtn} mt-5 w-full`}>
          {leadPending ? "جارٍ الإرسال…" : "إرسال ومتابعة الحجز"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        لديك حساب؟{" "}
        <a href="/studio/login" className="font-semibold text-brand hover:underline">
          سجّل الدخول
        </a>
      </p>
    </div>
  );
}
