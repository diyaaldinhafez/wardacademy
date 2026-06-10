/**
 * Decorative wavy transition between two sections.
 * `topColor` should match the section above, `bottomColor` the section below.
 */
type Props = {
  topColor: string;
  bottomColor: string;
  flip?: boolean;
};

export default function WaveDivider({ topColor, bottomColor, flip = false }: Props) {
  return (
    <div className="relative -my-px leading-[0]" style={{ backgroundColor: bottomColor }}>
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className={`block h-10 w-full sm:h-16 ${flip ? "rotate-180" : ""}`}
        aria-hidden
      >
        <path
          d="M0,0 H1440 V38 C1200,82 980,6 720,40 C470,76 240,10 0,44 Z"
          fill={topColor}
        />
      </svg>
    </div>
  );
}
