/**
 * "Wardy" — Ward Academy's friendly sparkle-star mascot.
 * A rounded 4-point star (ties to the AI "sparkle" motif) with a warm little
 * face. Pure SVG, scales with the parent via className. Decorative only.
 */
type Props = {
  className?: string;
  title?: string;
};

export default function Mascot({ className = "", title = "Wardy, the Ward Academy buddy" }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wardy-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>

      {/* soft glow */}
      <circle cx="100" cy="104" r="78" fill="#4f46e5" opacity="0.12" />

      {/* body — plump 4-point sparkle */}
      <path
        d="M100 18
           C 116 72, 128 84, 182 100
           C 128 116, 116 128, 100 182
           C 84 128, 72 116, 18 100
           C 72 84, 84 72, 100 18 Z"
        fill="url(#wardy-body)"
      />

      {/* cheeks */}
      <circle cx="74" cy="116" r="8" fill="#fb7185" opacity="0.75" />
      <circle cx="126" cy="116" r="8" fill="#fb7185" opacity="0.75" />

      {/* eyes */}
      <circle cx="84" cy="98" r="13" fill="#ffffff" />
      <circle cx="116" cy="98" r="13" fill="#ffffff" />
      <circle cx="87" cy="100" r="5.5" fill="#1e293b" />
      <circle cx="119" cy="100" r="5.5" fill="#1e293b" />
      <circle cx="89" cy="98" r="1.8" fill="#ffffff" />
      <circle cx="121" cy="98" r="1.8" fill="#ffffff" />

      {/* smile */}
      <path
        d="M85 120 Q100 134 115 120"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* little sparkles orbiting */}
      <path
        d="M158 44 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z"
        fill="#fbbf24"
      />
      <path
        d="M44 150 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z"
        fill="#34d399"
      />
    </svg>
  );
}
