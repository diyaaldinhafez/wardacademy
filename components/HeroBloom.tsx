/**
 * HeroBloom — the hero flower telling the brand story ONCE on page load:
 * bud → balloon → pop! → petals unfurl step by step → center → the AI spark
 * is born from the flower's heart → gentle ambient float.
 *
 * Uses the design system's bud/balloon/bloom progress metaphor and its
 * "things bloom and settle, never snap" motion principle. Pure CSS timeline
 * (see globals.css "bloom story"); honors prefers-reduced-motion by showing
 * the final bloomed state immediately. Used only in the landing hero —
 * everywhere else the static Mascot mark is used.
 */
const PETAL =
  "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
const ROT = [0, 72, 144, 216, 288];

/* burst particles: direction each flies on pop (in svg px) */
const BURST: { dx: number; dy: number; r: number; fill: string }[] = [
  { dx: -26, dy: -18, r: 3.2, fill: "#C0A9F2" },
  { dx: 24, dy: -22, r: 2.6, fill: "#DCD0FA" },
  { dx: -20, dy: 16, r: 2.4, fill: "#C8ABFF" },
  { dx: 22, dy: 14, r: 3, fill: "#C0A9F2" },
  { dx: 0, dy: -28, r: 2.2, fill: "#FFB46B" },
  { dx: -30, dy: 0, r: 2, fill: "#DCD0FA" },
];

export default function HeroBloom({ className = "", title = "Ward Academy" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 132 132"
      className={`bloom-story ${className}`}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hb-petal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9F7DE7" />
          <stop offset="1" stopColor="#6840BD" />
        </linearGradient>
        <linearGradient id="hb-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3EDFF" />
          <stop offset="0.55" stopColor="#C8ABFF" />
          <stop offset="1" stopColor="#A57CFF" />
        </linearGradient>
        <linearGradient id="hb-bud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9F7DE7" />
          <stop offset="1" stopColor="#7F55D9" />
        </linearGradient>
        <linearGradient id="hb-balloon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C0A9F2" />
          <stop offset="1" stopColor="#7F55D9" />
        </linearGradient>
      </defs>

      {/* everything shares the flower's coordinate frame */}
      <g transform="translate(16 32)">
        {/* Act 1 — the closed bud */}
        <g className="hb-bud">
          <path
            d="M50,10 C63,28 70,42 70,57 C70,76 61,90 50,90 C39,90 30,76 30,57 C30,42 37,28 50,10 Z"
            fill="url(#hb-bud)"
          />
          <path d="M50,10 C53,32 54,60 50,90" fill="none" stroke="#6840BD" strokeWidth="1.6" opacity="0.55" />
          <path d="M50,10 C42,32 40,60 44,88" fill="none" stroke="#6840BD" strokeWidth="1.3" opacity="0.4" />
          <path d="M50,10 C58,32 60,60 56,88" fill="none" stroke="#6840BD" strokeWidth="1.3" opacity="0.4" />
        </g>

        {/* Act 2 — the inflating balloon */}
        <g className="hb-balloon">
          <path
            d="M50,12 C68,12 80,30 80,53 C80,75 67,89 50,89 C33,89 20,75 20,53 C20,30 32,12 50,12 Z"
            fill="url(#hb-balloon)"
          />
          <path d="M50,12 C56,36 56,66 50,89" fill="none" stroke="#6840BD" strokeWidth="1.5" opacity="0.45" />
          <path d="M50,12 C40,34 38,64 46,88" fill="none" stroke="#6840BD" strokeWidth="1.3" opacity="0.35" />
          <path d="M50,12 C60,34 62,64 54,88" fill="none" stroke="#6840BD" strokeWidth="1.3" opacity="0.35" />
          <ellipse cx="40" cy="34" rx="7" ry="11" fill="#F3EDFF" opacity="0.5" transform="rotate(-18 40 34)" />
        </g>

        {/* Act 3 — pop! burst particles */}
        {BURST.map((b, i) => (
          <circle
            key={i}
            className="hb-burst"
            cx="50"
            cy="50"
            r={b.r}
            fill={b.fill}
            style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px` } as React.CSSProperties}
          />
        ))}

        {/* Act 4 — petals unfurl, step by step */}
        {ROT.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg} 50 50)`}>
            <path
              className="hb-petal-anim"
              d={PETAL}
              fill="url(#hb-petal)"
              style={{ animationDelay: `${2.3 + i * 0.13}s` }}
            />
          </g>
        ))}

        {/* the flower's heart */}
        <circle className="hb-center" cx="50" cy="50" r="9" fill="#F3EDFF" />
        <circle className="hb-center" cx="50" cy="50" r="3.5" fill="#7F55D9" style={{ animationDelay: "3.3s" }} />
      </g>

      {/* Act 5 — the AI spark is born from the flower's heart */}
      <path
        className="hb-spark"
        d="M104 8 C104.9 13.8 108 16.9 113.8 17.8 C108 18.7 104.9 21.8 104 27.6 C103.1 21.8 100 18.7 94.2 17.8 C100 16.9 103.1 13.8 104 8 Z"
        fill="url(#hb-spark)"
      />
      <circle className="hb-emit" cx="88" cy="30" r="2.6" fill="#C8ABFF" />
      <circle className="hb-emit" cx="114" cy="36" r="1.8" fill="#DCD0FA" style={{ animationDelay: "5.4s" }} />
    </svg>
  );
}
