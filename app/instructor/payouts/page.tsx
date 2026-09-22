import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { persistedPayoutReadiness } from "@/domain/payout-readiness.mjs";

export default async function InstructorPayoutsPage() {
  const actor = await requireRole("INSTRUCTOR", "/instructor/payouts");
  const profile = await getDb().instructorProfile.findUnique({ where: { userId: actor.sub } });
  if (!profile) {
    return <main className="page"><div className="eyebrow">Instructor payouts</div><h1>No instructor profile found.</h1></main>;
  }

  const ready = persistedPayoutReadiness(profile);
  return <main className="page">
    <div className="eyebrow">Instructor payouts</div>
    <h1>{ready ? "Your payout account is ready." : "Finish payout onboarding."}</h1>
    <div className="panel">
      <div className="row"><span>Instructor approval</span><strong>{profile.status}</strong></div>
      <div className="row"><span>Stripe account</span><strong>{profile.payoutAccountId ? "Connected" : "Not connected"}</strong></div>
      <div className="row"><span>Details submitted</span><strong>{profile.payoutDetailsSubmitted ? "Yes" : "No"}</strong></div>
      <div className="row"><span>Charges enabled</span><strong>{profile.payoutChargesEnabled ? "Yes" : "No"}</strong></div>
      <div className="row"><span>Payouts enabled</span><strong>{profile.payoutsEnabled ? "Yes" : "No"}</strong></div>
      <div className="row"><span>Full payout readiness</span><strong>{profile.payoutReady ? "Ready" : "Blocked"}</strong></div>
      <p className="muted">Critical commerce actions refresh readiness from Stripe live; this screen shows the latest persisted result.</p>
      <div className="actions">
        <form action="/instructor/payouts/start" method="post">
          <button className="button" type="submit">{profile.payoutAccountId ? "Continue Stripe onboarding" : "Connect Stripe"}</button>
        </form>
        {profile.payoutAccountId ? <form action="/instructor/payouts/sync" method="post">
          <button className="button secondary" type="submit">Refresh status</button>
        </form> : null}
      </div>
    </div>
  </main>;
}
