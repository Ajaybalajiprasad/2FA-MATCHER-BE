import { ok } from '../helpers';

export const metaPaths = {
  '/api/meta': {
    get: {
      tags: ['Meta'],
      summary: 'Cities, interests, home cities, date window, group size and rule thresholds',
      responses: { 200: ok('Form options') },
    },
  },
};
