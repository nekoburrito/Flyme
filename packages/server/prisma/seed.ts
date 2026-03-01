/**
 * Prisma seed — canonical source of truth for loyalty programs, transfer
 * partners, and program rules. Run with: pnpm --filter server db:seed
 *
 * All transfer operations are upserts so the seed is fully idempotent.
 */

import { PrismaClient, ProgramType, RuleTopic } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Program definitions
// ---------------------------------------------------------------------------

type ProgramSeed = {
  slug: string;
  name: string;
  shortName: string;
  type: ProgramType;
  logoUrl: string | null;
  baselineCpp: number; // cents per point
  websiteUrl: string;
};

const PROGRAMS: ProgramSeed[] = [
  // ── Credit card programs ────────────────────────────────────────────────
  {
    slug: "chase-ur",
    name: "Chase Ultimate Rewards",
    shortName: "Chase UR",
    type: ProgramType.credit_card,
    logoUrl: null,
    baselineCpp: 1.25,
    websiteUrl: "https://creditcards.chase.com/rewards-credit-cards/ultimate-rewards",
  },
  {
    slug: "amex-mr",
    name: "American Express Membership Rewards",
    shortName: "Amex MR",
    type: ProgramType.credit_card,
    logoUrl: null,
    baselineCpp: 1.0,
    websiteUrl: "https://www.americanexpress.com/us/rewards/membership-rewards",
  },
  {
    slug: "citi-typ",
    name: "Citi ThankYou Points",
    shortName: "Citi TYP",
    type: ProgramType.credit_card,
    logoUrl: null,
    baselineCpp: 1.0,
    websiteUrl: "https://www.citi.com/credit-cards/thankyou-rewards",
  },
  {
    slug: "capital-one",
    name: "Capital One Miles",
    shortName: "Capital One",
    type: ProgramType.credit_card,
    logoUrl: null,
    baselineCpp: 1.0,
    websiteUrl: "https://www.capitalone.com/credit-cards/miles",
  },
  {
    slug: "bilt",
    name: "Bilt Rewards",
    shortName: "Bilt",
    type: ProgramType.credit_card,
    logoUrl: null,
    baselineCpp: 1.5,
    websiteUrl: "https://www.biltrewards.com",
  },
  {
    slug: "wells-fargo",
    name: "Wells Fargo Autograph Rewards",
    shortName: "Wells Fargo",
    type: ProgramType.credit_card,
    logoUrl: null,
    baselineCpp: 1.0,
    websiteUrl: "https://www.wellsfargo.com/credit-cards/autograph",
  },

  // ── Airline programs ─────────────────────────────────────────────────────
  {
    slug: "aeroplan",
    name: "Air Canada Aeroplan",
    shortName: "Aeroplan",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.5,
    websiteUrl: "https://www.aircanada.com/aeroplan",
  },
  {
    slug: "united",
    name: "United MileagePlus",
    shortName: "United",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.2,
    websiteUrl: "https://www.united.com/ual/en/us/fly/mileageplus.html",
  },
  {
    slug: "delta",
    name: "Delta SkyMiles",
    shortName: "Delta",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.2,
    websiteUrl: "https://www.delta.com/skymiles",
  },
  {
    slug: "american",
    name: "American Airlines AAdvantage",
    shortName: "AAdvantage",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.4,
    websiteUrl: "https://www.aa.com/aadvantage",
  },
  {
    slug: "alaska",
    name: "Alaska Airlines Mileage Plan",
    shortName: "Alaska",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.8,
    websiteUrl: "https://www.alaskaair.com/mileage-plan",
  },
  {
    slug: "southwest",
    name: "Southwest Rapid Rewards",
    shortName: "Southwest",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.5,
    websiteUrl: "https://www.southwest.com/rapid-rewards",
  },
  {
    slug: "ba-avios",
    name: "British Airways Executive Club",
    shortName: "BA Avios",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.4,
    websiteUrl: "https://www.britishairways.com/executive-club",
  },
  {
    slug: "flying-blue",
    name: "Air France KLM Flying Blue",
    shortName: "Flying Blue",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.3,
    websiteUrl: "https://www.flyingblue.com",
  },
  {
    slug: "singapore",
    name: "Singapore Airlines KrisFlyer",
    shortName: "KrisFlyer",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.4,
    websiteUrl: "https://www.singaporeair.com/krisflyer",
  },
  {
    slug: "ana",
    name: "ANA Mileage Club",
    shortName: "ANA",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 2.0,
    websiteUrl: "https://www.ana.co.jp/en/us/amc",
  },
  {
    slug: "virgin-atlantic",
    name: "Virgin Atlantic Flying Club",
    shortName: "Virgin Atlantic",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.4,
    websiteUrl: "https://www.virginatlantic.com/flying-club",
  },
  {
    slug: "avianca",
    name: "Avianca LifeMiles",
    shortName: "LifeMiles",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.5,
    websiteUrl: "https://www.lifemiles.com",
  },
  {
    slug: "turkish",
    name: "Turkish Airlines Miles & Smiles",
    shortName: "Miles & Smiles",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.6,
    websiteUrl: "https://www.turkishairlines.com/en-int/miles-and-smiles",
  },
  {
    slug: "cathay",
    name: "Cathay Pacific Asia Miles",
    shortName: "Asia Miles",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.4,
    websiteUrl: "https://www.cathaypacific.com/asia-miles",
  },
  {
    slug: "emirates",
    name: "Emirates Skywards",
    shortName: "Skywards",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.1,
    websiteUrl: "https://www.emirates.com/skywards",
  },
  {
    slug: "iberia",
    name: "Iberia Plus",
    shortName: "Iberia Plus",
    type: ProgramType.airline,
    logoUrl: null,
    baselineCpp: 1.3,
    websiteUrl: "https://www.iberia.com/iberia-plus",
  },

  // ── Hotel programs ────────────────────────────────────────────────────────
  {
    slug: "hyatt",
    name: "World of Hyatt",
    shortName: "Hyatt",
    type: ProgramType.hotel,
    logoUrl: null,
    baselineCpp: 1.7,
    websiteUrl: "https://world.hyatt.com",
  },
  {
    slug: "marriott",
    name: "Marriott Bonvoy",
    shortName: "Marriott",
    type: ProgramType.hotel,
    logoUrl: null,
    baselineCpp: 0.7,
    websiteUrl: "https://www.marriott.com/loyalty",
  },
];

