import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import ReviewActions from "./ReviewActions";

export default async function CapstoneReviewQueue() {
  const actor = await requireRole("INSTRUCTOR", "/instructor/capstones");
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });

  if (!profile) {
    return <main className="page">
      <div className="eyebrow">Capstone review</div>
      <h1>Faculty profile required.</h1>
      <Link className="button secondary" href="/instructor/studio">Back to studio</Link>
    </main>;
  }

  const submissions = await db.capstoneSubmission.findMany({
    where: {
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
      enrollment: { course: { instructorId: profile.id } }
    },
    include: {
      enrollment: {
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true, slug: true } }
        }
      }
    },
    orderBy: { submittedAt: "asc" }
  });

  return <main className="page">
    <div className="eyebrow">Capstone review</div>
    <h1>Review submitted work against the exact revision.</h1>
    <p className="muted">Approvals are human-authoritative and revision-bound. A newer revision must be reviewed separately.</p>
    <div className="actions"><Link className="button secondary" href="/instructor/studio">Back to studio</Link></div>
    <div className="section">
      <div className="list">
        {submissions.length ? submissions.map((submission) => <div className="panel" key={submission.id}>
          <span className="badge">{submission.status}</span>
          <h2>{submission.enrollment.course.title} · revision {submission.revision}</h2>
          <p className="muted">Learner: {submission.enrollment.user.name ?? submission.enrollment.user.email}</p>
          <p>{submission.summary}</p>
          {submission.artifactUrl ? <p><a href={submission.artifactUrl}>Open submitted artifact</a></p> : null}
          <ReviewActions submissionId={submission.id} />
        </div>) : <div className="panel"><h2>No capstones waiting for review.</h2><p className="muted">Submitted revisions will appear here without replacing earlier evidence.</p></div>}
      </div>
    </div>
  </main>;
}
