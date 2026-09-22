import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assessPublishDecision } from "@/domain/publishing.mjs";
import { persistedPayoutReadiness } from "@/domain/payout-readiness.mjs";

const schema = z.object({
  decision: z.enum(["PUBLISH", "RETURN_TO_DRAFT", "SUSPEND"])
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN", "/admin");
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const course = await db.course.findUnique({
    where: { id },
    include: {
      instructor: true,
      products: { include: { prices: true } }
    }
  });
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });

  if (parsed.data.decision === "RETURN_TO_DRAFT") {
    if (course.status !== "IN_REVIEW") {
      return Response.json({ error: "Only courses under review can be returned" }, { status: 409 });
    }
    const updated = await db.course.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null }
    });
    return Response.json({ course: updated });
  }

  if (parsed.data.decision === "SUSPEND") {
    if (!["PUBLISHED", "IN_REVIEW"].includes(course.status)) {
      return Response.json({ error: "Course is not in a suspendable state" }, { status: 409 });
    }
    const updated = await db.course.update({ where: { id }, data: { status: "SUSPENDED" } });
    return Response.json({ course: updated });
  }

  const checkoutPriceCount = course.products.reduce(
    (sum, product) => sum + product.prices.filter((price) => price.active && price.providerPriceId).length,
    0
  );
  const readiness = assessPublishDecision({
    status: course.status,
    instructorApproved: course.instructor.status === "APPROVED",
    payoutReady: persistedPayoutReadiness(course.instructor),
    checkoutPriceCount
  });
  if (!readiness.ready) {
    return Response.json({ error: "Course cannot be published", gaps: readiness.gaps }, { status: 409 });
  }

  const updated = await db.course.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() }
  });
  return Response.json({ course: updated, readiness });
}
