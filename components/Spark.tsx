import type { SVGProps } from "react";

/**
 * The AI spark — Ward Academy's signature for AI involvement. Use it ONLY to
 * mark an AI moment (never as generic decoration).
 *
 * Default fill is currentColor. Pass `gradient` for the brand spark gradient
 * (light → violet), as the design system draws it.
 */
const PATH =
  "M12 1 C13 7.5 16.5 11 23 12 C16.5 13 13 16.5 12 23 C11 16.5 7.5 13 1 12 C7.5 11 11 7.5 12 1 Z";

export default function Spark({
  gradient = false,
  ...props
}: SVGProps<SVGSVGElement> & { gradient?: boolean }) {
  if (gradient) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
        <defs>
          <linearGradient id="ward-spark-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F3EDFF" />
            <stop offset="0.55" stopColor="#C8ABFF" />
            <stop offset="1" stopColor="#A57CFF" />
          </linearGradient>
        </defs>
        <path d={PATH} fill="url(#ward-spark-grad)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d={PATH} />
    </svg>
  );
}
