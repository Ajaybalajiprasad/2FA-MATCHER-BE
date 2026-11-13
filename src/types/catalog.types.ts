export interface Interest {
  interest: string;
  label: string;
  category: string;
}

export interface DepartureCity {
  airport: string;
  city: string;
}

export interface DestinationCountry {
  code: string;
  name: string;
  timezone: string;
  cities: { name: string; airports: string[] }[];
}

export interface DestinationsFile {
  departure_cities: DepartureCity[];
  countries: DestinationCountry[];
}

export interface City {
  name: string;
  country: string;
  countryCode: string;
  timezone: string;
}

export interface Hotel {
  hotel_id: string;
  name: string;
  aliases: string[];
  city: string;
  area: string;
  lat: number;
  lng: number;
  rating: number;
  stars: number;
  check_in_from: string;
  check_out_until: string;
  family_friendly: boolean;
  image: string;
}

export interface Room {
  room_id: string;
  hotel_id: string;
  room_type: string;
  name: string;
  max_adults: number;
  max_children: number;
  price_per_night: { amount: number; currency: string };
  refundable: boolean;
}

export interface Availability {
  room_id: string;
  date: string;
  rooms_left: number;
}

export interface SeedTraveller {
  traveller_id: string;
  name: string;
  age: number;
  gender: 'FEMALE' | 'MALE';
  home_city: string;
  home_airport: string;
  interests: string[];
  gender_preference: 'ANY' | 'SAME_GENDER';
}

export interface SeedGroup {
  group_id: string;
  name: string;
  owner_id: string;
  member_ids: string[];
  city: string;
  check_in: string;
  check_out: string;
  max_size: number;
  budget_inr: number;
  itinerary: string;
}
