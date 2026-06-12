/**
 * FlowerMark — the clean flower logo mark with no AI spark.
 * Used everywhere a logo appears (nav, page headers).
 * The AI spark (Mascot / HeroBloom) is reserved for AI-moment contexts only.
 * Source: app/icon.svg
 */
const PETAL =
  "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
const ROT = [0, 72, 144, 216, 288];

export default function FlowerMark({
  className = "",
  title = "Ward Academy",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fm-petal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9F7DE7" />
          <stop offset="1" stopColor="#6840BD" />
        </linearGradient>
      </defs>
      <g fill="url(#fm-petal)">
        {ROT.map((deg) => (
          <path
            key={deg}
            d={PETAL}
            transform={deg ? `rotate(${deg} 50 50)` : undefined}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="9" fill="#F3EDFF" />
      <circle cx="50" cy="50" r="3.5" fill="#7F55D9" />
    </svg>
  );
}
