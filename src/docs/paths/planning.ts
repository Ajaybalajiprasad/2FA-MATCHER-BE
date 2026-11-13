import { roomIdBodySchema } from '../../validators/planningValidators';
import { asUser, jsonBody, ok, pathParam } from '../helpers';

const queryParam = (name: string, schema: object, description: string) => ({ name, in: 'query', required: false, schema, description });

const memberOnly = { 401: ok('Missing or unknown X-User-Id'), 403: ok('Caller is not a group member'), 404: ok('Group not found') };

export const planningPaths = {
  '/api/groups/{id}/hotels': {
    get: {
      tags: ['Group Page'],
      summary: 'Hotel options for the group’s city and dates with per-member cost (M6)',
      security: asUser,
      parameters: [
        pathParam('id', 'G-01'),
        queryParam('sort', { type: 'string', enum: ['price', 'rating', 'stars'], default: 'price' }, 'Sort order'),
        queryParam('minStars', { type: 'integer', minimum: 1, maximum: 5 }, 'Minimum hotel stars'),
        queryParam('page', { type: 'integer', minimum: 1, default: 1 }, 'Page'),
        queryParam('limit', { type: 'integer', minimum: 1, maximum: 50, default: 20 }, 'Page size'),
        queryParam('preview', { type: 'string', enum: ['full'] }, 'Split for maxSize members instead of the current count'),
      ],
      responses: { 200: ok('Options with rooms, totalInr, perMemberInr and membersUsed'), ...memberOnly },
    },
  },
  '/api/groups/{id}/saved': {
    get: {
      tags: ['Group Page'],
      summary: 'Saved options grouped by room with savedBy and alignment, re-priced for the current member count',
      security: asUser,
      parameters: [pathParam('id', 'G-01')],
      responses: { 200: ok('Saved options, most-saved first'), ...memberOnly },
    },
    post: {
      tags: ['Group Page'],
      summary: 'Save a room option for the caller',
      security: asUser,
      parameters: [pathParam('id', 'G-01')],
      requestBody: jsonBody(roomIdBodySchema, { roomId: 'RM-KYO-001-A' }),
      responses: {
        201: ok('Saved option with server-side quote'),
        400: ok('Room not in the group’s city'),
        409: ok('Already saved, room unavailable, or group already booked'),
        ...memberOnly,
      },
    },
  },
  '/api/groups/{id}/saved/{roomId}': {
    delete: {
      tags: ['Group Page'],
      summary: 'Remove the caller’s saved option',
      security: asUser,
      parameters: [pathParam('id', 'G-01'), pathParam('roomId', 'RM-KYO-001-A')],
      responses: { 200: ok('Removed'), 409: ok('Group already booked'), ...memberOnly, 404: ok('Group or saved option not found') },
    },
  },
  '/api/groups/{id}/booking': {
    get: {
      tags: ['Group Page'],
      summary: 'The group’s booking with hotel, room and per-member split',
      security: asUser,
      parameters: [pathParam('id', 'G-01')],
      responses: { 200: ok('Booking'), ...memberOnly, 404: ok('Group or booking not found') },
    },
    post: {
      tags: ['Group Page'],
      summary: 'Finalize the booking (any member). Locks the group as BOOKED.',
      security: asUser,
      parameters: [pathParam('id', 'G-01')],
      requestBody: jsonBody(roomIdBodySchema, { roomId: 'RM-KYO-001-A' }),
      responses: {
        201: ok('Booking with BK- id, totalInr and perMemberInr'),
        400: ok('Room not in the group’s city'),
        409: ok('Group already booked, or room unavailable'),
        ...memberOnly,
      },
    },
  },
};
