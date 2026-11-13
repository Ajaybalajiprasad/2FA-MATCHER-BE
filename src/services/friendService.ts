import { AppError } from '../middleware/errorHandler';
import { friendRepository, type Friendship } from '../repositories/FriendRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import { newId } from '../utils/id';
import { travellerService } from './travellerService';

const conflict = () => new AppError('This friendship changed. Refresh and try again.', 409, ErrorCode.CONFLICT);
const otherId = (row: Friendship, userId: string) =>
  row.travellerAId === userId ? row.travellerBId : row.travellerAId;

export class FriendService {
  async list(userId: string) {
    const rows = await friendRepository.list(userId);
    const people = await travellerRepository.findByIds(rows.map((row) => otherId(row, userId)));
    const byId = new Map(people.map((person) => [person.id, person]));
    const entries = rows.map((row) => ({
      id: row.id,
      traveller: byId.get(otherId(row, userId))!,
      createdAt: row.createdAt,
      acceptedAt: row.acceptedAt,
      status: row.status,
      requesterId: row.requesterId,
    }));
    return {
      friends: entries.filter((row) => row.status === 'ACCEPTED'),
      incoming: entries.filter((row) => row.status === 'PENDING' && row.requesterId !== userId),
      outgoing: entries.filter((row) => row.status === 'PENDING' && row.requesterId === userId),
    };
  }

  async relationship(userId: string, targetId: string) {
    await travellerService.getById(targetId);
    if (userId === targetId) return { status: 'SELF' as const, requestId: null };
    const row = await friendRepository.findPair(userId, targetId);
    if (!row) return { status: 'NONE' as const, requestId: null };
    const status = row.status === 'ACCEPTED' ? 'FRIENDS' : row.requesterId === userId ? 'OUTGOING' : 'INCOMING';
    return { status, requestId: row.id };
  }

  async request(userId: string, targetId: string) {
    if (userId === targetId)
      throw new AppError('You cannot add yourself as a friend', 400, ErrorCode.VALIDATION_FAILED);
    await travellerService.getById(targetId);
    const row = await friendRepository.request(userId, targetId, newId('F'));
    if (!row) throw new AppError('You are already friends or a request is pending', 409, ErrorCode.CONFLICT);
    return { id: row.id, status: 'OUTGOING', requestId: row.id };
  }

  private async pendingFor(id: string, userId: string) {
    const row = await friendRepository.findById(id);
    if (!row || (row.travellerAId !== userId && row.travellerBId !== userId)) {
      throw new AppError('Friend request not found', 404, ErrorCode.NOT_FOUND);
    }
    if (row.status !== 'PENDING') throw conflict();
    return row;
  }

  async accept(userId: string, id: string) {
    const row = await this.pendingFor(id, userId);
    if (row.requesterId === userId)
      throw new AppError('Only the recipient can accept this request', 403, ErrorCode.FORBIDDEN);
    if (!(await friendRepository.accept(id))) throw conflict();
    return { status: 'FRIENDS', requestId: id };
  }

  async dismiss(userId: string, id: string) {
    await this.pendingFor(id, userId);
    if (!(await friendRepository.remove(id, 'PENDING'))) throw conflict();
    return { status: 'NONE', requestId: null };
  }

  async remove(userId: string, targetId: string) {
    const row = await friendRepository.findPair(userId, targetId);
    if (!row || row.status !== 'ACCEPTED') throw new AppError('Friendship not found', 404, ErrorCode.NOT_FOUND);
    if (!(await friendRepository.remove(row.id, 'ACCEPTED'))) throw conflict();
    return { status: 'NONE', requestId: null };
  }
}

export const friendService = new FriendService();
