"use client";

import { useState, type FormEvent } from "react";
import { enroll, signup } from "@/lib/content";
import Icon from "./Icon";
import Spark from "./Spark";

/**
 * VISUAL ONLY multi-step enrolment prototype.
 * Register → Book a trial → Quick check → Done.
 *
 * All state is ephemeral (in-memory, for the UI only). Nothing is sent,
 * stored, graded, or turned into an account.
 *
 * TODO (foundation phase): real registration + parental consent capture
 * (timestamped) + booking against teacher availability (UTC) + an
 * AI-generated, teacher-approved placement test.
 */
export default function EnrollFlow() {
  const [step, setStep] = useState(0); // 0 register · 1 book · 2 quiz · 3 done

  // ephemeral selections, kept only to show a friendly summary at the end
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    enroll.quiz.questions.map(() => null),
  );

  function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // no network, no storage — visual only
    setStep(1);
  }

  return (
    <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-xl shadow-brand/5 sm:p-9">
      {step < 3 && <Stepper step={step} />}

      {step === 0 && <RegisterStep onSubmit={handleRegister} />}

      {step === 1 && (
        <BookingStep
          day={day}
          time={time}
          setDay={setDay}
          setTime={setTime}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <QuizStep
          qIndex={qIndex}
          answers={answers}
          onAnswer={(optIdx) => {
            setAnswers((a) => a.map((v, i) => (i === qIndex ? optIdx : v)));
          }}
          onBack={() => (qIndex === 0 ? setStep(1) : setQIndex((i) => i - 1))}
          onNext={() => {
            if (qIndex < enroll.quiz.questions.length - 1) setQIndex((i) => i + 1);
            else setStep(3);
          }}
        />
      )}

      {step === 3 && <DoneStep day={day} time={time} />}
    </div>
  );
}

