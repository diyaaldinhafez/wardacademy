import type { BloomStage } from "@/lib/skills";

const PETAL = "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
const STAGE_AR: Record<BloomStage, string> = { bud: "برعم", balloon: "بالون — تنمو", bloom: "تفتّحت!" };
const STAGE_HINT: Record<BloomStage, string> = {
  bud: "ابدأ بحلّ الأسئلة لتنمو وردتك.",
  balloon: "أحسنت! واصل لتتفتّح بالكامل.",
  bloom: "أتقنتَ هذه الوحدة — رائع!",
};

/** bud → balloon → bloom: the daily, animated hero state of one unit. */
export default function UnitBloom({ stage, title, sub }: { stage: BloomStage; title: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-6 text-center shadow-ward-1">
      <div className="mx-auto grid h-44 w-44 place-items-center">
        <svg viewBox="0 0 100 124" className="h-full" role="img" aria-label={STAGE_AR[stage]}>
          <defs>
            <linearGradient id="ub-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9F7DE7" />
              <stop offset="1" stopColor="#6840BD" />
            </linearGradient>
          </defs>
          {/* stem + leaves */}
          <path d="M50 122 L50 58" stroke="#2E9E6B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M50 96 C40 93 34 85 34 77 C44 79 50 87 50 96 Z" fill="#2E9E6B" opacity="0.85" />
          <path d="M50 89 C60 86 66 78 66 70 C56 72 50 80 50 89 Z" fill="#2E9E6B" opacity="0.7" />

          {stage === "bud" && (
            <path d="M50 60 C43 55 41 45 46 37 C48 33 50 32 50 30 C50 32 52 33 54 37 C59 45 57 55 50 60 Z" fill="url(#ub-grad)" />
          )}
          {stage === "balloon" && (
            <g className="unit-balloon">
              <circle cx="50" cy="42" r="21" fill="url(#ub-grad)" />
              <ellipse cx="43" cy="35" rx="5" ry="7" fill="#FFFFFF" opacity="0.25" />
            </g>
          )}
          {stage === "bloom" && (
            <g className="unit-bloom" transform="translate(0 -6)">
              {[0, 72, 144, 216, 288].map((r) => (
                <g key={r} transform={`rotate(${r} 50 50)`}>
                  <path
                    d={PETAL}
                    fill="url(#ub-grad)"
                    style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: "scale(0.95)" }}
                  />
                </g>
              ))}
              <circle cx="50" cy="50" r="9" fill="#F3EDFF" />
              <circle cx="50" cy="50" r="3.5" fill="#7F55D9" />
            </g>
          )}
        </svg>
      </div>
      <p className="text-sm font-bold text-brand-700">{STAGE_AR[stage]}</p>
      <p className="mt-1 text-lg font-bold text-ink" dir="ltr">
        {title}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{sub ? `${sub} · ` : ""}{STAGE_HINT[stage]}</p>
    </div>
  );
}
