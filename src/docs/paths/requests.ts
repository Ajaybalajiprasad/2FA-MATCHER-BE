import { createRequestSchema, decideRequestSchema } from '../../validators/requestValidators';
import { asUser, jsonBody, ok, pathParam } from '../helpers';

export const requestPaths = {
  '/api/groups/{id}/requests': {
    post: {
      tags: ['Requests'],
      summary: 'Express interest in a group (M5). The server re-checks all 6 rules against the saved search.',
      security: asUser,
      parameters: [pathParam('id', 'G-01')],
      requestBody: jsonBody(createRequestSchema, { searchId: 'S-0123456789ab' }),
      responses: {
        201: ok('PENDING join request'),
        400: ok('Validation failed'),
        401: ok('Missing or unknown X-User-Id'),
        403: ok('Search belongs to another traveller'),
        404: ok('Group or search not found'),
        409: ok('Already a member, group not open, or a request already exists (details.status)'),
        422: ok('RULE_NOT_MET: details lists every rule with pass/detail'),
      },
    },
    get: {
      tags: ['Requests'],
      summary: 'Owner only: join requests with seeker profile, search criteria and rules re-evaluated now',
      security: asUser,
      parameters: [
        pathParam('id', 'G-01'),
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['ALL', 'PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
        },
      ],
      responses: {
        200: ok('Requests ordered by createdAt asc, id asc'),
        401: ok('Missing or unknown X-User-Id'),
        403: ok('Caller is not the owner'),
        404: ok('Group not found'),
      },
    },
  },
  '/api/requests/mine': {
    get: {
      tags: ['Requests'],
      summary: 'The caller’s join requests with group name, city, dates and status',
      security: asUser,
      responses: { 200: ok('Requests ordered by createdAt desc, id asc'), 401: ok('Missing or unknown X-User-Id') },
    },
  },
  '/api/requests/{requestId}': {
    patch: {
      tags: ['Requests'],
      summary: 'Owner approves or rejects a PENDING request. Approve adds the seeker as a member in one transaction.',
      security: asUser,
      parameters: [pathParam('requestId', 'R-0123456789ab')],
      requestBody: jsonBody(decideRequestSchema, { action: 'APPROVE' }),
      responses: {
        200: ok('Updated request with memberCount and seatsLeft'),
        400: ok('Validation failed'),
        401: ok('Missing or unknown X-User-Id'),
        403: ok('Caller is not the owner'),
        404: ok('Request not found'),
        409: ok('Request already decided, group not open, or group is full'),
      },
    },
  },
};