/* ---- Stepper -------------------------------------------------------- */

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
      {enroll.steps.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                done
                  ? "bg-brand text-white"
                  : current
                    ? "brand-gradient text-white"
                    : "bg-cream text-ink-faint"
              }`}
            >
              {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={`hidden text-sm font-semibold sm:inline ${
                current ? "text-ink" : "text-ink-muted"
              }`}
            >
              {label}
            </span>
            {i < enroll.steps.length - 1 && (
              <span
                className={`h-px w-5 sm:w-8 ${done ? "bg-brand" : "bg-ink/15"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---- Step 1: Register ----------------------------------------------- */

function RegisterStep({ onSubmit }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="guardianName" label={signup.fields.guardianName.label} placeholder={signup.fields.guardianName.placeholder} type="text" autoComplete="name" />
        <Field id="email" label={signup.fields.email.label} placeholder={signup.fields.email.placeholder} type="email" autoComplete="email" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="studentName" label={signup.fields.studentName.label} placeholder={signup.fields.studentName.placeholder} type="text" />
        <SelectField id="studentAge" label={signup.fields.studentAge.label} placeholder={signup.fields.studentAge.placeholder} options={signup.ageOptions.map((a) => ({ value: a, label: `${a} years` }))} />
      </div>
      <SelectField id="track" label={signup.fields.track.label} placeholder={signup.fields.track.placeholder} options={signup.trackOptions} />

      <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-cream/60 p-4 transition-colors hover:border-brand/30">
        <input id="consent" type="checkbox" name="consent" required aria-required="true" className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-ink/30 text-brand accent-brand focus:ring-2 focus:ring-brand/40" />
        <span className="text-sm leading-relaxed text-ink-soft">
          {signup.consentLabel}{" "}
          <span className="text-coral-600" aria-hidden>*</span>
        </span>
      </label>

      <button type="submit" className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]">
        {enroll.continue}
        <Icon name="arrow-right" className="h-5 w-5" />
      </button>
      <p className="text-center text-xs font-medium text-ink-muted">{signup.reassurance}</p>
    </form>
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
  const ready = day && time;
  return (
    <div className="grid gap-6">
      <StepHeader heading={enroll.booking.heading} sub={enroll.booking.subheading} />

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">{enroll.booking.dayLabel}</p>
        <div className="flex flex-wrap gap-2">
          {enroll.booking.days.map((d) => {
            const selected = day === `${d.day} ${d.date}`;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setDay(`${d.day} ${d.date}`)}
                className={`flex min-w-[4.5rem] flex-col items-center rounded-2xl border px-4 py-3 text-sm transition-all ${
                  selected
                    ? "brand-gradient border-transparent text-white shadow-md"
                    : "border-ink/15 bg-white text-ink hover:border-brand/40"
                }`}
              >
                <span className="font-semibold">{d.day}</span>
                <span className={selected ? "text-white/85" : "text-ink-muted"}>{d.date}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">{enroll.booking.timeLabel}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {enroll.booking.times.map((t) => {
            const selected = time === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                  selected
                    ? "brand-gradient border-transparent text-white shadow-md"
                    : "border-ink/15 bg-white text-ink hover:border-brand/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!ready}
        nextLabel={enroll.continue}
        hint={!ready ? enroll.booking.hint : undefined}
      />
    </div>
  );
}

/* ---- Step 3: Quick check (placement warm-up) ------------------------ */

function QuizStep({
  qIndex,
  answers,
  onAnswer,
  onBack,
  onNext,
}: {
  qIndex: number;
  answers: (number | null)[];
  onAnswer: (optIdx: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const total = enroll.quiz.questions.length;
  const question = enroll.quiz.questions[qIndex];
  const picked = answers[qIndex];
  const last = qIndex === total - 1;

  return (
    <div className="grid gap-6">
      <StepHeader heading={enroll.quiz.heading} sub={enroll.quiz.subheading} />

      <div className="rounded-2xl bg-cream/70 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <Spark className="h-3.5 w-3.5" />
          Question {qIndex + 1} of {total}
        </div>
        <p className="mt-2 font-display text-lg font-bold text-ink">{question.q}</p>

        <div className="mt-4 grid gap-2.5">
          {question.options.map((opt, i) => {
            const isPicked = picked === i;
            return (
              <button
                key={opt.text}
                type="button"
                onClick={() => onAnswer(i)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-medium transition-all ${
                  isPicked
                    ? "border-brand bg-brand-50 text-brand"
                    : "border-ink/12 bg-white text-ink hover:border-brand/40"
                }`}
              >
                {opt.text}
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${isPicked ? "border-brand bg-brand text-white" : "border-ink/25"}`}>
                  {isPicked && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* progress dots */}
      <div className="flex justify-center gap-1.5">
        {enroll.quiz.questions.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === qIndex ? "w-6 bg-brand" : i < qIndex ? "w-2 bg-brand/50" : "w-2 bg-ink/15"
            }`}
          />
        ))}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={picked === null}
        nextLabel={last ? enroll.quiz.finish : enroll.quiz.next}
      />
    </div>
  );
}

/* ---- Step 4: Done --------------------------------------------------- */

function DoneStep({ day, time }: { day: string | null; time: string | null }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand">
        <Icon name="check" className="h-8 w-8" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-bold text-ink">{enroll.done.heading}</h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">{enroll.done.body}</p>

      {day && time && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink">
          <Icon name="check-badge" className="h-4 w-4 text-brand" />
          Trial: {day} · {time}
        </div>
      )}

      <ul className="mt-6 grid w-full max-w-sm gap-2 text-left">
        {enroll.done.points.map((p) => (
          <li key={p} className="flex items-center gap-3 rounded-2xl border border-ink/5 bg-white px-4 py-3 text-sm font-medium text-ink-soft shadow-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand">
              <Icon name="check" className="h-3.5 w-3.5" />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs font-medium text-ink-muted">{enroll.done.note}</p>
    </div>
  );
}

/* ---- Shared bits ---------------------------------------------------- */

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
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/30 hover:text-brand"
        >
          {enroll.back}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="brand-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel}
          <Icon name="arrow-right" className="h-5 w-5" />
        </button>
      </div>
      {hint && <p className="mt-3 text-center text-xs font-medium text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ---- Field primitives ----------------------------------------------- */

function Field({
  id,
  label,
  placeholder,
  type,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <input id={id} name={id} type={type} placeholder={placeholder} autoComplete={autoComplete} className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
    </div>
  );
}

function SelectField({
  id,
  label,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: readonly { readonly value: string; readonly label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <select id={id} name={id} defaultValue="" className="w-full appearance-none rounded-2xl border border-ink/15 bg-white px-4 py-3 pr-10 text-base text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30">
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
