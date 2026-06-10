import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose Wardy — flower designs",
  robots: { index: false, follow: false },
};

/* ------------------------------------------------------------------ *
 * Internal design-picker page: 10 flower variations to choose from.
 * Visit /designs and pick a number. Delete this folder once chosen.
 * ------------------------------------------------------------------ */

const HEART =
  "M100 50 C 90 34 62 38 62 60 C 62 80 90 92 100 102 C 110 92 138 80 138 60 C 138 38 110 34 100 50 Z";
const BLOSSOM =
  "M100 100 C 80 95 73 64 86 47 C 90 55 96 51 100 57 C 104 51 110 55 114 47 C 127 64 120 95 100 100 Z";
const DIAMOND = "M100 44 Q120 74 100 104 Q80 74 100 44 Z";
const TEAR =
  "M100 100 C 78 96 70 60 100 44 C 130 60 122 96 100 100 Z";

function Defs({ s, center = "amber" }: { s: string; center?: "amber" | "coral" }) {
  return (
    <defs>
      <linearGradient id={`pg-${s}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#4338ca" />
      </linearGradient>
      <linearGradient id={`pl-${s}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a5b4fc" />
        <stop offset="100%" stopColor="#818cf8" />
      </linearGradient>
      <radialGradient id={`cg-${s}`} cx="0.5" cy="0.4" r="0.7">
        {center === "coral" ? (
          <>
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#fb7185" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fbbf24" />
          </>
        )}
      </radialGradient>
    </defs>
  );
}

function Face() {
  return (
    <>
      <circle cx="80" cy="107" r="6" fill="#fb7185" opacity="0.8" />
      <circle cx="120" cy="107" r="6" fill="#fb7185" opacity="0.8" />
      <circle cx="88" cy="94" r="8.5" fill="#fff" />
      <circle cx="112" cy="94" r="8.5" fill="#fff" />
      <circle cx="90" cy="95" r="4" fill="#3730a3" />
      <circle cx="114" cy="95" r="4" fill="#3730a3" />
      <circle cx="91.5" cy="93.5" r="1.4" fill="#fff" />
      <circle cx="115.5" cy="93.5" r="1.4" fill="#fff" />
      <path
        d="M89 108 Q100 119 111 108"
        fill="none"
        stroke="#3730a3"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  );
}

function Ring({
  n,
  rx,
  ry,
  cy,
  fill,
  cx = 100,
}: {
  n: number;
  rx: number;
  ry: number;
  cy: number;
  fill: string;
  cx?: number;
}) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={fill}
          transform={`rotate(${(360 / n) * i} 100 100)`}
        />
      ))}
    </>
  );
}

function PathRing({ d, n, fill }: { d: string; n: number; fill: string }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <path key={i} d={d} fill={fill} transform={`rotate(${(360 / n) * i} 100 100)`} />
      ))}
    </>
  );
}

const svgBox = "h-40 w-40";

const designs: { name: string; desc: string; svg: React.ReactNode }[] = [
  {
    name: "Classic Daisy",
    desc: "5 round petals",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="1" />
        <Ring n={5} rx={27} ry={40} cy={54} fill="url(#pg-1)" />
        <circle cx="100" cy="100" r="34" fill="url(#cg-1)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Full Bloom",
    desc: "6 rounded petals",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="2" />
        <Ring n={6} rx={23} ry={38} cy={56} fill="url(#pg-2)" />
        <circle cx="100" cy="100" r="32" fill="url(#cg-2)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Heart Petals",
    desc: "5 hearts — extra sweet",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="3" />
        <PathRing d={HEART} n={5} fill="url(#pg-3)" />
        <circle cx="100" cy="100" r="30" fill="url(#cg-3)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Pinwheel",
    desc: "5 twisted petals — spinny",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="4" />
        <Ring n={5} rx={19} ry={40} cy={56} cx={112} fill="url(#pg-4)" />
        <circle cx="100" cy="100" r="30" fill="url(#cg-4)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Cherry Blossom",
    desc: "5 notched petals, coral heart",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="5" center="coral" />
        <PathRing d={BLOSSOM} n={5} fill="url(#pg-5)" />
        <circle cx="100" cy="100" r="30" fill="url(#cg-5)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Double Layer",
    desc: "10 petals, two rings — lush",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="6" />
        <g transform="rotate(36 100 100)">
          <Ring n={5} rx={22} ry={42} cy={52} fill="url(#pl-6)" />
        </g>
        <Ring n={5} rx={24} ry={36} cy={56} fill="url(#pg-6)" />
        <circle cx="100" cy="100" r="30" fill="url(#cg-6)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Clover Quatrefoil",
    desc: "4 big round petals — bold",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="7" />
        <g fill="url(#pg-7)">
          <circle cx="100" cy="60" r="38" />
          <circle cx="140" cy="100" r="38" />
          <circle cx="100" cy="140" r="38" />
          <circle cx="60" cy="100" r="38" />
        </g>
        <circle cx="100" cy="100" r="30" fill="url(#cg-7)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Gerbera",
    desc: "12 slim petals — sunny",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="8" />
        <Ring n={12} rx={8.5} ry={42} cy={54} fill="url(#pg-8)" />
        <circle cx="100" cy="100" r="34" fill="url(#cg-8)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Geometric Petals",
    desc: "6 pointed petals — modern",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="9" />
        <PathRing d={DIAMOND} n={6} fill="url(#pg-9)" />
        <circle cx="100" cy="100" r="26" fill="url(#cg-9)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Rose Sprig",
    desc: "Flower on a stem with leaves",
    svg: (
      <svg viewBox="0 0 200 200" className={svgBox}>
        <Defs s="10" />
        {/* stem + leaves (green accent — off the core palette, shown as an option) */}
        <rect x="97" y="112" width="6" height="62" rx="3" fill="#34d399" />
        <ellipse cx="78" cy="150" rx="16" ry="8" fill="#34d399" transform="rotate(35 78 150)" />
        <ellipse cx="122" cy="158" rx="14" ry="7" fill="#34d399" transform="rotate(-35 122 158)" />
        {/* bloom, lifted up a touch */}
        <g transform="translate(0 -12)">
          <PathRing d={TEAR} n={6} fill="url(#pg-10)" />
          <circle cx="100" cy="100" r="26" fill="url(#cg-10)" />
          <Face />
        </g>
      </svg>
    ),
  },
];

export default function DesignsPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Pick Wardy 🌸
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            10 flower designs for the Ward Academy identity. Tell me the number you
            like best — I&apos;ll polish it and use it everywhere (mascot, logo, favicon).
          </p>
        </header>

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {designs.map((d, i) => (
            <figure
              key={d.name}
              className="flex flex-col items-center rounded-3xl border border-ink/5 bg-white p-5 shadow-sm"
            >
              <div className="grid h-40 w-40 place-items-center">{d.svg}</div>
              <figcaption className="mt-3 text-center">
                <div className="font-display text-lg font-bold text-brand">
                  {i + 1}. {d.name}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">{d.desc}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-muted">
          On the cream background, just like the real site.
        </p>
      </div>
    </main>
  );
}
