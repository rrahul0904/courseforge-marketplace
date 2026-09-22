import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { beginStripePayoutOnboarding } from "@/lib/instructors/payouts";

export async function GET(request: Request) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/payouts");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const result = await beginStripePayoutOnboarding(actor, appUrl);
  return NextResponse.redirect(result.onboardingUrl, 303);
}
