export interface RoomQuoteInput {
  pricePerNightInr: number;
  maxAdults: number;
  roomsLeftByNight: (number | undefined)[];
  nights: number;
  members: number;
}

export interface RoomQuote {
  rooms: number;
  totalInr: number;
  perMemberInr: number;
  available: boolean;
  minRoomsLeft: number;
}

export const roomsNeeded = (members: number, maxAdults: number): number => Math.ceil(members / maxAdults);

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const quoteRoom = ({ pricePerNightInr, maxAdults, roomsLeftByNight, nights, members }: RoomQuoteInput): RoomQuote => {
  const rooms = roomsNeeded(members, maxAdults);
  const totalInr = pricePerNightInr * rooms * nights;
  // A missing night record counts as 0 free rooms.
  const minRoomsLeft = roomsLeftByNight.length ? Math.min(...roomsLeftByNight.map((r) => r ?? 0)) : 0;
  const available = roomsLeftByNight.length === nights && nights > 0 && minRoomsLeft >= rooms;
  return { rooms, totalInr, perMemberInr: round2(totalInr / members), available, minRoomsLeft };
};
