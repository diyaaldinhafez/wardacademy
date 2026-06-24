"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

/**
 * The next-intl language switcher (EN / ع). Sets the LOCALE cookie and refreshes
 * so Server Components re-render in the new locale. Shown ONLY on parent-facing
 * surfaces (landing · enroll · guardian · reports) — never on the child surface.
 */
export default function LocaleSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("common.language");
  const [pending, startTransition] = useTransition();

  const set = (next: string) => {
    document.cookie = `LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => router.refresh());
  };

  const btn = (active: boolean) =>
    `rounded-full px-3 py-[5px] text-xs font-bold transition-colors ${
      active ? "bg-white text-brand-600 shadow-ward-1" : "text-ink-muted"
    }`;

  return (
    <div className="inline-flex gap-0.5 rounded-full bg-[var(--color-ink-100,#F1EFF7)] p-[3px]" role="group" aria-label={t("label")}>
      <button type="button" onClick={() => set("ar")} className={btn(locale === "ar")} aria-pressed={locale === "ar"} disabled={pending}>
        {t("arabic")}
      </button>
      <button type="button" onClick={() => set("en")} className={btn(locale === "en")} aria-pressed={locale === "en"} disabled={pending}>
        {t("english")}
      </button>
    </div>
  );
}
