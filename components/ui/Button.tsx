import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Pill button — every button at Ward Academy is a pill (design system).
 * Renders a Next <Link> when `href` is set, otherwise a <button>.
 */
type Variant = "primary" | "warm" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-ward-1 hover:bg-brand-600",
  warm: "bg-amber text-brand-900 shadow-ward-1 hover:brightness-[1.05]",
  soft: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  ghost: "text-brand-700 hover:bg-brand-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-[22px] text-base",
  lg: "h-[52px] px-7 text-lg",
};

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls}>
      {children}
    </button>
  );
}
