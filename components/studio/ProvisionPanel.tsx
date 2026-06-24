"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { provisionAccounts } from "@/app/admin/actions";

export default function ProvisionPanel({ leadId, guardianPhone }: { leadId: string; guardianPhone?: string | null }) {
  const t = useTranslations("admin.provision");
  const [state, action, pending] = useActionState(provisionAccounts, undefined);

  if (state?.guardian && state?.student) {
    const phone = (guardianPhone ?? "").replace(/[^0-9]/g, "");
    // PARENT-FACING invite text is built server-side in the guardian's language
    // (provisionAccounts → state.inviteMessage); this client just links to it.
    const msg = state.inviteMessage ?? "";
    const wa = phone && msg ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : "";
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
        <p className="mb-2 font-semibold text-emerald-800">{t("provisioned")}</p>
        <div className="space-y-2 text-ink">
          <div>
            <p className="text-xs font-medium">👤 {t("guardianLabel")} · {state.guardian.email}</p>
            <p className="break-all rounded bg-white p-1.5 text-xs" dir="ltr">{state.guardian.link}</p>
          </div>
          <div>
            <p className="text-xs font-medium">🧒 {t("studentLabel")} · {state.student.email}</p>
            <p className="break-all rounded bg-white p-1.5 text-xs" dir="ltr">{state.student.link}</p>
          </div>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
            {t("sendInviteWa")}
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" disabled={pending} className="ward-btn ward-btn--success ward-btn--md">
        {pending ? t("provisioning") : t("provisionBtn")}
      </button>
      {state?.error && <p className="mt-2 text-sm font-semibold text-red-600">{state.error}</p>}
    </form>
  );
}
