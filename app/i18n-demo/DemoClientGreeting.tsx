"use client";

import { useTranslations } from "next-intl";

// Proves next-intl works in a CLIENT Component (via NextIntlClientProvider).
export default function DemoClientGreeting() {
  const t = useTranslations("demo");
  return (
    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
      <strong>[client]</strong> {t("greeting")}
    </p>
  );
}
