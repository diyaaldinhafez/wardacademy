"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateMyBio } from "@/app/studio/actions";

const ctl = "ward-field__control";

/** Teacher self-edit of her bio (the one field she owns). Inline ok/error via useActionState. */
export default function ProfileBioForm({ initialBio }: { initialBio: string }) {
  const t = useTranslations("studio.profile");
  const [state, action, pending] = useActionState(updateMyBio, undefined);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{t("bioLabel")}</label>
      <textarea name="bio" rows={5} defaultValue={initialBio} className={ctl} placeholder={t("bioPlaceholder")} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" disabled={pending} className="ward-btn ward-btn--primary ward-btn--md">
          {pending ? t("saving") : t("save")}
        </button>
        {state?.ok && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--leaf-700)" }}>{t("saved")}</span>}
        {state?.error && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--rose-700)" }}>{state.error}</span>}
      </div>
    </form>
  );
}
