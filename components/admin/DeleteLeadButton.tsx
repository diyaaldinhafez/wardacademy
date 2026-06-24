"use client";

import { useTranslations } from "next-intl";
import { deleteLead } from "@/app/admin/actions";

export default function DeleteLeadButton({ leadId, studentName }: { leadId: string; studentName: string }) {
  const t = useTranslations("admin.deleteLead");
  return (
    <form
      action={deleteLead}
      onSubmit={(e) => {
        if (!window.confirm(t("confirm", { name: studentName }))) e.preventDefault();
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" className="ward-btn ward-btn--danger ward-btn--md">{t("button")}</button>
    </form>
  );
}
