import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { syncStripePayoutStatus } from "@/lib/instructors/payouts";

export default async function StripeReturnPage() {
  const actor = await requireRole("INSTRUCTOR", "/instructor/payouts/return");
  const { readiness } = await syncStripePayoutStatus(actor.sub);
  return <main className="page">
    <div className="eyebrow">Stripe Connect</div>
    <h1>{readiness.ready ? "Payout onboarding is complete." : "Stripe still needs information."}</h1>
    <div className="panel">
      <p>Details submitted: <strong>{readiness.detailsSubmitted ? "Yes" : "No"}</strong></p>
      <p>Charges enabled: <strong>{readiness.chargesEnabled ? "Yes" : "No"}</strong></p>
      <p>Payouts enabled: <strong>{readiness.payoutsEnabled ? "Yes" : "No"}</strong></p>
      {readiness.currentlyDue.length ? <p className="muted">Outstanding requirements: {readiness.currentlyDue.join(", ")}</p> : null}
      <Link className="button" href="/instructor/payouts">Return to payout settings</Link>
    </div>
  </main>;
}
