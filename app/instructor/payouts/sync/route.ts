import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { syncStripePayoutStatus } from "@/lib/instructors/payouts";

export async function POST(request: Request) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/payouts");
  await syncStripePayoutStatus(actor.sub);
  return NextResponse.redirect(new URL("/instructor/payouts", request.url), 303);
}
