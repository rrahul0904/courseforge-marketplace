import { requireRole } from "@/lib/auth/session";
import { beginStripePayoutOnboarding } from "@/lib/instructors/payouts";

export async function POST(request: Request) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/payouts");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  try {
    const result = await beginStripePayoutOnboarding(actor, appUrl);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to begin payout onboarding" },
      { status: 409 }
    );
  }
}
