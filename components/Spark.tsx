import type { SVGProps } from "react";

/**
 * The AI spark — Ward Academy's signature for AI involvement. Use it ONLY to
 * mark an AI moment (never as generic decoration). Inherits color via
 * currentColor; on the landing it's drawn in brand purple.
 */
export default function Spark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 1 C13 7.5 16.5 11 23 12 C16.5 13 13 16.5 12 23 C11 16.5 7.5 13 1 12 C7.5 11 11 7.5 12 1 Z" />
    </svg>
  );
}
