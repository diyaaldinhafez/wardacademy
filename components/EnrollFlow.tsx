"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Icon, { type IconName } from "./Icon";
import PlacementTest from "./PlacementTest";
import ShareRow from "./ShareRow";
import { useT } from "./LanguageProvider";

/**
 * VISUAL ONLY multi-step enrolment prototype.
 * Register → (confirm) → Book a trial → (confirm) → Placement test.
 *
 * All state is ephemeral (in-memory, UI only). Nothing is sent, stored, graded,
 * or turned into an account. The "personalized AI test", the "shareable link"
 * (URL params, no storage) and the teacher dashboard (/teacher, sample data)
 * are believable simulations.
 *
 * TODO (foundation phase): real registration + timestamped parental consent +
 * booking against teacher availability (UTC) + an AI-generated, teacher-approved
 * placement test behind a signed, time-limited per-student link.
 */
type Phase = "register" | "registered" | "booking" | "booked" | "test";

export default function EnrollFlow({ goalKey }: { goalKey?: string }) {
  const tt = useT();
  const enroll = tt.enroll;
  // resolve the starter's goal key to the current language's goal option
  const initialGoal = goalKey
    ? tt.starter.options.find((o) => o.key === goalKey)?.goal
    : undefined;
  const [phase, setPhase] = useState<Phase>("register");
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [level, setLevel] = useState("");
  const [shareLater, setShareLater] = useState(false);

  const firstName = studentName.split(" ")[0] || "";

  function placementUrl() {
    const p = new URLSearchParams();
    if (firstName) p.set("name", firstName);
    if (level) p.set("level", level);
    const q = p.toString();
    return q ? `/placement?${q}` : "/placement";
  }

  function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // no network, no storage — visual only
    const fd = new FormData(e.currentTarget);
    setStudentName(String(fd.get("studentName") || "").trim());
    setLevel(String(fd.get("englishLevel") || "").trim());
    setPhase("registered");
  }

  const stepIndex =
    phase === "register" ? 0 : phase === "registered" || phase === "booking" ? 1 : 2;

  return (
    <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-xl shadow-brand/5 sm:p-9">
      <Stepper current={stepIndex} />

      {phase === "register" && (
        <RegisterStep onSubmit={handleRegister} initialGoal={initialGoal} />
      )}

      {phase === "registered" && (
        <Interstitial
          heading={enroll.registered.heading}
          body={enroll.registered.body}
          cta={enroll.registered.cta}
          onCta={() => setPhase("booking")}
        />
      )}

      {phase === "booking" && (
        <BookingStep
          day={day}
          time={time}
          setDay={setDay}
          setTime={setTime}
          onBack={() => setPhase("registered")}
          onNext={() => setPhase("booked")}
        />
      )}

      {phase === "booked" && (
        <BookedStep
          day={day}
          time={time}
          shareLater={shareLater}
          shareUrl={placementUrl()}
          onStart={() => setPhase("test")}
          onShareLater={() => setShareLater(true)}
        />
      )}

      {phase === "test" && (
        <PlacementTest name={firstName} shareUrl={placementUrl()} />
      )}
    </div>
  );
}

/* ---- Stepper -------------------------------------------------------- */