// ---------------------------------------------------------------------------
// Transfer partner definitions
// ---------------------------------------------------------------------------

type PartnerSeed = {
  from: string; // program slug
  to: string; // program slug
  ratio: number; // points out per point in (1.0 = 1:1)
  minimumTransfer?: number;
  transferUnit?: number;
  transferTimeDays: number; // 0 = instant
  bonusPercent?: number;
  fees?: Array<{ type: "flat" | "percent"; amount: number; currency?: string }>;
  notes?: string;
};

const PARTNERS: PartnerSeed[] = [
  // ── Chase Ultimate Rewards ───────────────────────────────────────────────
  { from: "chase-ur", to: "aeroplan", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "united", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "hyatt", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "ba-avios", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "flying-blue", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "chase-ur",
    to: "singapore",
    ratio: 1.0,
    transferTimeDays: 1,
    notes: "Transfers typically complete within 1–2 business days.",
  },
  {
    from: "chase-ur",
    to: "ana",
    ratio: 1.0,
    transferTimeDays: 2,
    notes: "Transfers typically complete within 2 business days.",
  },
  { from: "chase-ur", to: "virgin-atlantic", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "iberia", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "southwest", ratio: 1.0, transferTimeDays: 0 },
  { from: "chase-ur", to: "emirates", ratio: 1.0, transferTimeDays: 0 },

  // ── Amex Membership Rewards ───────────────────────────────────────────────
  { from: "amex-mr", to: "aeroplan", ratio: 1.0, transferTimeDays: 0 },
  { from: "amex-mr", to: "delta", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "amex-mr",
    to: "ana",
    ratio: 1.0,
    transferTimeDays: 2,
    notes: "Transfers to ANA typically take 2–3 business days.",
  },
  { from: "amex-mr", to: "ba-avios", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "amex-mr",
    to: "singapore",
    ratio: 1.0,
    transferTimeDays: 1,
    fees: [{ type: "flat", amount: 2500, currency: "USD" }],
    notes: "Amex charges a $25 transfer fee per transaction to KrisFlyer.",
  },
  { from: "amex-mr", to: "flying-blue", ratio: 1.0, transferTimeDays: 0 },
  { from: "amex-mr", to: "virgin-atlantic", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "amex-mr",
    to: "avianca",
    ratio: 1.0,
    transferTimeDays: 2,
    notes: "Transfers typically complete within 2 business days.",
  },
  {
    from: "amex-mr",
    to: "turkish",
    ratio: 1.0,
    transferTimeDays: 1,
    notes: "Transfers typically complete within 1 business day.",
  },
  { from: "amex-mr", to: "cathay", ratio: 1.0, transferTimeDays: 0 },
  { from: "amex-mr", to: "iberia", ratio: 1.0, transferTimeDays: 0 },
  { from: "amex-mr", to: "emirates", ratio: 1.0, transferTimeDays: 0 },

  // ── Citi ThankYou Points ──────────────────────────────────────────────────
  {
    from: "citi-typ",
    to: "avianca",
    ratio: 1.0,
    transferTimeDays: 2,
    notes: "Transfers typically complete within 1–3 business days.",
  },
  {
    from: "citi-typ",
    to: "turkish",
    ratio: 1.0,
    transferTimeDays: 2,
    notes: "Transfers typically complete within 1–3 business days.",
  },
  { from: "citi-typ", to: "flying-blue", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "citi-typ",
    to: "singapore",
    ratio: 1.0,
    transferTimeDays: 1,
    notes: "Transfers typically complete within 1 business day.",
  },
  { from: "citi-typ", to: "cathay", ratio: 1.0, transferTimeDays: 0 },
  { from: "citi-typ", to: "aeroplan", ratio: 1.0, transferTimeDays: 0 },
  { from: "citi-typ", to: "emirates", ratio: 1.0, transferTimeDays: 0 },
  { from: "citi-typ", to: "virgin-atlantic", ratio: 1.0, transferTimeDays: 0 },
  { from: "citi-typ", to: "ba-avios", ratio: 1.0, transferTimeDays: 0 },

  // ── Capital One Miles ─────────────────────────────────────────────────────
  { from: "capital-one", to: "avianca", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "turkish", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "ba-avios", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "flying-blue", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "aeroplan", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "cathay", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "emirates", ratio: 1.0, transferTimeDays: 0 },
  { from: "capital-one", to: "virgin-atlantic", ratio: 1.0, transferTimeDays: 0 },

  // ── Bilt Rewards ──────────────────────────────────────────────────────────
  { from: "bilt", to: "aeroplan", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "hyatt", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "united", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "american", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "alaska", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "southwest", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "ba-avios", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "flying-blue", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "bilt",
    to: "singapore",
    ratio: 1.0,
    transferTimeDays: 0,
    notes: "Bilt is one of the few credit card programs with a direct, instant Singapore transfer.",
  },
  { from: "bilt", to: "virgin-atlantic", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "turkish", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "cathay", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "emirates", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "ana", ratio: 1.0, transferTimeDays: 0 },
  { from: "bilt", to: "avianca", ratio: 1.0, transferTimeDays: 0 },

  // ── Wells Fargo Autograph Rewards ─────────────────────────────────────────
  { from: "wells-fargo", to: "flying-blue", ratio: 1.0, transferTimeDays: 0 },
  { from: "wells-fargo", to: "ba-avios", ratio: 1.0, transferTimeDays: 0 },
  { from: "wells-fargo", to: "aeroplan", ratio: 1.0, transferTimeDays: 0 },
  {
    from: "wells-fargo",
    to: "singapore",
    ratio: 1.0,
    transferTimeDays: 1,
  },
  { from: "wells-fargo", to: "cathay", ratio: 1.0, transferTimeDays: 0 },

  // ── Marriott Bonvoy → airlines (3:1, with 5k bonus per 60k transferred) ──
  {
    from: "marriott",
    to: "united",
    ratio: 0.333,
    minimumTransfer: 10000,
    transferUnit: 10000,
    transferTimeDays: 3,
    notes:
      "Marriott transfers at 3:1 (60k Marriott = 20k miles + 5k bonus = 25k). Minimum 10,000 Marriott points per transfer.",
  },
  {
    from: "marriott",
    to: "delta",
    ratio: 0.333,
    minimumTransfer: 10000,
    transferUnit: 10000,
    transferTimeDays: 3,
    notes: "Marriott transfers at 3:1. Minimum 10,000 Marriott points per transfer.",
  },
  {
    from: "marriott",
    to: "alaska",
    ratio: 0.333,
    minimumTransfer: 10000,
    transferUnit: 10000,
    transferTimeDays: 3,
    notes: "Marriott transfers at 3:1. Minimum 10,000 Marriott points per transfer.",
  },
  {
    from: "marriott",
    to: "ba-avios",
    ratio: 0.333,
    minimumTransfer: 10000,
    transferUnit: 10000,
    transferTimeDays: 3,
    notes: "Marriott transfers at 3:1. Minimum 10,000 Marriott points per transfer.",
  },
  {
    from: "marriott",
    to: "flying-blue",
    ratio: 0.333,
    minimumTransfer: 10000,
    transferUnit: 10000,
    transferTimeDays: 3,
    notes: "Marriott transfers at 3:1. Minimum 10,000 Marriott points per transfer.",
  },
  {
    from: "marriott",
    to: "aeroplan",
    ratio: 0.333,
    minimumTransfer: 10000,
    transferUnit: 10000,
    transferTimeDays: 3,
    notes: "Marriott transfers at 3:1. Minimum 10,000 Marriott points per transfer.",
  },
];

