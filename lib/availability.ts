import { DateTime } from "luxon";

// A break between consecutive sessions, so the teacher isn't booked back-to-back.
export const BREAK_MINUTES = 15;

export type Rule = {
  id: string;
  instructor_id: string;
  weekday: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // "HH:MM[:SS]"
  end_time: string;
  slot_minutes: number;
};

export type DesiredSlot = {
  instructor_id: string;
  starts_at: string; // UTC ISO
  duration_minutes: number;
  source_rule_id: string;
};

// JS weekday (0=Sun) → luxon weekday (1=Mon … 7=Sun).
const toLuxonWeekday = (jsDay: number) => (jsDay === 0 ? 7 : jsDay);
const parseHM = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return { hour: h, minute: m || 0 };
};

/**
 * Expand recurring weekly rules into concrete UTC slot instants over a rolling
 * horizon, interpreting rule times in the tenant's timezone and skipping
 * blocked exception dates and any slot in the past.
 */
export function expandSlots(opts: {
  rules: Rule[];
  exceptionDates: Set<string>; // "yyyy-MM-dd" in tenant tz
  timezone: string;
  horizonWeeks: number;
  breakMinutes?: number;
  now?: DateTime;
}): DesiredSlot[] {
  const { rules, exceptionDates, timezone, horizonWeeks } = opts;
  const brk = opts.breakMinutes ?? BREAK_MINUTES;
  const now = (opts.now ?? DateTime.now()).setZone(timezone);
  if (!now.isValid) return [];
  const startDay = now.startOf("day");
  const horizonEnd = startDay.plus({ weeks: horizonWeeks });
  const out: DesiredSlot[] = [];

  for (let day = startDay; day < horizonEnd; day = day.plus({ days: 1 })) {
    const isoDate = day.toFormat("yyyy-MM-dd");
    if (exceptionDates.has(isoDate)) continue;
    for (const r of rules) {
      if (toLuxonWeekday(r.weekday) !== day.weekday) continue;
      const s = parseHM(r.start_time);
      const e = parseHM(r.end_time);
      let t = day.set({ hour: s.hour, minute: s.minute, second: 0, millisecond: 0 });
      const end = day.set({ hour: e.hour, minute: e.minute, second: 0, millisecond: 0 });
      // Step by session length + the configured break before the next slot.
      for (; t.plus({ minutes: r.slot_minutes }) <= end; t = t.plus({ minutes: r.slot_minutes + brk })) {
        if (t <= now) continue;
        out.push({
          instructor_id: r.instructor_id,
          starts_at: t.toUTC().toISO()!,
          duration_minutes: r.slot_minutes,
          source_rule_id: r.id,
        });
      }
    }
  }
  return out;
}

export const WEEKDAY_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** How many sessions a single weekly rule yields (session + break spacing). */
export function sessionsPerRule(startHM: string, endHM: string, slotMin: number, breakMin: number): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const start = toMin(startHM);
  const end = toMin(endHM);
  let n = 0;
  for (let t = start; t + slotMin <= end; t += slotMin + breakMin) n++;
  return n;
}
