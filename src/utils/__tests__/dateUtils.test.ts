import { describe, expect, it } from 'vitest';
import { isStayInDataWindow, isValidIsoDate, nightDates, nights, sharedNights } from '../dateUtils';

describe('dateUtils', () => {
  it('counts nights without the check-out day (DATA_DICTIONARY §5)', () => {
    expect(nights('2027-04-10', '2027-04-15')).toBe(5);
    expect(nightDates('2027-04-10', '2027-04-13')).toEqual(['2027-04-10', '2027-04-11', '2027-04-12']);
  });

  it('Sarah 10→15 and Priya 9→16 share 5 nights (10–14 Apr)', () => {
    expect(
      sharedNights({ checkIn: '2027-04-10', checkOut: '2027-04-15' }, { checkIn: '2027-04-09', checkOut: '2027-04-16' })
    ).toEqual({ count: 5, firstNight: '2027-04-10', lastNight: '2027-04-14' });
  });

  it('10→15 and 14→18 share 1 night (14 Apr)', () => {
    expect(
      sharedNights({ checkIn: '2027-04-10', checkOut: '2027-04-15' }, { checkIn: '2027-04-14', checkOut: '2027-04-18' })
        .count
    ).toBe(1);
  });

  it('back-to-back stays share 0 nights', () => {
    expect(
      sharedNights({ checkIn: '2027-04-10', checkOut: '2027-04-15' }, { checkIn: '2027-04-15', checkOut: '2027-04-18' })
    ).toEqual({ count: 0, firstNight: null, lastNight: null });
  });

  it('validates dates and the data window', () => {
    expect(isValidIsoDate('2027-04-10')).toBe(true);
    expect(isValidIsoDate('2027-02-30')).toBe(false);
    expect(isStayInDataWindow('2027-04-01', '2027-04-20')).toBe(true);
    expect(isStayInDataWindow('2027-03-31', '2027-04-05')).toBe(false);
    expect(isStayInDataWindow('2027-04-18', '2027-04-21')).toBe(false);
    expect(isStayInDataWindow('2027-04-10', '2027-04-10')).toBe(false);
  });
});
