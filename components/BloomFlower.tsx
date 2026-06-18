import type { Petal } from "@/lib/skills";

const PETAL = "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";

/**
 * The five-petal skill flower — each petal grows with the % of mastered
 * objectives in that skill (real data). The slower, big-picture snapshot.
 */
export default function BloomFlower({
  skills,
  caption,
}: {
  skills: Petal[];
  caption?: string;
}) {
  const overall = Math.round(skills.reduce((s, x) => s + x.value, 0) / Math.max(1, skills.length));

  return (
    <div className="grid items-center gap-6 rounded-3xl border border-brand-100 bg-white p-6 shadow-ward-1 sm:grid-cols-[0.8fr_1.2fr]">
      {/* flower */}
      <div className="relative mx-auto grid aspect-square w-full max-w-[230px] place-items-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 50% 45%, rgba(127,85,217,0.10), transparent 65%)" }}
          aria-hidden
        />
        <svg viewBox="0 0 100 100" className="w-[80%]" role="img" aria-label="وردة المهارات">
          <defs>
            <linearGradient id="bf-petal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9F7DE7" />
              <stop offset="1" stopColor="#6840BD" />
            </linearGradient>
          </defs>
          {skills.map((s, i) => {
            const scale = 0.55 + (s.value / 100) * 0.45;
            const opacity = 0.35 + (s.value / 100) * 0.65;
            return (
              <g key={s.name} transform={`rotate(${i * 72} 50 50)`}>
                <path
                  d={PETAL}
                  fill="url(#bf-petal)"
                  style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: `scale(${scale})`, opacity }}
                />
              </g>
            );
          })}
          <circle cx="50" cy="50" r="10" fill="#F3EDFF" />
          <circle cx="50" cy="50" r="4" fill="#7F55D9" />
        </svg>
        <div className="absolute bottom-0 inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white px-3 py-1.5 shadow-ward-1">
          <span className="text-base font-bold text-brand-700">{overall}%</span>
        </div>
      </div>

      {/* skill bars */}
      <div className="grid gap-3">
        {skills.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span className="flex w-16 shrink-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand" style={{ opacity: 0.4 + (s.value / 100) * 0.6 }} />
              <span className="text-[13px] font-bold text-ink">{s.ar}</span>
            </span>
            <span className="h-2.5 flex-1 rounded-full bg-brand-100">
              <span className="block h-full rounded-full" style={{ width: `${s.value}%`, background: "linear-gradient(90deg,#9f7de7,#6840bd)" }} />
            </span>
            <span className="w-9 shrink-0 text-end text-[12px] font-bold text-brand-700">{s.value}%</span>
          </div>
        ))}
        {caption && <p className="mt-1 text-xs text-ink-soft">{caption}</p>}
      </div>
    </div>
  );
}
