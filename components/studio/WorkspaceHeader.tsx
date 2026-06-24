"use client";

import FlowerMark from "@/components/FlowerMark";
import { useTranslations } from "next-intl";
import { logout } from "@/app/studio/actions";

// Shared across surfaces. Locale comes from the surrounding NextIntlClientProvider
// (forced "en" on the child + studio surfaces; locale-driven on guardian).
export default function WorkspaceHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useTranslations("common.actions");
  return (
    <header className="mb-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <FlowerMark className="h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      <form action={logout}>
        <button className="rounded-full border border-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50">
          {t("logout")}
        </button>
      </form>
    </header>
  );
}
