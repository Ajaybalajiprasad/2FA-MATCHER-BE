import { matchSearchSchema } from '../../validators/matchValidators';
import { asUser, jsonBody, ok } from '../helpers';

export const matchPaths = {
  '/api/matches/search': {
    post: {
      tags: ['Matches'],
      summary:
        'Search groups (M3/M4). Saves the search, returns ranked matches (all 6 rules pass) and near misses (exactly 1 rule fails, with a suggestion). Gender comes from the profile; genderPreference defaults to the profile. Each result has genderComposition { female, male, mix }. Optional filters (G1) only narrow matches and nearMisses: sharedInterests (owner must share all of them with you), minSharedInterests, genderMix (ALL_FEMALE|ALL_MALE|MIXED).',
      security: asUser,
      requestBody: jsonBody(matchSearchSchema, {
        homeCity: 'Mumbai',
        city: 'Kyoto',
        checkIn: '2027-04-09',
        checkOut: '2027-04-16',
        budgetInr: 62000,
        interests: ['TEMPLES', 'STREET_FOOD', 'ADVENTURE'],
        genderPreference: 'SAME_GENDER',
        filters: { sharedInterests: ['TEMPLES'], genderMix: 'ALL_FEMALE' },
      }),
      responses: {
        200: ok('searchId, criteria, filters (echo or null), totalBeforeFilters { matches, nearMisses }, matches and nearMisses sorted by score desc, shared nights desc, check-in asc, group id asc'),
        400: ok('Validation failed, unknown interests, or city/dates outside the data (OUT_OF_DATA_RANGE)'),
        401: ok('Missing or unknown X-User-Id'),
      },
    },
  },
};
