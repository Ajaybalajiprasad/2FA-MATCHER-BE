import { messageBodySchema } from '../../validators/messageValidators';
import { asUser, jsonBody, ok, pathParam } from '../helpers';

const memberOnly = { 401: ok('Missing or invalid token'), 403: ok('Caller is not a group member'), 404: ok('Group not found') };

export const messagePaths = {
  '/api/groups/{id}/messages': {
    get: {
      tags: ['Group Page'],
      summary: 'Group chat messages, oldest first, with author (S1)',
      security: asUser,
      parameters: [
        pathParam('id', 'G-01'),
        { name: 'after', in: 'query', required: false, schema: { type: 'string', format: 'date-time' }, description: 'Only messages created after this ISO timestamp (polling). Without it, the latest `limit` messages.' },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 }, description: 'Max messages' },
      ],
      responses: { 200: ok('Messages with id, groupId, body, createdAt and author { id, name }'), 400: ok('Invalid query'), ...memberOnly },
    },
    post: {
      tags: ['Group Page'],
      summary: 'Post a chat message (any member, also after booking)',
      security: asUser,
      parameters: [pathParam('id', 'G-01')],
      requestBody: jsonBody(messageBodySchema, { body: 'Shall we pick the ryokan?' }),
      responses: { 201: ok('Created message'), 400: ok('Body empty or over 1000 characters'), ...memberOnly },
    },
  },
};
