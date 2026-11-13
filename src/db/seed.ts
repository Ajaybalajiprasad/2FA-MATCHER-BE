// Seeds once, when the DB is empty, so restarts never overwrite app data.
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from './index';
import {
  cities,
  groupMembers,
  groups,
  homeCities,
  hotels,
  interests,
  roomAvailability,
  rooms,
  travellerInterests,
  travellers,
} from './schema';
import { readDataPack } from './dataPack';
import { env } from '../config/env';
import { hashPassword } from '../utils/auth';
import logger from '../utils/logger';

export const demoEmail = (travellerId: string) => `${travellerId.toLowerCase()}@demo.travel`;

export const isDatabaseSeeded = async (db: Database): Promise<boolean> => {
  const [row] = await db.select({ n: count() }).from(interests);
  return (row?.n ?? 0) > 0;
};

export const seedDatabase = async (db: Database): Promise<void> => {
  const pack = readDataPack();

  await db.transaction(async (tx) => {
    await tx.insert(interests).values(
      pack.interests.map((i, idx) => ({ id: i.interest, label: i.label, category: i.category, sortOrder: idx }))
    );

    await tx.insert(cities).values(
      pack.destinations.countries
        .flatMap((country) =>
          country.cities.map((city) => ({
            name: city.name,
            country: country.name,
            countryCode: country.code,
            timezone: country.timezone,
          }))
        )
        .map((city, idx) => ({ ...city, sortOrder: idx }))
    );

    await tx.insert(homeCities).values(
      pack.destinations.departure_cities.map((d, idx) => ({ airport: d.airport, city: d.city, sortOrder: idx }))
    );

    await tx.insert(hotels).values(
      pack.hotels.map((h) => ({
        id: h.hotel_id,
        name: h.name,
        aliases: h.aliases,
        city: h.city,
        area: h.area,
        lat: h.lat,
        lng: h.lng,
        rating: h.rating,
        stars: h.stars,
        checkInFrom: h.check_in_from,
        checkOutUntil: h.check_out_until,
        familyFriendly: h.family_friendly,
        image: h.image,
      }))
    );

    await tx.insert(rooms).values(
      pack.rooms.map((r) => ({
        id: r.room_id,
        hotelId: r.hotel_id,
        roomType: r.room_type,
        name: r.name,
        maxAdults: r.max_adults,
        maxChildren: r.max_children,
        pricePerNightInr: r.price_per_night.amount,
        currency: r.price_per_night.currency,
        refundable: r.refundable,
      }))
    );

    await tx
      .insert(roomAvailability)
      .values(pack.availability.map((a) => ({ roomId: a.room_id, date: a.date, roomsLeft: a.rooms_left })));

    // One hash shared by all demo accounts: scrypt per traveller would slow every seed.
    const demoHash = hashPassword(env.DEMO_PASSWORD);
    await tx.insert(travellers).values(
      pack.travellers.map((t) => ({
        id: t.traveller_id,
        name: t.name,
        age: t.age,
        gender: t.gender,
        homeCity: t.home_city,
        homeAirport: t.home_airport,
        genderPreference: t.gender_preference,
        isSeed: true,
        email: demoEmail(t.traveller_id),
        passwordHash: demoHash,
      }))
    );

    await tx.insert(travellerInterests).values(
      pack.travellers.flatMap((t) =>
        t.interests.map((interestId, idx) => ({ travellerId: t.traveller_id, interestId, sortOrder: idx }))
      )
    );

    await tx.insert(groups).values(
      pack.groups.map((g) => ({
        id: g.group_id,
        name: g.name,
        ownerId: g.owner_id,
        city: g.city,
        checkIn: g.check_in,
        checkOut: g.check_out,
        maxSize: g.max_size,
        budgetInr: g.budget_inr,
        itinerary: g.itinerary,
        genderPreference: pack.travellers.find((t) => t.traveller_id === g.owner_id)?.gender_preference ?? 'ANY',
      }))
    );

    await tx
      .insert(groupMembers)
      .values(pack.groups.flatMap((g) => g.member_ids.map((travellerId) => ({ groupId: g.group_id, travellerId }))));
  });

  logger.info(
    `Seeded: ${pack.interests.length} interests, ${pack.hotels.length} hotels, ${pack.rooms.length} rooms, ` +
      `${pack.availability.length} availability rows, ${pack.travellers.length} travellers, ${pack.groups.length} groups`
  );
};

export const seedIfEmpty = async (db: Database): Promise<void> => {
  if (await isDatabaseSeeded(db)) {
    logger.info('Database already seeded, skipping');
    await backfillDemoLogins(db);
    return;
  }
  await seedDatabase(db);
};

// Databases seeded before sign-in existed get demo logins for their seeded travellers.
const backfillDemoLogins = async (db: Database): Promise<void> => {
  const updated = await db
    .update(travellers)
    .set({ email: sql`lower(${travellers.id}) || '@demo.travel'`, passwordHash: hashPassword(env.DEMO_PASSWORD) })
    .where(and(eq(travellers.isSeed, true), isNull(travellers.passwordHash)))
    .returning({ id: travellers.id });
  if (updated.length) logger.info(`Added demo logins for ${updated.length} seeded travellers`);
};
