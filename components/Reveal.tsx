"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps content in a gentle fade-up-on-scroll reveal.
 * Uses IntersectionObserver; the CSS (.reveal / .is-visible) handles the
 * animation and automatically disables it under prefers-reduced-motion.
 */
type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms, for lists of revealing items. */
  delay?: number;
  as?: "div" | "li" | "section";
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      // @ts-expect-error — ref type narrows fine across the small union we allow
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