function Stepper({ current }: { current: number }) {
  const enroll = useT().enroll;
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
      {enroll.steps.map((label, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                done
                  ? "bg-brand text-white"
                  : isCurrent
                    ? "brand-gradient text-white"
                    : "bg-cream text-ink-faint"
              }`}
            >
              {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:inline ${isCurrent ? "text-ink" : "text-ink-muted"}`}>
              {label}
            </span>
            {i < enroll.steps.length - 1 && (
              <span className={`h-px w-5 sm:w-8 ${done ? "bg-brand" : "bg-ink/15"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---- Step 1: Register ----------------------------------------------- */

function RegisterStep({
  onSubmit,
  initialGoal,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  initialGoal?: string;
}) {
  const enroll = useT().enroll;
  const r = enroll.register;
  const f = r.fields;
  return (
    <form onSubmit={onSubmit} className="grid gap-8">
      {/* Guardian */}
      <section>
        <SectionTitle icon="user">{r.guardianSection}</SectionTitle>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field id="guardianName" f={f.guardianName} type="text" autoComplete="name" full required />
          <Field id="email" f={f.email} type="email" autoComplete="email" required />
          <Field id="phone" f={f.phone} type="tel" autoComplete="tel" required />
          <Select id="country" f={f.country} options={r.options.countries} />
          <Field id="city" f={f.city} type="text" />
          <Field id="nationality" f={f.nationality} type="text" full />
        </div>
      </section>

      {/* Student */}
      <section>
        <SectionTitle icon="graduation">{r.studentSection}</SectionTitle>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field id="studentName" f={f.studentName} type="text" full required />
          <Select id="gender" f={f.gender} options={r.options.genders} />
          <Select id="age" f={f.age} options={r.options.ages.map((a) => `${a} ${r.yearsWord}`)} required />
          <Select id="grade" f={f.grade} options={r.options.grades} />
          <Select id="schoolType" f={f.schoolType} options={r.options.schoolTypes} />
          <Select id="englishLevel" f={f.englishLevel} options={r.options.englishLevels} full required />
          <Select id="speaking" f={f.speaking} options={r.options.comfort} />
          <Select id="reading" f={f.reading} options={r.options.comfort} />
          <Select id="goal" f={f.goal} options={r.options.goals} defaultValue={initialGoal} full required />
          <TextArea id="notes" f={f.notes} full />
        </div>
      </section>

      <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-cream/60 p-4 transition-colors hover:border-brand/30">
        <input id="consent" type="checkbox" name="consent" required aria-required="true" className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-ink/30 text-brand accent-brand focus:ring-2 focus:ring-brand/40" />
        <span className="text-sm leading-relaxed text-ink-soft">
          {r.consentLabel} <span className="text-coral-600" aria-hidden>*</span>
        </span>
      </label>

      <div>
        <button type="submit" className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]">
          {r.submit}
          <Icon name="arrow-right" className="rtl-flip h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-xs font-medium text-ink-muted">{r.reassurance}</p>
      </div>
    </form>
  );
}

/* ---- Interstitial confirmation -------------------------------------- */

function Interstitial({
  heading,
  body,
  cta,
  onCta,
}: {
  heading: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand">
        <Icon name="check" className="h-8 w-8" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-bold text-ink">{heading}</h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">{body}</p>
      <button type="button" onClick={onCta} className="brand-gradient mt-7 inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]">
        {cta}
        <Icon name="arrow-right" className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ---- Step 2: Booking ------------------------------------------------ */

function BookingStep({
  day,
  time,
  setDay,
  setTime,
  onBack,
  onNext,
}: {
  day: string | null;
  time: string | null;
  setDay: (d: string) => void;
  setTime: (t: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const enroll = useT().enroll;
  const b = enroll.booking;
  const ready = Boolean(day && time);
  return (
    <div className="grid gap-6">
      <StepHeader heading={b.heading} sub={b.subheading} />

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">{b.dayLabel}</p>
        <div className="flex flex-wrap gap-2">
          {b.days.map((d) => {
            const value = `${d.day} ${d.date}`;
            const selected = day === value;
            return (
              <button key={d.date} type="button" onClick={() => setDay(value)}
                className={`flex min-w-[4.5rem] flex-col items-center rounded-2xl border px-4 py-3 text-sm transition-all ${selected ? "brand-gradient border-transparent text-white shadow-md" : "border-ink/15 bg-white text-ink hover:border-brand/40"}`}>
                <span className="font-semibold">{d.day}</span>
                <span className={selected ? "text-white/85" : "text-ink-muted"}>{d.date}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">{b.timeLabel}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {b.times.map((tm) => {
            const selected = time === tm;
            return (
              <button key={tm} type="button" onClick={() => setTime(tm)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${selected ? "brand-gradient border-transparent text-white shadow-md" : "border-ink/15 bg-white text-ink hover:border-brand/40"}`}>
                {tm}
              </button>
            );
          })}
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!ready} nextLabel={b.submit} hint={!ready ? b.hint : undefined} />
    </div>
  );
}

