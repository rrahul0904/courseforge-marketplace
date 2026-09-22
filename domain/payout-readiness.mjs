export function stripeAccountReadiness(account) {
  const currentlyDue = Array.isArray(account?.requirements?.currently_due)
    ? account.requirements.currently_due
    : [];
  const blockers = [];
  if (!account?.details_submitted) blockers.push("details_not_submitted");
  if (!account?.charges_enabled) blockers.push("charges_disabled");
  if (!account?.payouts_enabled) blockers.push("payouts_disabled");
  if (currentlyDue.length > 0) blockers.push("requirements_due");
  return {
    ready: blockers.length === 0,
    blockers,
    currentlyDue,
    chargesEnabled: account?.charges_enabled === true,
    payoutsEnabled: account?.payouts_enabled === true,
    detailsSubmitted: account?.details_submitted === true
  };
}

export function persistedPayoutReadiness(profile) {
  return Boolean(
    profile?.payoutAccountId &&
    profile?.payoutReady === true
  );
}
