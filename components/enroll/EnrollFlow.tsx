"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitLead, bookSlot } from "@/app/enroll/actions";
import FlowerMark from "../FlowerMark";
import BudMark from "../BudMark";
import SlotPicker from "./SlotPicker";
import {
  AGES,
  COUNTRIES_ALL,
  COUNTRIES_EN,
  NATIONALITIES_ALL,
  NATIONALITIES_EN,
  HOME_LANGUAGES,
  HOME_LANGUAGES_EN,
  SCHOOL_TYPES,
  GOALS,
  LEVELS,
  SKILL_RATINGS,
  PRIOR_STUDY,
  ENGLISH_USE,
  RELATIONS,
  REFERRALS,
  ENROLL_SKILLS,
  labelOfEn,
  type Opt,
} from "@/lib/enrollOptions";

type Slot = { id: string; starts_at: string; duration_minutes: number };
type LabelGroup = "schoolType" | "goal" | "level" | "rating" | "priorStudy" | "englishUse" | "relation" | "referral";

const pill =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold transition-all active:scale-[0.97] disabled:opacity-60";
const greenBtn = `${pill} bg-leaf text-white shadow-ward-1 hover:brightness-95`;
const primaryBtn = `${pill} bg-brand text-white shadow-ward-1 hover:bg-brand-600`;
const ghostBtn = `${pill} border border-brand-200 text-brand-700 hover:bg-brand-50`;
const field =
  "w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-brand-400";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink-soft";

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <FlowerMark className="h-12 w-12" />
      <h1 className="mt-3 text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{sub}</p>
    </div>
  );
}

function Steps({ current, labels }: { current: 1 | 2 | 3; labels: string[] }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-brand text-white" : done ? "bg-leaf text-white" : "bg-brand-50 text-ink-soft"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className={`text-sm font-semibold ${active ? "text-brand-700" : "text-ink-soft"}`}>{label}</span>
            {n < 3 && <span className="mx-1 h-px w-5 bg-brand-100" />}
          </div>
        );
      })}
    </div>
  );
}

