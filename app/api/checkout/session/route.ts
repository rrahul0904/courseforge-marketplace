import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { syncStripePayoutStatus } from "@/lib/instructors/payouts";
import { AcquisitionChannel, splitTransactionalRevenue } from "@/domain/commerce.mjs";
import { verifyReferralToken } from "@/domain/referral.mjs";

const schema = z.object({
  priceId: z.string().min(1),
  referralToken: z.string().optional()
});

export async function POST(request: Request) {
  const actor = await requireRole("STUDENT", "/courses");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const price = await db.price.findUnique({
    where: { id: parsed.data.priceId },
    include: { product: { include: { course: { include: { instructor: true } } } } }
  });
  const course = price?.product.course;
  const instructor = course?.instructor;
  if (
    !price?.active ||
    !price.providerPriceId ||
    !course ||
    !instructor ||
    course.status !== "PUBLISHED" ||
    instructor.status !== "APPROVED" ||
    !instructor.payoutAccountId
  ) {
    return Response.json({ error: "This course is not checkout-ready" }, { status: 409 });
  }

  let payoutStatus;
  try {
    payoutStatus = await syncStripePayoutStatus(instructor.userId);
  } catch {
    return Response.json({ error: "Instructor payout readiness could not be verified" }, { status: 503 });
  }
  if (!payoutStatus.readiness.ready || !payoutStatus.profile?.payoutAccountId) {
    return Response.json({ error: "This course is not checkout-ready" }, { status: 409 });
  }

  let acquisitionChannel = AcquisitionChannel.MARKETPLACE;
  if (parsed.data.referralToken) {
    const referral = verifyReferralToken(
      parsed.data.referralToken,
      process.env.COURSEFORGE_REFERRAL_SECRET
    );
    if (
      !referral ||
      referral.instructorId !== instructor.id ||
      referral.courseId !== course.id
    ) {
      return Response.json({ error: "Invalid instructor referral" }, { status: 400 });
    }
    acquisitionChannel = AcquisitionChannel.INSTRUCTOR_REFERRAL;
  }

  const split = splitTransactionalRevenue({
    netCents: price.amountCents,
    channel: acquisitionChannel
  });
  await db.user.upsert({
    where: { id: actor.sub },
    update: { email: actor.email, name: actor.name },
    create: { id: actor.sub, email: actor.email, name: actor.name, role: actor.role }
  });

  const order = await db.order.create({
    data: {
      userId: actor.sub,
      status: "PENDING",
      currency: price.currency,
      grossCents: price.amountCents,
      netCents: price.amountCents,
      platformFeeCents: split.platformCents,
      instructorNetCents: split.instructorCents,
      paymentProvider: "stripe",
      acquisitionChannel,
      items: {
        create: {
          productId: price.productId,
          unitPriceCents: price.amountCents,
          quantity: 1
        }
      }
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const checkout = await createStripeCheckoutSession({
    orderId: order.id,
    providerPriceId: price.providerPriceId,
    connectedAccountId: payoutStatus.profile.payoutAccountId,
    applicationFeeCents: split.platformCents,
    successUrl: `${appUrl}/orders/${order.id}/success`,
    cancelUrl: `${appUrl}/courses/${course.slug}?checkout=cancelled`,
    customerEmail: actor.email,
    acquisitionChannel
  });
  return Response.json({ orderId: order.id, checkoutUrl: checkout.url }, { status: 201 });
}
