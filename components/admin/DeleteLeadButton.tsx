"use client";

import { deleteLead } from "@/app/admin/actions";

export default function DeleteLeadButton({ leadId, studentName }: { leadId: string; studentName: string }) {
  return (
    <form
      action={deleteLead}
      onSubmit={(e) => {
        if (!window.confirm(`حذف طلب «${studentName}» نهائياً وكلّ بياناته؟ لا يمكن التراجع.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" className="ward-btn ward-btn--danger ward-btn--md">حذف الطلب نهائياً</button>
    </form>
  );
}
