export type StripeAccountLike = {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: { currently_due?: string[] | null } | null;
};

export type StripeAccountReadiness = {
  ready: boolean;
  blockers: string[];
  currentlyDue: string[];
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export function stripeAccountReadiness(account: StripeAccountLike | null | undefined): StripeAccountReadiness;
export function persistedPayoutReadiness(profile: {
  payoutAccountId?: string | null;
  payoutChargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  payoutDetailsSubmitted?: boolean;
} | null | undefined): boolean;
