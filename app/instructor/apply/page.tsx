import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import ApplicationForm from "./ApplicationForm";

export default async function InstructorApplyPage() {
  const actor = await requireRole("STUDENT", "/instructor/apply");
  const profile = await getDb().instructorProfile.findUnique({ where: { userId: actor.sub } });
  return <main className="page">
    <div className="eyebrow">Teach on CourseForge</div>
    <h1>Apply as an instructor</h1>
    <p className="muted">Instructor approval is separate from account authentication. Approval never bypasses Stripe payout verification or course moderation.</p>
    {profile ? <div className="panel">
      <h3>Application status: {profile.status}</h3>
      <p>{profile.headline}</p>
      <p className="muted">{profile.status === "APPROVED"
        ? "You can now open Instructor Studio and complete payout onboarding."
        : "You can update and resubmit the application while it is awaiting review."}</p>
    </div> : null}
    {profile?.status === "APPROVED" ? null : <ApplicationForm />}
  </main>;
}
