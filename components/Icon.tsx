import type { SVGProps } from "react";

/**
 * Small inline icon set used across the landing page.
 * Stroke-based, currentColor — so color is controlled by the parent.
 */
export type IconName =
  | "sparkles"
  | "chart"
  | "teacher"
  | "shield-eye"
  | "check-badge"
  | "graduation"
  | "lock"
  | "arrow-right"
  | "menu"
  | "close"
  | "check"
  | "star";

type Props = SVGProps<SVGSVGElement> & { name: IconName };

const paths: Record<IconName, React.ReactNode> = {
  sparkles: (
    <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-5.5-2.5 2.5m-3 3-2.5 2.5m8 0-2.5-2.5m-3-3L8.5 6.5" />
  ),
  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 17v-5m4 5V8m4 9v-7" />
    </>
  ),
  teacher: (
    <>
      {/* Presentation board on an easel — "teacher-led" */}
      <rect x="3.5" y="3.5" width="17" height="11.5" rx="1.6" />
      <path d="M7.5 8h6M7.5 11h4" />
      <path d="M8 15l-1.5 4M16 15l1.5 4" />
    </>
  ),
  "shield-eye": (
    <>
      <path d="M12 3.5 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" />
      <circle cx="12" cy="10.5" r="1.6" />
      <path d="M8.5 10.5c.9-1.6 5.1-1.6 7 0-1.9 1.6-6.1 1.6-7 0Z" />
    </>
  ),
  "check-badge": (
    <>
      <path d="m9 12 2 2 4-4" />
      <path d="M12 3 14.4 4.6 17.3 4.4 18 7.2 20.2 9l-1 2.8 1 2.8L18 16.4l-.7 2.8-2.9-.2L12 20.6l-2.4-1.6-2.9.2L6 16.4 3.8 14.6l1-2.8-1-2.8L6 7.2 6.7 4.4 9.6 4.6z" />
    </>
  ),
  graduation: (
    <>
      <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
      <path d="M7 11.5v4c0 1.1 2.2 2.5 5 2.5s5-1.4 5-2.5v-4" />
      <path d="M21 9.5v4.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  star: (
    <path d="m12 4 2.3 4.7 5.2.8-3.8 3.7.9 5.1-4.6-2.4-4.6 2.4.9-5.1L4.5 9.5l5.2-.8z" />
  ),
};

export default function Icon({ name, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
