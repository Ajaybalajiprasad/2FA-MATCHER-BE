import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { catalogRepository } from '../repositories/CatalogRepository';
import { groupRepository } from '../repositories/GroupRepository';
import { TravellerRepository, travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import type { Traveller } from '../types/traveller.types';
import { newId } from '../utils/id';
import type { SignUpInput } from '../validators/travellerValidators';

export class TravellerService {
  async assertKnownInterests(interests: string[]): Promise<void> {
    const unknown = await catalogRepository.findUnknownInterests(interests);
    if (unknown.length > 0) {
      throw new AppError(`Unknown interests: ${unknown.join(', ')}`, 400, ErrorCode.VALIDATION_FAILED);
    }
  }

  async signUp(input: SignUpInput): Promise<Traveller> {
    const interests = [...new Set(input.interests)];
    await this.assertKnownInterests(interests);

    const traveller: Traveller = {
      id: newId('T'),
      name: input.name,
      age: input.age ?? null,
      gender: input.gender,
      homeCity: input.homeCity,
      homeAirport: input.homeAirport ?? null,
      genderPreference: input.genderPreference,
      interests,
    };
    await db.transaction((tx) => new TravellerRepository(tx).create(traveller));
    return traveller;
  }

  list(): Promise<Traveller[]> {
    return travellerRepository.findAll();
  }

  async getById(id: string): Promise<Traveller> {
    const traveller = await travellerRepository.findById(id);
    if (!traveller) throw new AppError('Traveller not found', 404, ErrorCode.NOT_FOUND);
    return traveller;
  }

  async getProfile(id: string) {
    const traveller = await this.getById(id);
    const groups = await groupRepository.findByMember(id);
    const counts = await groupRepository.memberCounts(groups.map((g) => g.id));
    return {
      ...traveller,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        city: g.city,
        checkIn: g.checkIn,
        checkOut: g.checkOut,
        status: g.status,
        role: g.ownerId === id ? ('OWNER' as const) : ('MEMBER' as const),
        memberCount: counts.get(g.id) ?? 0,
        maxSize: g.maxSize,
      })),
    };
  }
}

export const travellerService = new TravellerService();
