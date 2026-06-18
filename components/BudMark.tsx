/**
 * BudMark — the purple flower bud accent (برعم). The only decorative flower
 * motif on the platform; never use a pink/colored flower emoji (it clashes with
 * the purple brand). Server-renderable (no hooks).
 */
export default function BudMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <linearGradient id="ward-bud-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9F7DE7" />
          <stop offset="1" stopColor="#6840BD" />
        </linearGradient>
      </defs>
      <path d="M50 92 L50 60" stroke="#2E9E6B" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 74 C40 72 33 64 33 55 C44 57 50 65 50 74 Z" fill="#2E9E6B" opacity="0.8" />
      <path d="M50 70 C60 68 67 60 67 51 C56 53 50 61 50 70 Z" fill="#2E9E6B" opacity="0.65" />
      <path d="M50 62 C40 52 40 30 50 12 C60 30 60 52 50 62 Z" fill="url(#ward-bud-grad)" />
      <path d="M50 60 C45 50 45 32 50 18" fill="none" stroke="#F3EDFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}
