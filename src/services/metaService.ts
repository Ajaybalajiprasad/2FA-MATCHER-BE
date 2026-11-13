import { catalogRepository } from '../repositories/CatalogRepository';
import {
  DATE_WINDOW,
  GENDER_PREFERENCES,
  GENDERS,
  GROUP_SIZE,
  MATCH_RULES_CONFIG,
} from '../config/businessRules';

export class MetaService {
  async getMeta() {
    const [cities, interests, homeCities] = await Promise.all([
      catalogRepository.findAllCities(),
      catalogRepository.findAllInterests(),
      catalogRepository.findAllHomeCities(),
    ]);
    return {
      cities: cities.map(({ sortOrder: _s, ...c }) => c),
      interests: interests.map(({ sortOrder: _s, ...i }) => i),
      homeCities: homeCities.map(({ sortOrder: _s, ...h }) => h),
      genders: GENDERS,
      genderPreferences: GENDER_PREFERENCES,
      dateWindow: DATE_WINDOW,
      groupSize: GROUP_SIZE,
      matchRules: MATCH_RULES_CONFIG,
    };
  }
}

export const metaService = new MetaService();
