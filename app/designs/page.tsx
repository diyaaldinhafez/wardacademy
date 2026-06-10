import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose Wardy — spark designs",
  robots: { index: false, follow: false },
};

/* ------------------------------------------------------------------ *
 * Internal design-picker: 10 "spark" (4-point star) variations using
 * the "confidence" gradient (indigo → violet → coral).
 * Visit /designs, pick a number. Delete this folder once chosen.
 * ------------------------------------------------------------------ */

// Star bodies (viewBox 200x200, centered 100,100) — varying sharpness.
const PLUMP =
  "M100 16 C 116 72 128 84 184 100 C 128 116 116 128 100 184 C 84 128 72 116 16 100 C 72 84 84 72 100 16 Z";
const SHARP =
  "M100 12 C 108 78 122 92 188 100 C 122 108 108 122 100 188 C 92 122 78 108 12 100 C 78 92 92 78 100 12 Z";
const SHORT =
  "M100 46 C 106 92 108 94 154 100 C 108 106 106 108 100 154 C 94 108 92 106 46 100 C 92 94 94 92 100 46 Z";

const SMOOTH: [string, string][] = [
  ["0%", "#4f46e5"],
  ["50%", "#8b5cf6"],
  ["100%", "#fb7185"],
];

function Stops({ stops }: { stops: [string, string][] }) {
  return (
    <>
      {stops.map(([o, c], i) => (
        <stop key={i} offset={o} stopColor={c} />
      ))}
    </>
  );
}

function Face() {
  return (
    <>
      <circle cx="80" cy="108" r="6" fill="#ffffff" opacity="0.85" />
      <circle cx="120" cy="108" r="6" fill="#ffffff" opacity="0.85" />
      <circle cx="88" cy="95" r="8.5" fill="#fff" />
      <circle cx="112" cy="95" r="8.5" fill="#fff" />
      <circle cx="90" cy="96" r="4" fill="#3730a3" />
      <circle cx="114" cy="96" r="4" fill="#3730a3" />
      <circle cx="91.5" cy="94.5" r="1.4" fill="#fff" />
      <circle cx="115.5" cy="94.5" r="1.4" fill="#fff" />
      <path
        d="M89 109 Q100 120 111 109"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </>
  );
}

const box = "h-40 w-40";

const designs: { name: string; desc: string; svg: React.ReactNode }[] = [
  {
    name: "Spark Classic",
    desc: "Smooth diagonal gradient",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <path d={PLUMP} fill="url(#g1)" />
      </svg>
    ),
  },
  {
    name: "Spark Sharp",
    desc: "Slimmer, sharper points",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <path d={SHARP} fill="url(#g2)" />
      </svg>
    ),
  },
  {
    name: "Spark Friendly",
    desc: "Classic with a little face",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <path d={PLUMP} fill="url(#g3)" />
        <Face />
      </svg>
    ),
  },
  {
    name: "Spark Vertical",
    desc: "Indigo top → coral bottom",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <path d={PLUMP} fill="url(#g4)" />
      </svg>
    ),
  },
  {
    name: "Spark Split",
    desc: "Two tones, clear boundary",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g5" x1="0" y1="0" x2="1" y2="1">
            <Stops
              stops={[
                ["0%", "#4f46e5"],
                ["50%", "#4f46e5"],
                ["50%", "#fb7185"],
                ["100%", "#fb7185"],
              ]}
            />
          </linearGradient>
        </defs>
        <path d={PLUMP} fill="url(#g5)" />
      </svg>
    ),
  },
  {
    name: "Spark Tri-Band",
    desc: "Three crisp bands",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g6" x1="0" y1="0" x2="1" y2="1">
            <Stops
              stops={[
                ["0%", "#4f46e5"],
                ["38%", "#4f46e5"],
                ["38%", "#8b5cf6"],
                ["66%", "#8b5cf6"],
                ["66%", "#fb7185"],
                ["100%", "#fb7185"],
              ]}
            />
          </linearGradient>
        </defs>
        <path d={PLUMP} fill="url(#g6)" />
      </svg>
    ),
  },
  {
    name: "Spark Glossy",
    desc: "Radial glow center",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <radialGradient id="g7" cx="0.42" cy="0.36" r="0.78">
            <Stops
              stops={[
                ["0%", "#c4b5fd"],
                ["45%", "#8b5cf6"],
                ["100%", "#fb7185"],
              ]}
            />
          </radialGradient>
        </defs>
        <path d={PLUMP} fill="url(#g7)" />
      </svg>
    ),
  },
  {
    name: "Spark Glint",
    desc: "A shine instead of a face",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g8" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <path d={PLUMP} fill="url(#g8)" />
        {/* white glint */}
        <path
          d="M86 70 C 90 84 92 86 104 90 C 92 94 90 96 86 110 C 82 96 80 94 68 90 C 80 86 82 84 86 70 Z"
          fill="#ffffff"
          opacity="0.9"
        />
      </svg>
    ),
  },
  {
    name: "Spark Twin",
    desc: "Big spark + little companion",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g9" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
          <linearGradient id="g9b" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <g transform="translate(-12 14) scale(0.9)">
          <path d={PLUMP} fill="url(#g9)" />
        </g>
        <g transform="translate(118 -2) scale(0.34)">
          <path d={PLUMP} fill="url(#g9b)" />
        </g>
      </svg>
    ),
  },
  {
    name: "Spark Twinkle",
    desc: "8 points — extra sparkle",
    svg: (
      <svg viewBox="0 0 200 200" className={box}>
        <defs>
          <linearGradient id="g10" x1="0" y1="0" x2="1" y2="1">
            <Stops stops={SMOOTH} />
          </linearGradient>
        </defs>
        <g fill="url(#g10)">
          <path d={PLUMP} />
          <path d={SHORT} transform="rotate(45 100 100)" />
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
            Pick the spark ✦
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            10 spark designs in the <em>confidence</em> gradient (indigo → violet →
            coral). Smooth blends and crisp boundaries, with or without a face. Tell me
            the number — I&apos;ll polish it and use it everywhere (mascot, logo, favicon).
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
          You can also mix: e.g. &quot;shape of 2 with the gradient of 7&quot;.
        </p>
      </div>
    </main>
  );
}
