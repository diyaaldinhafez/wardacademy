"use client";

import FlowerMark from "@/components/FlowerMark";
import { useTranslations } from "next-intl";
import { logout } from "@/app/studio/actions";

// Shared across surfaces. Locale comes from the surrounding NextIntlClientProvider
// (forced "en" on the child + studio surfaces; locale-driven on guardian).
// rightSlot lets a parent surface drop in the EN/ع switcher beside the logout.
export default function WorkspaceHeader({ title, subtitle, rightSlot }: { title: string; subtitle?: string; rightSlot?: React.ReactNode }) {
  const t = useTranslations("common.actions");
  return (
    <header className="mb-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <FlowerMark className="h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p dir="auto" className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        <form action={logout}>
          <button className="rounded-full border border-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50">
            {t("logout")}
          </button>
        </form>
      </div>
    </header>
  );
}
