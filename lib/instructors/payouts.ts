import "server-only";
import { getDb } from "@/lib/db";
import type { SessionActor } from "@/lib/auth/session";
import {
  createStripeAccountLink,
  createStripeExpressAccount,
  retrieveStripeConnectedAccount
} from "@/lib/payments/stripe";
import { stripeAccountReadiness } from "@/domain/payout-readiness.mjs";

async function persistStripeReadiness(userId: string, account: Awaited<ReturnType<typeof retrieveStripeConnectedAccount>>) {
  const db = getDb();
  const readiness = stripeAccountReadiness(account);
  const profile = await db.instructorProfile.update({
    where: { userId },
    data: {
      payoutChargesEnabled: readiness.chargesEnabled,
      payoutsEnabled: readiness.payoutsEnabled,
      payoutDetailsSubmitted: readiness.detailsSubmitted,
      payoutReady: readiness.ready,
      payoutStatusUpdatedAt: new Date()
    }
  });
  return { profile, readiness };
}

export async function syncStripePayoutStatus(userId: string) {
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId } });
  if (!profile?.payoutAccountId) {
    return {
      profile,
      readiness: {
        ready: false,
        blockers: ["account_not_connected"],
        currentlyDue: [],
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false
      }
    };
  }
  const account = await retrieveStripeConnectedAccount(profile.payoutAccountId);
  return persistStripeReadiness(userId, account);
}

export async function beginStripePayoutOnboarding(actor: SessionActor, appUrl: string) {
  const db = getDb();
  let profile = await db.instructorProfile.findUnique({
    where: { userId: actor.sub },
    include: { user: true }
  });
  if (!profile || profile.status !== "APPROVED") {
    throw new Error("Instructor approval is required before payout onboarding");
  }

  if (!profile.payoutAccountId) {
    const account = await createStripeExpressAccount({
      email: actor.email,
      instructorId: profile.id
    });
    profile = await db.instructorProfile.update({
      where: { id: profile.id },
      data: { payoutAccountId: account.id },
      include: { user: true }
    });
    await persistStripeReadiness(actor.sub, account);
  } else {
    await syncStripePayoutStatus(actor.sub);
  }

  const link = await createStripeAccountLink({
    accountId: profile.payoutAccountId!,
    refreshUrl: `${appUrl}/instructor/payouts/refresh`,
    returnUrl: `${appUrl}/instructor/payouts/return`
  });
  return { onboardingUrl: link.url, accountId: profile.payoutAccountId };
}
