import { createGroupSchema } from '../../validators/groupValidators';
import { asUser, jsonBody, ok, pathParam } from '../helpers';

export const groupPaths = {
  '/api/groups': {
    post: {
      tags: ['Groups'],
      summary: 'Create a group post (M2). The caller becomes owner and first member.',
      security: asUser,
      requestBody: jsonBody(createGroupSchema, {
        name: 'Kyoto Spring Temples',
        city: 'Kyoto',
        checkIn: '2027-04-10',
        checkOut: '2027-04-15',
        maxSize: 3,
        budgetInr: 60000,
        itinerary: 'Fushimi Inari at sunrise, Nishiki Market lunch, Gion walk, photo day in Arashiyama.',
      }),
      responses: {
        201: ok('Created group with owner, members, memberCount and seatsLeft'),
        400: ok('Validation failed, or city/dates outside the data (OUT_OF_DATA_RANGE)'),
        401: ok('Missing or invalid token'),
      },
    },
  },
  '/api/groups/mine': {
    get: {
      tags: ['Groups'],
      summary: 'Groups the caller belongs to, with role, memberCount and pendingRequestCount (owner only)',
      security: asUser,
      responses: { 200: ok('My groups'), 401: ok('Missing or invalid token') },
    },
  },
  '/api/groups/{id}': {
    get: {
      tags: ['Groups'],
      summary: 'Group details with owner, members, seatsLeft and the caller’s join request status; pendingRequestCount for the owner (token optional)',
      security: [...asUser, {}],
      parameters: [pathParam('id', 'G-01')],
      responses: { 200: ok('Group'), 404: ok('Not found') },
    },
  },
};
