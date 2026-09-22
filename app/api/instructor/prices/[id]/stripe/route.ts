import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { syncStripePayoutStatus } from "@/lib/instructors/payouts";
import { createStripeCataloguePrice } from "@/lib/payments/stripe";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  if (!profile || profile.status !== "APPROVED" || !profile.payoutAccountId) {
    return Response.json({ error: "Approved connected instructor required" }, { status: 409 });
  }

  let payoutStatus;
  try {
    payoutStatus = await syncStripePayoutStatus(actor.sub);
  } catch {
    return Response.json({ error: "Payout readiness could not be verified" }, { status: 503 });
  }
  if (!payoutStatus.readiness.ready) {
    return Response.json({ error: "Payout-ready instructor required", gaps: payoutStatus.readiness.blockers }, { status: 409 });
  }

  const price = await db.price.findUnique({
    where: { id },
    include: { product: { include: { course: true } } }
  });
  const course = price?.product.course;
  if (!price || !course || course.instructorId !== profile.id) {
    return Response.json({ error: "Price not found" }, { status: 404 });
  }
  if (price.providerPriceId) {
    return Response.json({ priceId: price.id, providerPriceId: price.providerPriceId, existing: true });
  }
  if (!["DRAFT", "IN_REVIEW"].includes(course.status)) {
    return Response.json({ error: "Price mapping is locked for this course state" }, { status: 409 });
  }

  const provider = await createStripeCataloguePrice({
    courseId: course.id,
    priceId: price.id,
    productName: price.product.name,
    amountCents: price.amountCents,
    currency: price.currency
  });
  const updated = await db.price.update({
    where: { id: price.id },
    data: { providerPriceId: provider.priceId }
  });
  return Response.json({
    price: updated,
    providerProductId: provider.productId,
    providerPriceId: provider.priceId
  }, { status: 201 });
}
