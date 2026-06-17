"use client";

import { useActionState, useState } from "react";
import { enroll } from "@/app/enroll/actions";
import FlowerMark from "../FlowerMark";

const pill =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold transition-all active:scale-[0.97] disabled:opacity-60";
const primaryBtn = `${pill} bg-brand text-white shadow-ward-1 hover:bg-brand-600`;
const greenBtn = `${pill} bg-leaf text-white shadow-ward-1 hover:brightness-95`;
const softBtn = `${pill} bg-brand-100 text-brand-700 hover:bg-brand-200`;
const field =
  "w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-brand-400";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink-soft";

const STEPS = ["وليّ الأمر", "الطفل", "الجلسة التجريبية"];

export default function EnrollFlow() {
  const [state, action, pending] = useActionState(enroll, undefined);
  const [step, setStep] = useState(0);
  const [trialLocal, setTrialLocal] = useState("");
  const trialUtc = trialLocal ? new Date(trialLocal).toISOString() : "";

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <FlowerMark className="h-12 w-12" />
        <h1 className="mt-3 text-2xl font-bold text-ink">أنشئ حساب طفلك</h1>
        <p className="mt-1 text-sm text-ink-soft">سجّل، احجز جلسةً تجريبية مجانية، وابدأ رحلة طفلك.</p>
      </div>

      {/* step indicator */}
      <div className="mb-5 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                i <= step ? "bg-brand text-white" : "bg-brand-100 text-brand-400"
              }`}
            >
              {i + 1}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-brand-100" />}
          </div>
        ))}
      </div>

      <form
        action={action}
        onKeyDown={(e) => {
          // Enter advances steps instead of submitting early
          if (e.key === "Enter" && step < 2) {
            e.preventDefault();
            setStep((s) => Math.min(2, s + 1));
          }
        }}
        className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1"
      >
        {/* Step 1 — guardian */}
        <div className={step === 0 ? "flex flex-col gap-4" : "hidden"}>
          <p className="text-sm font-semibold text-brand-700">بياناتك (وليّ الأمر)</p>
          <div>
            <label className={labelCls}>اسمك الكامل</label>
            <input name="gName" className={field} placeholder="مثال: سارة محمد" />
          </div>
          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input name="gEmail" type="email" autoComplete="email" className={field} placeholder="you@example.com" dir="ltr" />
          </div>
          <div>
            <label className={labelCls}>كلمة المرور (8 أحرف فأكثر)</label>
            <input name="gPassword" type="password" autoComplete="new-password" className={field} dir="ltr" />
          </div>
          <button type="button" className={`${primaryBtn} mt-1`} onClick={() => setStep(1)}>
            التالي
          </button>
        </div>

        {/* Step 2 — child + consent */}
        <div className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
          <p className="text-sm font-semibold text-brand-700">بيانات طفلك</p>
          <div>
            <label className={labelCls}>اسم الطفل</label>
            <input name="cName" className={field} placeholder="مثال: يوسف" />
          </div>
          <div>
            <label className={labelCls}>كلمة مرور دخول الطفل (6 أحرف فأكثر)</label>
            <input name="cPassword" type="text" className={field} dir="ltr" />
            <p className="mt-1 text-xs text-ink-soft">يُنشأ لطفلك دخولٌ بسيطٌ خاصٌّ به (بريده يظهر لك في لوحتك).</p>
          </div>
          <label className="flex items-start gap-2 rounded-2xl bg-brand-50 p-3 text-sm text-ink">
            <input name="consent" type="checkbox" className="mt-1 h-4 w-4 accent-[#7F55D9]" />
            <span>أوافق على إنشاء حسابٍ لطفلي ومشاركة تقدّمه التعليميّ معي ومع معلّمه.</span>
          </label>
          <div className="mt-1 flex gap-2">
            <button type="button" className={softBtn} onClick={() => setStep(0)}>
              السابق
            </button>
            <button type="button" className={`${primaryBtn} flex-1`} onClick={() => setStep(2)}>
              التالي
            </button>
          </div>
        </div>

        {/* Step 3 — book trial */}
        <div className={step === 2 ? "flex flex-col gap-4" : "hidden"}>
          <p className="text-sm font-semibold text-brand-700">احجز الجلسة التجريبية المجانية</p>
          <div>
            <label className={labelCls}>اختر وقتاً يناسبك</label>
            <input
              type="datetime-local"
              value={trialLocal}
              onChange={(e) => setTrialLocal(e.target.value)}
              className={field}
              dir="ltr"
            />
            <input type="hidden" name="trialAt" value={trialUtc} />
            <p className="mt-1 text-xs text-ink-soft">اختياريّ — يمكنك تحديد الوقت لاحقاً مع المعلّم. اختبار تحديد المستوى يكون بعد الجلسة.</p>
          </div>

          {/* honeypot */}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          {state?.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}

          <div className="mt-1 flex gap-2">
            <button type="button" className={softBtn} onClick={() => setStep(1)}>
              السابق
            </button>
            <button type="submit" disabled={pending} className={`${greenBtn} flex-1`}>
              {pending ? "جارٍ الإنشاء…" : "أنشئ الحساب وابدأ"}
            </button>
          </div>
        </div>
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
