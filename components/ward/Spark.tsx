"use client";

import { useId } from "react";

/** The Spark — the single visual signature of every AI moment. */
export function Spark({
  state = "static",
  size = 20,
  glow = false,
  title,
}: {
  state?: "static" | "idle" | "thinking" | "success";
  size?: number;
  glow?: boolean;
  title?: string;
}) {
  const id = useId();
  const cls = ["ward-spark", state !== "static" ? `ward-spark--${state}` : "", glow ? "ward-spark--glow" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--spark-1)" />
            <stop offset="0.55" stopColor="var(--spark-2)" />
            <stop offset="1" stopColor="var(--spark-3)" />
          </linearGradient>
        </defs>
        <path d="M12 1 C13 7.5 16.5 11 23 12 C16.5 13 13 16.5 12 23 C11 16.5 7.5 13 1 12 C7.5 11 11 7.5 12 1 Z" fill={`url(#${id})`} />
      </svg>
    </span>
  );
}
