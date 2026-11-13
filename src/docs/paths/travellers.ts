import { signUpSchema } from '../../validators/travellerValidators';
import { asUser, jsonBody, ok, pathParam } from '../helpers';

export const travellerPaths = {
  '/api/travellers': {
    post: {
      tags: ['Travellers'],
      summary: 'Sign up (M1)',
      requestBody: jsonBody(signUpSchema, {
        name: 'Priya Shah',
        age: 26,
        gender: 'FEMALE',
        homeCity: 'Mumbai',
        homeAirport: 'BOM',
        genderPreference: 'SAME_GENDER',
        interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
      }),
      responses: { 201: ok('Created traveller'), 400: ok('Validation failed') },
    },
    get: {
      tags: ['Travellers'],
      summary: 'List all travellers',
      responses: { 200: ok('Travellers') },
    },
  },
  '/api/travellers/{id}': {
    get: {
      tags: ['Travellers'],
      summary:
        'Traveller profile (G2): basic details are public. Groups are returned only to the profile owner or an accepted friend identified by X-User-Id. Otherwise canViewGroups is false and groups is empty.',
      parameters: [pathParam('id', 'T-001')],
      responses: { 200: ok('Traveller profile with canViewGroups and a permission-filtered groups array'), 404: ok('Not found') },
    },
  },
  '/api/me': {
    get: {
      tags: ['Travellers'],
      summary: 'Current traveller (from X-User-Id)',
      security: asUser,
      responses: { 200: ok('Current traveller'), 401: ok('Missing or unknown X-User-Id') },
    },
  },
};
