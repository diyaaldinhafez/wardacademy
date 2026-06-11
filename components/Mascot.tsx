/**
 * "Wardy" — Ward Academy's brand mark: the Platycodon (balloon flower) with the
 * AI spark emerging from it. ("Ward" / ورد = flowers.) The child's growth is the
 * hero; the spark supports and illuminates — it never surrounds or replaces.
 *
 * One source for the mark, used as mascot, logo and favicon. The `face`/`title`
 * props are kept for call-site compatibility; the flower carries the personality
 * (the design system uses no faces).
 */
type Props = {
  className?: string;
  face?: boolean;
  title?: string;
};

const PETAL =
  "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
const ROT = [0, 72, 144, 216, 288];

export default function Mascot({ className = "", title = "Ward Academy" }: Props) {
  return (
    <svg
      viewBox="0 0 132 132"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wardy-petal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9F7DE7" />
          <stop offset="1" stopColor="#6840BD" />
        </linearGradient>
        <linearGradient id="wardy-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3EDFF" />
          <stop offset="0.55" stopColor="#C8ABFF" />
          <stop offset="1" stopColor="#A57CFF" />
        </linearGradient>
      </defs>

      {/* flower */}
      <g transform="translate(16 32)">
        <g fill="url(#wardy-petal)">
          {ROT.map((deg) => (
            <path key={deg} d={PETAL} transform={`rotate(${deg} 50 50)`} />
          ))}
        </g>
        <circle cx="50" cy="50" r="9" fill="#F3EDFF" />
        <circle cx="50" cy="50" r="3.5" fill="#7F55D9" />
      </g>

      {/* the AI spark, emerging from the flower (animatable via .wardy-spark) */}
      <path
        className="wardy-spark"
        d="M104 8 C104.9 13.8 108 16.9 113.8 17.8 C108 18.7 104.9 21.8 104 27.6 C103.1 21.8 100 18.7 94.2 17.8 C100 16.9 103.1 13.8 104 8 Z"
        fill="url(#wardy-spark)"
      />
      <circle className="wardy-spark" cx="88" cy="30" r="2.6" fill="#C8ABFF" />
      <circle className="wardy-spark" cx="114" cy="36" r="1.8" fill="#DCD0FA" />
    </svg>
  );
}
