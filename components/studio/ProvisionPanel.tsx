"use client";

import { useActionState } from "react";
import { provisionAccounts } from "@/app/admin/actions";

export default function ProvisionPanel({ leadId, guardianPhone }: { leadId: string; guardianPhone?: string | null }) {
  const [state, action, pending] = useActionState(provisionAccounts, undefined);

  if (state?.guardian && state?.student) {
    const phone = (guardianPhone ?? "").replace(/[^0-9]/g, "");
    const msg =
      `بيانات الدخول إلى أكاديمية وَرد:\n\n` +
      `وليّ الأمر:\nالبريد: ${state.guardian.email}\nكلمة المرور: ${state.guardian.password}\n\n` +
      `الطالب:\nالبريد: ${state.student.email}\nكلمة المرور: ${state.student.password}\n\n` +
      `الدخول: https://ward.academy/studio/login`;
    const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : "";
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
        <p className="mb-2 font-semibold text-emerald-800">تمّ تجهيز الحسابات — احفظ البيانات الآن (لن تظهر ثانيةً):</p>
        <div className="space-y-1 text-ink" dir="ltr">
          <p>👤 {state.guardian.email} · {state.guardian.password}</p>
          <p>🧒 {state.student.email} · {state.student.password}</p>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
            أرسل البيانات عبر واتساب
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium hover:bg-brand-50 disabled:opacity-60"
      >
        {pending ? "جارٍ التجهيز…" : "جهّز حسابات وليّ الأمر والطالب"}
      </button>
      {state?.error && <p className="mt-2 text-sm font-semibold text-red-600">{state.error}</p>}
    </form>
  );
}
