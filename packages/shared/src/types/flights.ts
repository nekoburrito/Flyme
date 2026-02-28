import type { TransferPath } from './programs.js';

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export type FlightSource = 'seats_aero' | 'amadeus' | 'manual';

export interface AwardSegment {
  flightNumber: string;
  carrier: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  aircraft?: string;
}

export interface AwardOption {
  id: string;
  program: string;
  programDisplayName: string;
  segments: AwardSegment[];
  cabin: CabinClass;
  milesRequired: number;
  taxesCents: number;
  seatsAvailable: number;
  centsPerPoint: number;
  cashPriceCents: number;
  source: FlightSource;
  fetchedAt: string;
  bookingUrl?: string;
  transferPaths?: TransferPath[];
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  cabin: CabinClass;
  passengers: number;
  programs?: string[];
}

export interface SearchResult {
  outbound: AwardOption[];
  return?: AwardOption[];
}
