import { DateTime } from "luxon";

// Format a UTC ISO timestamp in the given timezone, localized — for parent-facing
// surfaces (readable local time, no "UTC" label). Falls back to Asia/Riyadh / en.
export function fmtLocal(iso: string | null | undefined, tz = "Asia/Riyadh", locale = "en"): string {
  if (!iso) return "—";
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(tz)
    .setLocale(locale === "ar" ? "ar" : "en")
    .toLocaleString({ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Time-only (HH:MM) in the given timezone — for compact timelines/hero rows where the
// date is implied. Same luxon path as fmtLocal; falls back to Asia/Riyadh / en.
export function fmtTime(iso: string | null | undefined, tz = "Asia/Riyadh", locale = "en"): string {
  if (!iso) return "—";
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(tz)
    .setLocale(locale === "ar" ? "ar" : "en")
    .toLocaleString({ hour: "2-digit", minute: "2-digit" });
}

// Current date (weekday, day, month) in the given timezone — for "today" headers, so a
// server clock (UTC) can't show the wrong day near local midnight. Luxon, fallback Asia/Riyadh / en.
export function fmtDateNow(tz = "Asia/Riyadh", locale = "en"): string {
  return DateTime.now()
    .setZone(tz)
    .setLocale(locale === "ar" ? "ar" : "en")
    .toLocaleString({ weekday: "long", day: "numeric", month: "long" });
}

// Format a UTC ISO timestamp deterministically (server-tz-independent) and
// label it UTC, so scheduling is unambiguous in v1.
export function fmtUTC(iso: string | null | undefined): string {
  if (!iso) return "—";
  return (
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "UTC",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) + " UTC"
  );
}
