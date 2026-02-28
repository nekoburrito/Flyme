export type ProgramType = 'credit_card' | 'airline' | 'hotel';

export type RuleTopic =
  | 'stopover'
  | 'open_jaw'
  | 'fuel_surcharges'
  | 'partner_awards'
  | 'mixed_cabin'
  | 'routing_rules'
  | 'award_expiry'
  | 'cancellation';

export interface LoyaltyProgram {
  slug: string;
  name: string;
  shortName: string;
  type: ProgramType;
  logoUrl: string;
  baselineCpp: number;
  websiteUrl: string;
  transferPartners?: TransferPartner[];
}

export interface TransferPartner {
  fromProgramSlug: string;
  toProgramSlug: string;
  ratio: number;
  minimumTransfer: number;
  transferUnit: number;
  transferTimeDays: number;
  bonusPercent: number;
  bonusExpiresAt?: string;
  fees: TransferFee[];
  isActive: boolean;
  notes?: string;
}

export interface TransferFee {
  type: 'flat' | 'percent';
  amount: number;
  currency?: string;
}

export interface TransferStep {
  fromProgramSlug: string;
  toProgramSlug: string;
  ratio: number;
  pointsIn: number;
  pointsOut: number;
  transferTimeDays: number;
  bonusPercent: number;
  estimatedFeeCents: number;
}

export interface TransferPath {
  steps: TransferStep[];
  totalPointsRequired: number;
  totalTransferDays: number;
  effectiveCpp: number;
  isViable: boolean;
}

export interface ProgramRule {
  programSlug: string;
  topic: RuleTopic;
  summary: string;
  detail: string;
  isNegative: boolean;
  lastVerifiedAt: string;
  sourceUrl?: string;
}

export interface PointsBalance {
  programSlug: string;
  balance: number;
  lastUpdatedAt: string;
  isManual: boolean;
}
