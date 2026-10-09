import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isEntitlementActive } from "@/domain/learning.mjs";

const schema = z.object({
  courseId: z.string().min(1),
  artifactUrl: z.string().url().max(2048),
  summary: z.string().trim().min(20).max(4000)
});

export async function POST(request: Request) {
  const actor = await requireRole("STUDENT", "/library");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.sub, courseId: parsed.data.courseId } },
    include: {
      entitlement: true,
      certificate: true,
      course: { select: { requiresCapstone: true } },
      capstoneSubmissions: { include: { review: true }, orderBy: { revision: "desc" }, take: 1 }
    }
  });

  if (!enrollment?.entitlement || !isEntitlementActive(enrollment.entitlement)) {
    return Response.json({ error: "Active enrollment required" }, { status: 403 });
  }
  if (!enrollment.course.requiresCapstone) {
    return Response.json({ error: "This course does not require a capstone" }, { status: 400 });
  }
  if (enrollment.certificate && !enrollment.certificate.revokedAt) {
    return Response.json({ error: "This enrollment is already certified; approved evidence is immutable" }, { status: 409 });
  }

  const latest = enrollment.capstoneSubmissions[0];
  if (latest && new Set(["SUBMITTED", "IN_REVIEW"]).has(latest.status)) {
    return Response.json({ error: "The latest capstone revision is already awaiting faculty review" }, { status: 409 });
  }
  if (latest?.status === "APPROVED") {
    return Response.json({ error: "The latest capstone revision is already approved" }, { status: 409 });
  }
  if (latest && latest.status !== "CHANGES_REQUESTED" && latest.status !== "DRAFT") {
    return Response.json({ error: "A new revision is not allowed from the current capstone state" }, { status: 409 });
  }

  const revision = (latest?.revision ?? 0) + 1;
  try {
    const submission = await db.capstoneSubmission.create({
      data: {
        enrollmentId: enrollment.id,
        revision,
        status: "SUBMITTED",
        artifactUrl: parsed.data.artifactUrl,
        summary: parsed.data.summary,
        submittedAt: new Date()
      },
      include: { review: true }
    });
    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") {
      return Response.json({ error: "That capstone revision was already created; refresh before retrying" }, { status: 409 });
    }
    throw error;
  }
}
