import { requireRole } from "@/lib/auth/session";
import { syncStripePayoutStatus } from "@/lib/instructors/payouts";

export async function GET() {
  const actor = await requireRole("INSTRUCTOR", "/instructor/payouts");
  try {
    const { profile, readiness } = await syncStripePayoutStatus(actor.sub);
    return Response.json({
      connected: Boolean(profile?.payoutAccountId),
      accountId: profile?.payoutAccountId ?? null,
      readiness
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to refresh payout status" },
      { status: 502 }
    );
  }
}
