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
        'Traveller profile page (G2): interests, home city, age, and the groups they are in (id, name, city, checkIn, checkOut, status, role OWNER|MEMBER, memberCount, maxSize), sorted by check-in then group id',
      parameters: [pathParam('id', 'T-001')],
      responses: { 200: ok('Traveller profile with groups'), 404: ok('Not found') },
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
