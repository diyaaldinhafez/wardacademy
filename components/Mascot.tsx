/**
 * "Wardy" — Ward Academy's identity mark: a 4-point spark (Gemini-style),
 * filled with the brand "confidence" gradient (indigo → violet → coral).
 *
 * One source of truth:
 *  - face={true}  → the friendly mascot (hero, signup)
 *  - face={false} → the clean spark for the logo (navbar, footer, favicon)
 */
type Props = {
  className?: string;
  face?: boolean;
  title?: string;
};

const SPARK =
  "M100 16 C 116 72 128 84 184 100 C 128 116 116 128 100 184 C 84 128 72 116 16 100 C 72 84 84 72 100 16 Z";

export default function Mascot({
  className = "",
  face = true,
  title = "Ward Academy spark",
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
        <linearGradient id="wardy-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>

      <path d={SPARK} fill="url(#wardy-grad)" />

      {face && (
        <>
          {/* cheeks */}
          <circle cx="80" cy="108" r="6" fill="#ffffff" opacity="0.55" />
          <circle cx="120" cy="108" r="6" fill="#ffffff" opacity="0.55" />
          {/* eyes */}
          <circle cx="88" cy="95" r="8.5" fill="#ffffff" />
          <circle cx="112" cy="95" r="8.5" fill="#ffffff" />
          <circle cx="90" cy="96" r="4" fill="#3730a3" />
          <circle cx="114" cy="96" r="4" fill="#3730a3" />
          <circle cx="91.5" cy="94.5" r="1.4" fill="#ffffff" />
          <circle cx="115.5" cy="94.5" r="1.4" fill="#ffffff" />
          {/* smile */}
          <path
            d="M89 109 Q100 120 111 109"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
