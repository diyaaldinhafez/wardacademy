"use client";

import { useLang } from "./LanguageProvider";

/**
 * Language switcher (AR / EN). Shared across the landing page and every
 * sub-page header so the visitor can switch language anywhere.
 */
export default function LangToggle() {
  const { lang, setLang } = useLang();
  const btn = (active: boolean) =>
    `rounded-full px-3 py-[5px] text-xs font-bold transition-colors ${
      active ? "bg-white text-brand-600 shadow-ward-1" : "text-ink-muted"
    }`;
  return (
    <div
      className="flex gap-0.5 rounded-full bg-[var(--color-ink-100,#F1EFF7)] p-[3px]"
      role="group"
      aria-label="language"
    >
      <button type="button" onClick={() => setLang("ar")} className={btn(lang === "ar")} aria-pressed={lang === "ar"}>
        عربي
      </button>
      <button type="button" onClick={() => setLang("en")} className={btn(lang === "en")} aria-pressed={lang === "en"}>
        EN
      </button>
    </div>
  );
}
