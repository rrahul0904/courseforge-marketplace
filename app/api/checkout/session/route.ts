import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { AcquisitionChannel, splitTransactionalRevenue } from "@/domain/commerce.mjs";
import { persistedPayoutReadiness } from "@/domain/payout-readiness.mjs";

const schema = z.object({
  priceId: z.string().min(1),
  acquisitionChannel: z.enum([AcquisitionChannel.MARKETPLACE, AcquisitionChannel.INSTRUCTOR_REFERRAL])
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
  const instructor = price?.product.course?.instructor;
  if (
    !price?.active ||
    !price.providerPriceId ||
    !instructor ||
    instructor.status !== "APPROVED" ||
    !persistedPayoutReadiness(instructor)
  ) {
    return Response.json({ error: "This course is not checkout-ready" }, { status: 409 });
  }

  const split = splitTransactionalRevenue({
    netCents: price.amountCents,
    channel: parsed.data.acquisitionChannel
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
      acquisitionChannel: parsed.data.acquisitionChannel,
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
    connectedAccountId: instructor.payoutAccountId!,
    applicationFeeCents: split.platformCents,
    successUrl: `${appUrl}/orders/${order.id}/success`,
    cancelUrl: `${appUrl}/courses/${price.product.course!.slug}?checkout=cancelled`,
    customerEmail: actor.email,
    acquisitionChannel: parsed.data.acquisitionChannel
  });
  return Response.json({ orderId: order.id, checkoutUrl: checkout.url }, { status: 201 });
}
