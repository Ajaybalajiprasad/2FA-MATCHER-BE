import { type Message, messageRepository } from '../repositories/MessageRepository';
import { travellerRepository } from '../repositories/TravellerRepository';
import { newId } from '../utils/id';
import type { MessagesQuery } from '../validators/messageValidators';
import { groupService } from './groupService';

export class MessageService {
  async list(groupId: string, travellerId: string, { after, limit }: MessagesQuery) {
    await groupService.getForMember(groupId, travellerId);
    const rows = after
      ? await messageRepository.findAfter(groupId, after, limit)
      : await messageRepository.findLatest(groupId, limit);
    return this.withAuthors(rows);
  }

  async post(groupId: string, travellerId: string, body: string) {
    await groupService.getForMember(groupId, travellerId);
    // ms precision so a client's `after` (from a JS Date) never re-matches the same row
    const createdAt = new Date();
    const message = await messageRepository.insert({ id: newId('M'), groupId, authorId: travellerId, body, createdAt });
    const [result] = await this.withAuthors([message]);
    return result;
  }

  private async withAuthors(rows: Message[]) {
    const authors = await travellerRepository.findByIds([...new Set(rows.map((m) => m.authorId))]);
    const nameById = new Map(authors.map((t) => [t.id, t.name]));
    return rows.map(({ authorId, ...m }) => ({ ...m, author: { id: authorId, name: nameById.get(authorId) ?? null } }));
  }
}

export const messageService = new MessageService();
