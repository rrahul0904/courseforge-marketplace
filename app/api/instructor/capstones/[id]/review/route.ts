import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { capstoneReviewDecision } from "@/domain/cohort-learning.mjs";

const schema = z.object({
  decision: z.enum(["CHANGES_REQUESTED", "APPROVED"]),
  feedback: z.string().trim().min(10).max(4000)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const submission = await db.capstoneSubmission.findUnique({
    where: { id },
    include: {
      review: true,
      enrollment: {
        include: {
          course: { include: { instructor: true } },
          capstoneSubmissions: { select: { id: true, revision: true }, orderBy: { revision: "desc" }, take: 1 }
        }
      }
    }
  });
  if (!submission) return Response.json({ error: "Capstone submission not found" }, { status: 404 });
  if (submission.review) return Response.json({ error: "This capstone revision already has a faculty review" }, { status: 409 });

  const ownsCourse = submission.enrollment.course.instructor.userId === actor.sub;
  if (!ownsCourse && actor.role !== "ADMIN") {
    return Response.json({ error: "You cannot review capstones for this course" }, { status: 403 });
  }
  if (!new Set(["SUBMITTED", "IN_REVIEW"]).has(submission.status)) {
    return Response.json({ error: "Only submitted capstones can be reviewed" }, { status: 409 });
  }

  const currentRevision = submission.enrollment.capstoneSubmissions[0]?.revision ?? submission.revision;
  const decision = capstoneReviewDecision({
    reviewerKind: "FACULTY",
    decision: parsed.data.decision,
    submissionRevision: submission.revision,
    currentRevision
  });
  if (!decision.allowed) {
    return Response.json({ error: "Review rejected", reason: decision.reason }, { status: 409 });
  }

  const reviewer = actor.role === "ADMIN"
    ? await db.instructorProfile.findFirst({ where: { userId: actor.sub } })
    : submission.enrollment.course.instructor;
  if (!reviewer) return Response.json({ error: "Faculty profile required for review attribution" }, { status: 403 });

  const review = await db.$transaction(async (tx) => {
    const created = await tx.capstoneReview.create({
      data: {
        submissionId: submission.id,
        reviewerId: reviewer.id,
        decision: parsed.data.decision,
        feedback: parsed.data.feedback
      }
    });
    await tx.capstoneSubmission.update({
      where: { id: submission.id },
      data: { status: parsed.data.decision }
    });
    return created;
  });

  return Response.json({ review }, { status: 201 });
}
