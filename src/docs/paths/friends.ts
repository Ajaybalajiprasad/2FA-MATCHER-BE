import { friendRequestSchema } from '../../validators/friendValidators';
import { asUser, jsonBody, ok, pathParam } from '../helpers';

const errors = {
  401: ok('Missing or unknown traveller identity'),
  404: ok('Traveller or request not found'),
  409: ok('Duplicate request or relationship already changed'),
};
export const friendPaths = {
  '/api/friends': {
    get: {
      tags: ['Friends'],
      summary: 'Current traveller’s accepted friends, incoming requests and outgoing requests',
      security: asUser,
      responses: {
        200: ok(
          'Object with friends, incoming and outgoing arrays; each entry has id, traveller, status, requesterId, createdAt and acceptedAt',
        ),
        401: errors[401],
      },
    },
  },
  '/api/friends/relationship/{travellerId}': {
    get: {
      tags: ['Friends'],
      summary: 'Current traveller’s relationship with another traveller',
      security: asUser,
      parameters: [pathParam('travellerId', 'T-002')],
      responses: {
        200: ok('status: SELF, NONE, OUTGOING, INCOMING or FRIENDS; requestId is null or a friendship ID'),
        ...errors,
      },
    },
  },
  '/api/friends/requests': {
    post: {
      tags: ['Friends'],
      summary: 'Send a mutual friend request; cannot add yourself or duplicate a pair',
      security: asUser,
      requestBody: jsonBody(friendRequestSchema, { travellerId: 'T-002' }),
      responses: {
        201: ok('OUTGOING relationship with requestId'),
        400: ok('Invalid body or self-request'),
        ...errors,
      },
    },
  },
  '/api/friends/requests/{id}/accept': {
    post: {
      tags: ['Friends'],
      summary: 'Accept a pending request (recipient only)',
      security: asUser,
      parameters: [pathParam('id', 'F-example')],
      responses: { 200: ok('FRIENDS relationship'), 403: ok('Sender cannot accept their own request'), ...errors },
    },
  },
  '/api/friends/requests/{id}': {
    delete: {
      tags: ['Friends'],
      summary: 'Decline an incoming request or cancel an outgoing request (participants only)',
      security: asUser,
      parameters: [pathParam('id', 'F-example')],
      responses: { 200: ok('NONE relationship'), ...errors },
    },
  },
  '/api/friends/{travellerId}': {
    delete: {
      tags: ['Friends'],
      summary: 'Remove an accepted friendship for both people; group membership is unchanged',
      security: asUser,
      parameters: [pathParam('travellerId', 'T-002')],
      responses: { 200: ok('NONE relationship'), ...errors },
    },
  },
};
