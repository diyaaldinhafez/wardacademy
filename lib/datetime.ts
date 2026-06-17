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