// ---------------------------------------------------------------------------
// Program rule definitions
// ---------------------------------------------------------------------------

type RuleSeed = {
  programSlug: string;
  topic: RuleTopic;
  summary: string;
  detail: string;
  isNegative: boolean;
  lastVerifiedAt: Date;
  sourceUrl?: string;
};

const RULES: RuleSeed[] = [
  // ── Aeroplan ──────────────────────────────────────────────────────────────
  {
    programSlug: "aeroplan",
    topic: RuleTopic.stopover,
    summary:
      "Aeroplan allows one free stopover on one-way international awards, making it easy to visit two destinations on a single ticket.",
    detail:
      "On Aeroplan one-way international awards, you may include one free stopover of any duration. A stopover is a connection exceeding 24 hours. This is a standout feature — most programs charge extra or forbid stopovers entirely. Round-trip awards also allow stopovers under the same rules.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.aircanada.com/aeroplan/how-to-use-points/book-flights",
  },
  {
    programSlug: "aeroplan",
    topic: RuleTopic.fuel_surcharges,
    summary:
      "Aeroplan does not pass on fuel surcharges for most partner airlines, including Lufthansa Group and Swiss — a major cost advantage.",
    detail:
      "When booking Aeroplan awards on Star Alliance partners like Lufthansa, Swiss, Austrian, and Brussels Airlines, Aeroplan absorbs YQ fuel surcharges and only charges the base government taxes. This can save hundreds of dollars versus booking the same flight through a program that does pass on surcharges (e.g., British Airways Avios on partner flights). Note: Air Canada-operated flights do carry some surcharges.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.aircanada.com/aeroplan/how-to-use-points/book-flights",
  },
  {
    programSlug: "aeroplan",
    topic: RuleTopic.open_jaw,
    summary:
      "Aeroplan allows open-jaw routing on international awards at no additional cost.",
    detail:
      "An open-jaw lets you fly into one city and return from another (e.g., fly to Paris, return from Rome) without paying extra. Aeroplan prices open-jaw awards at the same rate as a round-trip between the two endpoints, making it ideal for multi-city European or Asian itineraries.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.aircanada.com/aeroplan/how-to-use-points/book-flights",
  },

  // ── ANA ───────────────────────────────────────────────────────────────────
  {
    programSlug: "ana",
    topic: RuleTopic.partner_awards,
    summary:
      "ANA Mileage Club offers round-the-world awards on Star Alliance partners starting at 55,000 miles in economy — one of the best RTW deals available.",
    detail:
      "ANA's round-the-world award allows up to 8 stopovers and 16 segments on Star Alliance carriers for 55,000 miles (economy), 110,000 miles (business), or 165,000 miles (first class). You must cross both the Pacific and Atlantic. The award is priced on a distance-based model and must be booked through ANA's call center. Transfer from Chase UR or Amex MR at 1:1 to fund this award.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.ana.co.jp/en/us/amc/award/international/round-world",
  },

  // ── British Airways Avios ─────────────────────────────────────────────────
  {
    programSlug: "ba-avios",
    topic: RuleTopic.fuel_surcharges,
    summary:
      "British Airways Avios imposes significant fuel surcharges (YQ) on BA-operated long-haul flights — but partner short-haul bookings are typically surcharge-free.",
    detail:
      "BA Avios awards on BA-operated transatlantic and other long-haul routes carry substantial YQ fuel surcharges, often £500+ round-trip in business class. However, Avios bookings on partner carriers (American, Iberia, Alaska, etc.) typically only carry government taxes. The short-haul sweet spot (Avios are distance-based) can be very good value when avoiding BA metal on long routes.",
    isNegative: true,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.britishairways.com/executive-club/avios/spending",
  },
  {
    programSlug: "ba-avios",
    topic: RuleTopic.routing_rules,
    summary:
      "Avios uses a distance-based chart — shorter flights cost fewer miles regardless of price. This creates great value for short-haul and poor value for long-haul on BA metal.",
    detail:
      "The Avios pricing chart is purely based on distance (in miles between airports). Under 651 miles costs 6,000 Avios in economy; up to 6,000 miles costs 30,000 Avios. This makes Avios ideal for short American Airlines or Alaska flights within the US, as well as short European hops. For long-haul, the combination of high Avios costs and fuel surcharges usually makes other programs better options.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.britishairways.com/executive-club/avios/spending",
  },

  // ── United MileagePlus ────────────────────────────────────────────────────
  {
    programSlug: "united",
    topic: RuleTopic.stopover,
    summary:
      "United MileagePlus does not allow stopovers on award tickets — you cannot add a free layover city.",
    detail:
      "United awards are point-to-point. There is no stopover benefit; each segment must connect within 24 hours. If you want a stopover, you would need to book two separate one-way awards, which typically costs more miles total. Consider Aeroplan (which allows free stopovers) for the same Star Alliance inventory.",
    isNegative: true,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.united.com/ual/en/us/fly/mileageplus/awards/travel.html",
  },
  {
    programSlug: "united",
    topic: RuleTopic.partner_awards,
    summary:
      "United MileagePlus can book all Star Alliance partners plus select non-alliance partners like Aer Lingus and All Nippon Airways.",
    detail:
      "United's broad partner network lets you book award flights on 35+ carriers. Key partners include Lufthansa, Swiss, ANA, Singapore Airlines, Air New Zealand, and many more. United's dynamic pricing means award costs vary based on demand — booking further in advance generally yields lower mileage rates. Saver awards (when available) are the best value.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.united.com/ual/en/us/fly/mileageplus/awards/travel.html",
  },

  // ── Turkish Miles & Smiles ────────────────────────────────────────────────
  {
    programSlug: "turkish",
    topic: RuleTopic.partner_awards,
    summary:
      "Turkish Miles & Smiles has industry-leading low rates for Star Alliance partners, including business class to North America for 45,000 miles.",
    detail:
      "Turkish Miles & Smiles offers some of the lowest Star Alliance partner award rates available. Transatlantic business class on partners like Lufthansa, Swiss, or Brussels Airlines costs approximately 45,000 miles one-way — far below what United or Aeroplan charge for the same flights. Economy to North America on Star Alliance runs around 15,000 miles. Awards must be booked via the Turkish website or call center. Partner availability can be limited and requires flexibility.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.turkishairlines.com/en-int/miles-and-smiles/award-miles",
  },

  // ── Singapore KrisFlyer ───────────────────────────────────────────────────
  {
    programSlug: "singapore",
    topic: RuleTopic.award_expiry,
    summary:
      "KrisFlyer miles expire 3 years after the calendar year they were earned — activity does not reset the clock on older miles.",
    detail:
      "KrisFlyer miles expire at the end of the third calendar year following the year they were earned. Unlike many programs, account activity (earning or redeeming miles) does not extend the expiration date of existing miles. Each batch of miles has its own expiry. This requires active management to ensure older miles are redeemed before expiration.",
    isNegative: true,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.singaporeair.com/krisflyer/miles/expiry",
  },
  {
    programSlug: "singapore",
    topic: RuleTopic.partner_awards,
    summary:
      "KrisFlyer can book Singapore Airlines' own Suites (First Class) product, offering some of the best business and first class redemptions in the world at fixed rates.",
    detail:
      "Singapore Airlines KrisFlyer offers fixed award rates on its own metal, including the coveted Suites (first class) product on the A380. Round-trip Suites from JFK to Singapore is approximately 228,000 KrisFlyer miles, while business (Business Class) runs around 89,000 miles round-trip. Singapore Airlines operates one of the most consistent and high-quality premium cabin experiences, making KrisFlyer points particularly aspirational for first-class travelers.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.singaporeair.com/krisflyer/use-miles/book-flights",
  },

  // ── Avianca LifeMiles ─────────────────────────────────────────────────────
  {
    programSlug: "avianca",
    topic: RuleTopic.partner_awards,
    summary:
      "LifeMiles can book Star Alliance partners at competitive rates, often cheaper than United MileagePlus for the same inventory.",
    detail:
      "Avianca LifeMiles uses a zone-based award chart for Star Alliance partners. Business class from North America to Europe on Lufthansa, Swiss, or ANA can be as low as 63,000 miles one-way — often 10–15% less than United charges for identical flights. LifeMiles also allows one-way bookings with no roundtrip requirement. The program has historically had occasional IT issues; booking by phone is sometimes required.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.lifemiles.com/eng/acumula/canjea/premios",
  },
  {
    programSlug: "avianca",
    topic: RuleTopic.fuel_surcharges,
    summary:
      "LifeMiles does not pass on fuel surcharges (YQ) on most Star Alliance partner awards — a significant cost saving versus booking through British Airways or others.",
    detail:
      "When redeeming LifeMiles on Star Alliance partners, Avianca does not add carrier-imposed surcharges (YQ). You pay only the standard government taxes and airport fees. For a Lufthansa transatlantic business class award this can save $300–$800 compared to programs that do levy surcharges. This makes LifeMiles particularly attractive for premium cabin Star Alliance bookings.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.lifemiles.com/eng/acumula/canjea/premios",
  },

  // ── Delta SkyMiles ────────────────────────────────────────────────────────
  {
    programSlug: "delta",
    topic: RuleTopic.fuel_surcharges,
    summary:
      "Delta SkyMiles can levy carrier-imposed fuel surcharges on SkyTeam partner awards, particularly on European carriers like Air France and KLM.",
    detail:
      "When redeeming Delta SkyMiles on Air France, KLM, or other European SkyTeam partners, Delta often passes on YQ fuel surcharges. For transatlantic business class on Air France, the co-pay can exceed $300–$500. Conversely, Delta-operated awards typically do not have fuel surcharges. Consider Flying Blue (Air France's own program) to book the same Air France flights without the surcharges.",
    isNegative: true,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.delta.com/skymiles",
  },
  {
    programSlug: "delta",
    topic: RuleTopic.award_expiry,
    summary:
      "Delta SkyMiles do not expire as long as your account has activity within 24 months.",
    detail:
      "Delta SkyMiles miles are kept alive by any account activity within a 24-month rolling window. Qualifying activity includes earning or redeeming SkyMiles, using the Delta SkyMiles credit card, or linking qualifying partner activities. If no activity occurs within 24 months, all miles expire. Delta abolished expiration for MQM (Medallion Qualifying Miles) separately; the 24-month rule applies to regular SkyMiles.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.delta.com/skymiles/expiration",
  },

  // ── Chase Ultimate Rewards ────────────────────────────────────────────────
  {
    programSlug: "chase-ur",
    topic: RuleTopic.award_expiry,
    summary:
      "Chase Ultimate Rewards points do not expire as long as the earning card account remains open and in good standing.",
    detail:
      "There is no expiration date on Chase Ultimate Rewards points while your card account is open. Points will be forfeited if you close the account, so plan transfers before closing. Transferred points take on the expiration policy of the receiving program.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://creditcards.chase.com/rewards-credit-cards/ultimate-rewards",
  },

  // ── Amex Membership Rewards ───────────────────────────────────────────────
  {
    programSlug: "amex-mr",
    topic: RuleTopic.award_expiry,
    summary:
      "Amex Membership Rewards points do not expire as long as the card account remains open.",
    detail:
      "Points are forfeited if you cancel the Amex card that earns them. If you have multiple Amex MR-earning cards and cancel one, points earned on that card may be preserved if you retain another eligible card in the account. Always confirm your point balance before closing an Amex card.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.americanexpress.com/us/rewards/membership-rewards",
  },

  // ── Flying Blue ───────────────────────────────────────────────────────────
  {
    programSlug: "flying-blue",
    topic: RuleTopic.partner_awards,
    summary:
      "Flying Blue's monthly Promo Rewards offer 25–50% discounts on select routes, making it one of the most dynamic award programs for deal hunters.",
    detail:
      "Every month, Air France KLM Flying Blue publishes Promo Rewards — a set of routes with 25–50% off the standard award price. These promos rotate monthly and cover both Air France/KLM-operated and partner flights. Monitoring these promos can yield business class transatlantic awards for 40,000–55,000 miles that would normally cost 75,000+. Sign up for Promo Rewards alerts to be notified when deals are published.",
    isNegative: false,
    lastVerifiedAt: new Date("2026-01-01"),
    sourceUrl: "https://www.flyingblue.com/en/promo-rewards",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Seeding programs…");
  for (const program of PROGRAMS) {
    await prisma.program.upsert({
      where: { slug: program.slug },
      update: program,
      create: program,
    });
  }
  console.log(`   ✓  ${PROGRAMS.length} programs`);

  // Build slug → id lookup
  const rows = await prisma.program.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  const resolveId = (slug: string): string => {
    const id = idBySlug.get(slug);
    if (!id) throw new Error(`Unknown program slug: "${slug}"`);
    return id;
  };

  console.log("🌱  Seeding transfer partners…");
  for (const p of PARTNERS) {
    const fromProgramId = resolveId(p.from);
    const toProgramId = resolveId(p.to);
    const data = {
      fromProgramId,
      toProgramId,
      ratio: p.ratio,
      minimumTransfer: p.minimumTransfer ?? 1000,
      transferUnit: p.transferUnit ?? 1000,
      transferTimeDays: p.transferTimeDays,
      bonusPercent: p.bonusPercent ?? 0,
      fees: p.fees ?? [],
      notes: p.notes ?? null,
      isActive: true,
    };
    await prisma.transferPartner.upsert({
      where: { fromProgramId_toProgramId: { fromProgramId, toProgramId } },
      update: data,
      create: data,
    });
  }
  console.log(`   ✓  ${PARTNERS.length} transfer partners`);

  console.log("🌱  Seeding program rules…");
  for (const rule of RULES) {
    const programId = resolveId(rule.programSlug);
    // Upsert on (programId, topic) — one canonical rule per topic per program
    const existing = await prisma.programRule.findFirst({
      where: { programId, topic: rule.topic },
      select: { id: true },
    });
    const data = {
      programId,
      topic: rule.topic,
      summary: rule.summary,
      detail: rule.detail,
      isNegative: rule.isNegative,
      lastVerifiedAt: rule.lastVerifiedAt,
      sourceUrl: rule.sourceUrl ?? null,
    };
    if (existing) {
      await prisma.programRule.update({ where: { id: existing.id }, data });
    } else {
      await prisma.programRule.create({ data });
    }
  }
  console.log(`   ✓  ${RULES.length} program rules`);

  console.log("✅  Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
