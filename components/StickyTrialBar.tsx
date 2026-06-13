"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import { useT } from "./LanguageProvider";

/**
 * Sticky mobile CTA — appears after the user scrolls past the hero, keeping
 * "Book a free trial" one tap away. Mobile only; hidden on larger screens.
 */
export default function StickyTrialBar() {
  const L = useT().landing;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 p-3 backdrop-blur transition-transform duration-300 sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <Button href="/enroll" variant="warm" size="md" className="w-full">
        {L.stickyCta}
      </Button>
    </div>
  );
}
