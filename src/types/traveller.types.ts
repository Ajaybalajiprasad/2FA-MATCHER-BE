import type { Gender, GenderPreference } from '../config/businessRules';

export interface Traveller {
  id: string;
  name: string;
  age: number | null;
  gender: Gender;
  homeCity: string;
  homeAirport: string | null;
  genderPreference: GenderPreference;
  interests: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: Traveller;
    }
  }
}
