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
