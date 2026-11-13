import { describe, expect, it } from 'vitest';
import { quoteRoom, roomsNeeded } from '../costCalculator';

// Worked example from DATA_DICTIONARY.md: RM-KYO-001-A for G-01, 10 to 15 April.
const twinRoom = { pricePerNightInr: 4760, maxAdults: 2, roomsLeftByNight: [6, 2, 4, 3, 3], nights: 5 };

describe('costCalculator', () => {
  it('rounds rooms up', () => {
    expect(roomsNeeded(2, 2)).toBe(1);
    expect(roomsNeeded(3, 2)).toBe(2);
    expect(roomsNeeded(1, 3)).toBe(1);
  });

  it('matches the worked example: 1 room, 23800 total, 11900 each', () => {
    expect(quoteRoom({ ...twinRoom, members: 2 })).toEqual({
      rooms: 1,
      totalInr: 23800,
      perMemberInr: 11900,
      available: true,
      minRoomsLeft: 2,
    });
  });

  it('needs 2 twin rooms for 3 members', () => {
    const quote = quoteRoom({ ...twinRoom, members: 3 });
    expect(quote.rooms).toBe(2);
    expect(quote.totalInr).toBe(47600);
    expect(quote.perMemberInr).toBe(15866.67);
    expect(quote.available).toBe(true);
  });

  it('is unavailable when one night has 0 rooms', () => {
    const quote = quoteRoom({ ...twinRoom, roomsLeftByNight: [6, 0, 4, 3, 3], members: 2 });
    expect(quote.available).toBe(false);
    expect(quote.minRoomsLeft).toBe(0);
  });

  it('is unavailable when a night record is missing', () => {
    expect(quoteRoom({ ...twinRoom, roomsLeftByNight: [6, undefined, 4, 3, 3], members: 2 }).available).toBe(false);
    expect(quoteRoom({ ...twinRoom, roomsLeftByNight: [6, 4, 3, 3], members: 2 }).available).toBe(false);
  });

  it('is unavailable when fewer rooms are left than needed', () => {
    expect(quoteRoom({ ...twinRoom, roomsLeftByNight: [6, 1, 4, 3, 3], members: 3 }).available).toBe(false);
  });
});
