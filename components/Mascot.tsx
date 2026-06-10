/**
 * "Wardy" — Ward Academy's identity mark: a friendly purple flower.
 * ("Ward" / ورد means roses/flowers — the heart of the brand.)
 *
 * One source of truth for the flower shape:
 *  - face={true}  → the smiling mascot (hero, signup)
 *  - face={false} → a clean flower mark for the logo (navbar, footer, favicon)
 *
 * Pure SVG, indigo petals + amber center + coral cheeks — on-palette.
 */
type Props = {
  className?: string;
  face?: boolean;
  title?: string;
};

const PETAL_ROTATIONS = [0, 72, 144, 216, 288];

export default function Mascot({
  className = "",
  face = true,
  title = "Ward Academy flower",
}: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wardy-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <radialGradient id="wardy-center" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
      </defs>

      {/* petals */}
      <g fill="url(#wardy-petal)">
        {PETAL_ROTATIONS.map((deg) => (
          <ellipse
            key={deg}
            cx="100"
            cy="54"
            rx="27"
            ry="40"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </g>

      {/* flower center */}
      <circle cx="100" cy="100" r="34" fill="url(#wardy-center)" />
      <circle cx="100" cy="100" r="34" fill="none" stroke="#f59e0b" strokeOpacity="0.35" strokeWidth="2" />

      {face && (
        <>
          {/* cheeks */}
          <circle cx="80" cy="107" r="6" fill="#fb7185" opacity="0.8" />
          <circle cx="120" cy="107" r="6" fill="#fb7185" opacity="0.8" />
          {/* eyes */}
          <circle cx="88" cy="94" r="8.5" fill="#ffffff" />
          <circle cx="112" cy="94" r="8.5" fill="#ffffff" />
          <circle cx="90" cy="95" r="4" fill="#3730a3" />
          <circle cx="114" cy="95" r="4" fill="#3730a3" />
          <circle cx="91.5" cy="93.5" r="1.4" fill="#ffffff" />
          <circle cx="115.5" cy="93.5" r="1.4" fill="#ffffff" />
          {/* smile */}
          <path
            d="M89 108 Q100 119 111 108"
            fill="none"
            stroke="#3730a3"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* little sparkles — the brand's "magic" accent (mascot only) */}
          <path d="M162 50 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#fbbf24" />
          <path d="M40 150 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" fill="#fb7185" />
        </>
      )}
    </svg>
  );
}
