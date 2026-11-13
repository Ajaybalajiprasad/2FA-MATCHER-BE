import { metaPaths } from './paths/meta';
import { travellerPaths } from './paths/travellers';

export const openApiSpec = {
  openapi: '3.0.3',
  info: { title: 'Group Travel Matcher API', version: '1.0.0' },
  components: {
    securitySchemes: {
      userId: { type: 'apiKey', in: 'header', name: 'X-User-Id', description: 'Traveller ID, e.g. T-001' },
    },
  },
  paths: {
    ...metaPaths,
    ...travellerPaths,
  },
};
