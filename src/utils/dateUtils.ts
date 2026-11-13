// Dates are local city dates; parsing as UTC keeps day math independent of the server timezone.
import { DATE_WINDOW } from '../config/businessRules';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const toUtcMs = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const fromUtcMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const isValidIsoDate = (date: string): boolean =>
  ISO_DATE.test(date) && fromUtcMs(toUtcMs(date)) === date;

export const daysBetween = (from: string, to: string): number => Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);

export const addDays = (date: string, days: number): string => fromUtcMs(toUtcMs(date) + days * DAY_MS);

// The check-out day is not a night.
export const nights = (checkIn: string, checkOut: string): number => Math.max(0, daysBetween(checkIn, checkOut));

export const nightDates = (checkIn: string, checkOut: string): string[] =>
  Array.from({ length: nights(checkIn, checkOut) }, (_, i) => addDays(checkIn, i));

export interface SharedNights {
  count: number;
  firstNight: string | null;
  lastNight: string | null;
}

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

export const isStayInDataWindow = (checkIn: string, checkOut: string): boolean =>
  checkIn >= DATE_WINDOW.FIRST_CHECK_IN && checkOut <= DATE_WINDOW.LAST_CHECK_OUT && checkOut > checkIn;
