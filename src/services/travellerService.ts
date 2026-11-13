import { env } from '../config/env';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { catalogRepository } from '../repositories/CatalogRepository';
import { groupRepository } from '../repositories/GroupRepository';
import { friendRepository } from '../repositories/FriendRepository';
import { TravellerRepository, travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import type { Traveller } from '../types/traveller.types';
import { newId } from '../utils/id';
import { hashPassword, signToken, verifyPassword } from '../utils/auth';
import type { SignInInput, SignUpInput } from '../validators/travellerValidators';

export class TravellerService {
  async assertKnownInterests(interests: string[]): Promise<void> {
    const unknown = await catalogRepository.findUnknownInterests(interests);
    if (unknown.length > 0) {
      throw new AppError(`Unknown interests: ${unknown.join(', ')}`, 400, ErrorCode.VALIDATION_FAILED);
    }
  }

  async signUp(input: SignUpInput): Promise<Traveller & { token: string }> {
    const interests = [...new Set(input.interests)];
    await this.assertKnownInterests(interests);
    if (await travellerRepository.findCredentialsByEmail(input.email)) {
      throw new AppError('An account with this email already exists', 409, ErrorCode.CONFLICT);
    }

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
    const credentials = { email: input.email, passwordHash: hashPassword(input.password) };
    await db.transaction((tx) => new TravellerRepository(tx).create(traveller, credentials));
    return { ...traveller, token: signToken(traveller.id) };
  }

  async signIn({ email, password }: SignInInput): Promise<Traveller & { token: string }> {
    const credentials = await travellerRepository.findCredentialsByEmail(email);
    if (!credentials || !verifyPassword(password, credentials.passwordHash)) {
      throw new AppError('Wrong email or password', 401, ErrorCode.UNAUTHORIZED);
    }
    return { ...(await this.getById(credentials.id)), token: signToken(credentials.id) };
  }

  private assertDemoSwitch(): void {
    if (env.DEMO_SWITCH !== 'true') throw new AppError('Demo switching is turned off', 403, ErrorCode.FORBIDDEN);
  }

  async listDemo() {
    this.assertDemoSwitch();
    return travellerRepository.findSeeded();
  }

  // Demo only: seeded travellers can be entered without a password. Real accounts cannot.
  async demoSignIn(id: string): Promise<Traveller & { token: string }> {
    this.assertDemoSwitch();
    if (!(await travellerRepository.findSeeded()).some((t) => t.id === id)) {
      throw new AppError('Only seeded demo travellers can be switched to', 403, ErrorCode.FORBIDDEN);
    }
    return { ...(await this.getById(id)), token: signToken(id) };
  }

  list(): Promise<Traveller[]> {
    return travellerRepository.findAll();
  }

  async getById(id: string): Promise<Traveller> {
    const traveller = await travellerRepository.findById(id);
    if (!traveller) throw new AppError('Traveller not found', 404, ErrorCode.NOT_FOUND);
    return traveller;
  }

  async getProfile(id: string, viewerId?: string) {
    const traveller = await this.getById(id);
    const friendship = viewerId && viewerId !== id ? await friendRepository.findPair(viewerId, id) : undefined;
    const canViewGroups = viewerId === id || friendship?.status === 'ACCEPTED';
    // Basic profiles remain discoverable. Never fetch or return group details to non-friends.
    if (!canViewGroups) return { ...traveller, canViewGroups: false, groups: [] };
    const groups = await groupRepository.findByMember(id);
    const counts = await groupRepository.memberCounts(groups.map((g) => g.id));
    return {
      ...traveller,
      canViewGroups: true,
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
