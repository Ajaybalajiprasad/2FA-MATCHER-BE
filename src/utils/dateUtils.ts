/**
 * Plain-date math on 'YYYY-MM-DD' strings.
 * Dates in the data are local dates of the destination city (DATA_DICTIONARY section 5),
 * so we parse them as UTC midnight: day arithmetic never shifts with the server timezone.
 */
import { DATE_WINDOW } from '../config/businessRules';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const toUtcMs = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const fromUtcMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** True for a real calendar date in 'YYYY-MM-DD' form (rejects 2027-02-30). */
export const isValidIsoDate = (date: string): boolean =>
  ISO_DATE.test(date) && fromUtcMs(toUtcMs(date)) === date;

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export const daysBetween = (from: string, to: string): number => Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);

export const addDays = (date: string, days: number): string => fromUtcMs(toUtcMs(date) + days * DAY_MS);

/** Nights of a stay. The check_out day is not a night: 10 → 15 April = 5 nights. */
export const nights = (checkIn: string, checkOut: string): number => Math.max(0, daysBetween(checkIn, checkOut));

/** The night dates of a stay: 10 → 13 April = ['…-10', '…-11', '…-12']. */
export const nightDates = (checkIn: string, checkOut: string): string[] =>
  Array.from({ length: nights(checkIn, checkOut) }, (_, i) => addDays(checkIn, i));

export interface SharedNights {
  count: number;
  /** First and last shared night, or null when there is no overlap. */
  firstNight: string | null;
  lastNight: string | null;
}

/** Nights that are in both stays: 10→15 and 14→18 share 1 night (14 April). */
export const sharedNights = (
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string }
): SharedNights => {
  const start = a.checkIn > b.checkIn ? a.checkIn : b.checkIn;
  const end = a.checkOut < b.checkOut ? a.checkOut : b.checkOut;
  const count = nights(start, end);
  return count > 0
    ? { count, firstNight: start, lastNight: addDays(end, -1) }
    : { count: 0, firstNight: null, lastNight: null };
};

/** Stay lies inside the data window (check_in ≥ 1 Apr, check_out ≤ 20 Apr 2027) and has ≥ 1 night. */
export const isStayInDataWindow = (checkIn: string, checkOut: string): boolean =>
  checkIn >= DATE_WINDOW.FIRST_CHECK_IN && checkOut <= DATE_WINDOW.LAST_CHECK_OUT && checkOut > checkIn;
