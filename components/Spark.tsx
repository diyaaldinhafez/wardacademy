import type { SVGProps } from "react";

/**
 * The brand's 4-point spark motif as a small, solid accent icon.
 * Inherits color from the parent (currentColor). Used for eyebrows, bullets,
 * and decorative accents so the whole site echoes the logo shape.
 */
export default function Spark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 1.6C13.6 8 16 10.4 22.4 12 16 13.6 13.6 16 12 22.4 10.4 16 8 13.6 1.6 12 8 10.4 10.4 8 12 1.6Z" />
    </svg>
  );
}
