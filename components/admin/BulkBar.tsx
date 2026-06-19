"use client";

/** Select-all + delete-selected controls for the registrations list (operates on
 * the checkboxes named "ids" inside the same form; submits bulkDeleteLeads). */
export default function BulkBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-body)", cursor: "pointer" }}>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#7F55D9]"
          onChange={(e) => {
            const form = e.currentTarget.closest("form");
            form?.querySelectorAll('input[name="ids"]').forEach((c) => ((c as HTMLInputElement).checked = e.currentTarget.checked));
          }}
        />
        تحديد الكلّ
      </label>
      <button
        type="submit"
        className="ward-btn ward-btn--danger ward-btn--sm"
        onClick={(e) => {
          if (!window.confirm("حذف الطلبات المحدّدة نهائياً وكلّ بياناتها؟ لا يمكن التراجع.")) e.preventDefault();
        }}
      >
        حذف المحدّد
      </button>
    </div>
  );
}