/* ---- Step 3a: Booked confirmation + start/share --------------------- */

function BookedStep({
  day,
  time,
  shareLater,
  shareUrl,
  onStart,
  onShareLater,
}: {
  day: string | null;
  time: string | null;
  shareLater: boolean;
  shareUrl: string;
  onStart: () => void;
  onShareLater: () => void;
}) {
  const enroll = useT().enroll;
  const b = enroll.booked;
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand">
        <Icon name="check" className="h-8 w-8" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-bold text-ink">{b.heading}</h3>

      {day && time && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink">
          <Icon name="clock" className="h-4 w-4 text-brand" />
          {day} · {time}
        </div>
      )}

      <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">{b.body}</p>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber/30 bg-amber-100/60 p-4 text-start">
        <Icon name="user" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm leading-relaxed text-ink-soft">{b.studentNote}</p>
      </div>

      {!shareLater ? (
        <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onStart} className="brand-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]">
            {b.startNow}
            <Icon name="arrow-right" className="rtl-flip h-5 w-5" />
          </button>
          <button type="button" onClick={onShareLater} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:border-brand/30 hover:text-brand">
            <Icon name="link" className="h-5 w-5" />
            {b.later}
          </button>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-md rounded-2xl border border-ink/10 bg-cream/60 p-4">
          <p className="mb-3 text-sm font-medium text-ink-soft">{enroll.share.linkMessage}</p>
          <ShareRow url={shareUrl} message={enroll.share.linkMessage} labels={enroll.share} />
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {b.validity}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- Shared bits ---------------------------------------------------- */

function SectionTitle({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-ink/8 pb-3">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-100 text-brand">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <h3 className="font-display text-base font-bold text-ink">{children}</h3>
    </div>
  );
}

function StepHeader({ heading, sub }: { heading: string; sub: string }) {
  return (
    <div>
      <h3 className="font-display text-xl font-bold text-ink">{heading}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{sub}</p>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
  hint,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel: string;
  hint?: string;
}) {
  const enroll = useT().enroll;
  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/30 hover:text-brand">
          {enroll.back}
        </button>
        <button type="button" onClick={onNext} disabled={nextDisabled} className="brand-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
          {nextLabel}
          <Icon name="arrow-right" className="rtl-flip h-5 w-5" />
        </button>
      </div>
      {hint && <p className="mt-3 text-center text-xs font-medium text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ---- Field primitives ----------------------------------------------- */

type FieldCopy = { label: string; placeholder: string };

function Field({
  id,
  f,
  type,
  autoComplete,
  full,
  required,
}: {
  id: string;
  f: FieldCopy;
  type: string;
  autoComplete?: string;
  full?: boolean;
  required?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {f.label}
        {required && <span className="text-coral-600" aria-hidden> *</span>}
      </label>
      <input id={id} name={id} type={type} placeholder={f.placeholder} autoComplete={autoComplete} required={required} aria-required={required} className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
    </div>
  );
}

function TextArea({ id, f, full }: { id: string; f: FieldCopy; full?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">{f.label}</label>
      <textarea id={id} name={id} rows={2} placeholder={f.placeholder} className="w-full resize-none rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
    </div>
  );
}

function Select({
  id,
  f,
  options,
  full,
  defaultValue = "",
  required,
}: {
  id: string;
  f: FieldCopy;
  options: readonly string[];
  full?: boolean;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {f.label}
        {required && <span className="text-coral-600" aria-hidden> *</span>}
      </label>
      <div className="relative">
        <select id={id} name={id} defaultValue={defaultValue} required={required} aria-required={required} className="w-full appearance-none rounded-2xl border border-ink/15 bg-white px-4 py-3 pe-10 text-base text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30">
          <option value="" disabled>{f.placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
