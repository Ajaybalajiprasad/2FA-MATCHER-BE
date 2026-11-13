import { hotelRepository } from '../repositories/HotelRepository';
import { quoteRoom } from '../utils/costCalculator';
import { nightDates as listNightDates } from '../utils/dateUtils';

export type HotelSort = 'price' | 'rating' | 'stars';

export interface HotelOptionsQuery {
  city: string;
  checkIn: string;
  checkOut: string;
  members: number;
  sort?: HotelSort;
  minStars?: number;
  onlyAvailable?: boolean;
  page?: number;
  limit?: number;
}

export interface HotelOption {
  hotelId: string;
  hotelName: string;
  area: string;
  rating: number;
  stars: number;
  image: string;
  roomId: string;
  roomName: string;
  roomType: string;
  maxAdults: number;
  pricePerNightInr: number;
  rooms: number;
  nights: number;
  totalInr: number;
  perMemberInr: number;
  available: boolean;
  minRoomsLeft: number;
  refundable: boolean;
}

export interface HotelOptionsResult {
  nights: number;
  nightDates: string[];
  members: number;
  total: number;
  page: number;
  limit: number;
  options: HotelOption[];
}

const PRIMARY_ORDER: Record<HotelSort, (a: HotelOption, b: HotelOption) => number> = {
  price: (a, b) => a.totalInr - b.totalInr,
  rating: (a, b) => b.rating - a.rating || a.totalInr - b.totalInr,
  stars: (a, b) => b.stars - a.stars || a.totalInr - b.totalInr,
};

const byIds = (a: HotelOption, b: HotelOption) =>
  a.hotelId.localeCompare(b.hotelId) || a.roomId.localeCompare(b.roomId);

export class HotelService {
  async getOptions({
    city,
    checkIn,
    checkOut,
    members,
    sort = 'price',
    minStars,
    onlyAvailable = true,
    page = 1,
    limit = 20,
  }: HotelOptionsQuery): Promise<HotelOptionsResult> {
    const dates = listNightDates(checkIn, checkOut);
    const nights = dates.length;

    const hotels = (await hotelRepository.findHotelsByCity(city)).filter((h) => minStars === undefined || h.stars >= minStars);
    const hotelById = new Map(hotels.map((h) => [h.id, h]));
    const rooms = await hotelRepository.findRoomsByHotelIds([...hotelById.keys()]);
    const availability = await hotelRepository.findAvailability(
      rooms.map((r) => r.id),
      dates
    );
    const roomsLeft = new Map(availability.map((a) => [`${a.roomId}|${a.date}`, a.roomsLeft]));

    const options = rooms
      .map((room): HotelOption => {
        const hotel = hotelById.get(room.hotelId)!;
        const quote = quoteRoom({
          pricePerNightInr: room.pricePerNightInr,
          maxAdults: room.maxAdults,
          roomsLeftByNight: dates.map((d) => roomsLeft.get(`${room.id}|${d}`)),
          nights,
          members,
        });
        return {
          hotelId: hotel.id,
          hotelName: hotel.name,
          area: hotel.area,
          rating: hotel.rating,
          stars: hotel.stars,
          image: hotel.image,
          roomId: room.id,
          roomName: room.name,
          roomType: room.roomType,
          maxAdults: room.maxAdults,
          pricePerNightInr: room.pricePerNightInr,
          nights,
          refundable: room.refundable,
          ...quote,
        };
      })
      .filter((o) => !onlyAvailable || o.available)
      .sort((a, b) => PRIMARY_ORDER[sort](a, b) || byIds(a, b));

    return {
      nights,
      nightDates: dates,
      members,
      total: options.length,
      page,
      limit,
      options: options.slice((page - 1) * limit, page * limit),
    };
  }
}

export const hotelService = new HotelService();
