"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { bookSlotByToken } from "@/app/enroll/actions";
import FlowerMark from "../FlowerMark";
import BudMark from "../BudMark";
import SlotPicker from "./SlotPicker";

type Slot = { id: string; starts_at: string; duration_minutes: number };

export default function BookFlow({ token, slots, studentName }: { token: string; slots: Slot[]; studentName: string }) {
  const t = useTranslations("enrollForm");
  const locale = useLocale();
  const [state, action, pending] = useActionState(bookSlotByToken, undefined);
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  if (state?.booked) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <FlowerMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {t("confirmTitle")} <BudMark size={26} />
        </h1>
        <div className="mt-4 rounded-3xl border border-brand-100 bg-white p-6 shadow-ward-1">
          <p className="text-ink">
            {t("confirmSlotLabel")} <span className="font-bold text-brand-700">{state.at ? fmt(state.at) : ""}</span>
          </p>
          <p className="mt-3 text-sm text-ink-soft">{t("bookConfirmBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <FlowerMark className="h-12 w-12" />
        <h1 className="mt-3 text-2xl font-bold text-ink">{t("bookForName", { name: studentName })}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("bookSub")}</p>
      </div>
      <form action={action} className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1">
        <input type="hidden" name="token" value={token} />
        <SlotPicker slots={slots} />
        {state?.error && <p className="mt-3 text-sm font-semibold text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending || slots.length === 0}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-leaf font-semibold text-white shadow-ward-1 transition-all hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
        >
          {pending ? t("booking") : t("bookConfirm")}
        </button>
      </form>
    </div>
  );
}