function RadioPills({ name, options, required, size = "md" }: { name: string; options: Opt[]; required?: boolean; size?: "md" | "sm" }) {
  const cls =
    size === "sm"
      ? "cursor-pointer rounded-lg border border-brand-100 bg-white px-2.5 py-1 text-xs text-ink has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
      : "cursor-pointer rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className={cls}>
          <input type="radio" name={name} value={o.value} required={required} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function CheckPills({ name, options }: { name: string; options: Opt[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="cursor-pointer rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
        >
          <input type="checkbox" name={name} value={o.value} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export default function EnrollFlow({ slots }: { slots: Slot[] }) {
  const t = useTranslations("enrollForm");
  const tSkill = useTranslations("common.skills");
  const locale = useLocale();
  const [leadState, leadAction, leadPending] = useActionState(submitLead, undefined);
  const [bookState, bookAction, bookPending] = useActionState(bookSlot, undefined);
  const [step, setStep] = useState<1 | 2>(1);
  const leadId = leadState?.leadId;
  const current: 1 | 2 | 3 = bookState?.booked ? 3 : leadId ? 3 : step;
  const steps = t.raw("steps") as string[];

  const fmtSlot = (iso: string) =>
    new Date(iso).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  // Option labels follow the active locale (UI labels, not authored content).
  const optLabel = (group: LabelGroup, o: Opt) => (locale === "ar" ? o.label : labelOfEn(group, o.value));
  const resolve = (group: LabelGroup, arr: Opt[]): Opt[] => arr.map((o) => ({ value: o.value, label: optLabel(group, o) }));
  const homeLangOpts: Opt[] = HOME_LANGUAGES.map((v) => ({ value: v, label: locale === "ar" ? v : HOME_LANGUAGES_EN[v] ?? v }));
  const countries = locale === "ar" ? COUNTRIES_ALL : COUNTRIES_EN;
  const nationalities = locale === "ar" ? NATIONALITIES_ALL : NATIONALITIES_EN;

  // ---- Confirmation ----
  if (bookState?.booked) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <FlowerMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {t("confirmTitle")} <BudMark size={26} />
        </h1>
        <div className="mt-4 rounded-3xl border border-brand-100 bg-white p-6 shadow-ward-1">
          <p className="text-ink">
            {t("confirmSlotLabel")} <span className="font-bold text-brand-700">{bookState.at ? fmtSlot(bookState.at) : ""}</span>
          </p>
          <p className="mt-3 text-sm text-ink-soft">{t("confirmBody")}</p>
        </div>
      </div>
    );
  }

  // ---- Step 3: Booking ----
  if (leadId) {
    return (
      <div className="mx-auto w-full max-w-md">
        <Steps current={3} labels={steps} />
        <Header title={t("bookTitle")} sub={t("bookSub")} />
        <form action={bookAction} className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1">
          <input type="hidden" name="leadId" value={leadId} />
          <SlotPicker slots={slots} />
          {bookState?.error && <p className="mt-3 text-sm font-semibold text-red-600">{bookState.error}</p>}
          <button type="submit" disabled={bookPending || slots.length === 0} className={`${greenBtn} mt-4 w-full`}>
            {bookPending ? t("booking") : t("bookConfirm")}
          </button>
        </form>
      </div>
    );
  }

  // ---- Steps 1–2: Registration (student → guardian) ----
  // Only step-1 fields are `required` right now, so validating the whole form
  // validates exactly the student step before advancing.
  function goNext(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (form && !form.reportValidity()) return;
    setStep(2);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Steps current={current} labels={steps} />
      <Header title={t("regTitle")} sub={t("regSub")} />
      <form
        action={leadAction}
        onKeyDown={(e) => {
          if (step === 1 && e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") e.preventDefault();
        }}
        className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1"
      >
        {/* Step 1 — Student */}
        <div className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
          <p className="text-sm font-semibold text-brand-700">{t("studentHeading")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("fullName")}</label>
              <input name="studentName" required={step === 1} className={field} placeholder={t("studentNamePh")} />
            </div>
            <div>
              <label className={labelCls}>{t("age")}</label>
              <select name="studentAge" defaultValue="" required={step === 1} className={field}>
                <option value="" disabled>{t("choose")}</option>
                {AGES.map((a) => (
                  <option key={a} value={a}>{t("ageOption", { n: a })}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("schoolType")}</label>
            <RadioPills name="schoolType" options={resolve("schoolType", SCHOOL_TYPES)} required={step === 1} />
          </div>
          <div>
            <label className={labelCls}>{t("homeLang")}</label>
            <CheckPills name="homeLanguage" options={homeLangOpts} />
          </div>
          <div>
            <label className={labelCls}>{t("englishUse")}</label>
            <RadioPills name="englishUse" options={resolve("englishUse", ENGLISH_USE)} required={step === 1} />
          </div>
          <div>
            <label className={labelCls}>{t("goal")}</label>
            <RadioPills name="learningGoal" options={resolve("goal", GOALS)} required={step === 1} />
          </div>
          <div>
            <label className={labelCls}>{t("level")}</label>
            <RadioPills name="studentLevel" options={resolve("level", LEVELS)} required={step === 1} />
          </div>
          <div>
            <label className={labelCls}>{t("rateSkills")}</label>
            <div className="flex flex-col gap-2 rounded-2xl border border-brand-100 bg-white/60 p-3">
              {ENROLL_SKILLS.map((sk) => (
                <div key={sk} className="flex items-center justify-between gap-2">
                  <span className="w-14 shrink-0 text-sm text-ink-soft">{tSkill(sk)}</span>
                  <RadioPills name={`skill_${sk}`} options={resolve("rating", SKILL_RATINGS)} required={step === 1} size="sm" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("priorStudy")}</label>
            <RadioPills name="priorStudy" options={resolve("priorStudy", PRIOR_STUDY)} />
          </div>
          <div>
            <label className={labelCls}>{t("notes")}</label>
            <textarea name="studentNotes" rows={2} className={field} placeholder={t("notesPh")} />
          </div>
          <button type="button" onClick={goNext} className={`${primaryBtn} mt-2 w-full`}>
            {t("next")}
          </button>
        </div>

        {/* Step 2 — Guardian */}
        <div className={step === 2 ? "flex flex-col gap-3" : "hidden"}>
          <p className="text-sm font-semibold text-brand-700">{t("guardianHeading")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("fullName")}</label>
              <input name="guardianName" required={step === 2} className={field} placeholder={t("guardianNamePh")} />
            </div>
            <div>
              <label className={labelCls}>{t("relation")}</label>
              <select name="guardianRelation" defaultValue="" className={field}>
                <option value="" disabled>{t("choose")}</option>
                {RELATIONS.map((r) => (
                  <option key={r.value} value={r.value}>{optLabel("relation", r)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("email")}</label>
            <input name="guardianEmail" type="email" required={step === 2} className={field} dir="ltr" placeholder="you@example.com" />
          </div>
          <div>
            <label className={labelCls}>{t("whatsapp")}</label>
            <input name="guardianPhone" type="tel" className={field} dir="ltr" placeholder="+9665…" />
          </div>
          {/* PA-4: the "preferred comms language" dropdown was removed — all parent comms are
              Arabic-only, so guardian_locale is captured as "ar" server-side (the column stays). */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("country")}</label>
              <input name="guardianCountry" list="countries-list" required={step === 2} className={field} placeholder={t("typeToSearch")} />
            </div>
            <div>
              <label className={labelCls}>{t("nationality")}</label>
              <input name="guardianNationality" list="nationalities-list" className={field} placeholder={t("typeToSearch")} />
            </div>
          </div>
          <datalist id="countries-list">
            {countries.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <datalist id="nationalities-list">
            {nationalities.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <div>
            <label className={labelCls}>{t("referral")}</label>
            <select name="referralSource" defaultValue="" className={field}>
              <option value="" disabled>{t("choose")}</option>
              {REFERRALS.map((r) => (
                <option key={r.value} value={r.value}>{optLabel("referral", r)}</option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-brand-100 bg-white p-3 text-sm text-ink has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
            <input type="checkbox" name="consent" value="1" required={step === 2} className="mt-0.5 h-4 w-4 accent-[#7F55D9]" />
            <span>{t("consent")}</span>
          </label>

          {leadState?.error && <p className="text-sm font-semibold text-red-600">{leadState.error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className={`${ghostBtn} flex-1`}>
              {t("back")}
            </button>
            <button type="submit" disabled={leadPending} className={`${primaryBtn} flex-[2]`}>
              {leadPending ? t("submitting") : t("continueBooking")}
            </button>
          </div>
        </div>

        {/* honeypot */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {t("haveAccount")}{" "}
        <a href="/studio/login" className="font-semibold text-brand hover:underline">
          {t("login")}
        </a>
      </p>
    </div>
  );
}
