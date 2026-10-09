import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isEntitlementActive } from "@/domain/learning.mjs";
import { cohortReservationDecision } from "@/domain/cohort-learning.mjs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("STUDENT", "/library");
  const { id } = await params;
  const db = getDb();

  const cohort = await db.cohort.findUnique({ where: { id }, select: { id: true, courseId: true } });
  if (!cohort) return Response.json({ error: "Cohort not found" }, { status: 404 });

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.sub, courseId: cohort.courseId } },
    include: { entitlement: true, cohortSeats: true }
  });
  if (!enrollment?.entitlement || !isEntitlementActive(enrollment.entitlement)) {
    return Response.json({ error: "Active course entitlement required" }, { status: 403 });
  }

  const existing = enrollment.cohortSeats.find((seat) => seat.cohortId === cohort.id);
  if (existing) return Response.json({ seat: existing, replay: true });
  if (enrollment.cohortSeats.some((seat) => seat.status !== "CANCELLED")) {
    return Response.json({ error: "A later cohort is a retake and requires a separate active retake benefit", reason: "RETAKE_REQUIRES_MEMBERSHIP" }, { status: 409 });
  }

  try {
    const seat = await db.$transaction(async (tx) => {
      const freshCohort = await tx.cohort.findUnique({ where: { id: cohort.id } });
      if (!freshCohort) throw new Error("COHORT_MISSING");
      const activeSeats = await tx.cohortSeat.count({
        where: { cohortId: cohort.id, status: { in: ["RESERVED", "ACTIVE", "COMPLETED"] } }
      });
      const decision = cohortReservationDecision({ cohort: freshCohort, activeSeats });
      if (!decision.allowed) throw new Error(decision.reason);
      return tx.cohortSeat.create({
        data: { enrollmentId: enrollment.id, cohortId: cohort.id, status: "RESERVED" }
      });
    }, { isolationLevel: "Serializable" });
    return Response.json({ seat }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") {
      const seat = await db.cohortSeat.findUnique({ where: { enrollmentId_cohortId: { enrollmentId: enrollment.id, cohortId: cohort.id } } });
      if (seat) return Response.json({ seat, replay: true });
    }
    if (code === "P2034") return Response.json({ error: "Cohort capacity changed while reserving; retry safely" }, { status: 409 });
    const reason = error instanceof Error ? error.message : "RESERVATION_FAILED";
    if (new Set(["COHORT_MISSING", "COHORT_NOT_OPEN", "ENROLLMENT_NOT_STARTED", "ENROLLMENT_CLOSED", "COHORT_FULL"]).has(reason)) {
      return Response.json({ error: "Cohort cannot be reserved", reason }, { status: 409 });
    }
    throw error;
  }
}
