// Only the seed reads the data pack; the API reads the database.
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import type {
  Availability,
  DestinationsFile,
  Hotel,
  Interest,
  Room,
  SeedGroup,
  SeedTraveller,
} from '../types/catalog.types';

const readJson = <T>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(env.DATA_DIR, relativePath), 'utf-8')) as T;

export const readDataPack = () => ({
  destinations: readJson<DestinationsFile>('catalog/destinations.json'),
  interests: readJson<Interest[]>('problem-3/interests.json'),
  hotels: readJson<Hotel[]>('catalog/hotels.json'),
  rooms: readJson<Room[]>('catalog/rooms.json'),
  availability: readJson<Availability[]>('catalog/availability.json'),
  travellers: readJson<SeedTraveller[]>('problem-3/travellers.json'),
  groups: readJson<SeedGroup[]>('problem-3/groups.json'),
});
