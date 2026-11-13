import { groupPaths } from './paths/groups';
import { matchPaths } from './paths/matches';
import { messagePaths } from './paths/messages';
import { metaPaths } from './paths/meta';
import { planningPaths } from './paths/planning';
import { requestPaths } from './paths/requests';
import { travellerPaths } from './paths/travellers';
import { friendPaths } from './paths/friends';

export const openApiSpec = {
  openapi: '3.0.3',
  info: { title: 'Group Travel Matcher API', version: '1.0.0' },
  components: {
    securitySchemes: {
      userId: { type: 'http', scheme: 'bearer', description: 'Token from POST /api/travellers or POST /api/travellers/sign-in' },
    },
  },
  paths: {
    ...metaPaths,
    ...travellerPaths,
    ...friendPaths,
    ...groupPaths,
    ...planningPaths,
    ...messagePaths,
    ...matchPaths,
    ...requestPaths,
  },
};
