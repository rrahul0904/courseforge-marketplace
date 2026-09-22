import { getDb } from "@/lib/db";
import { verifyStripeWebhookSignature } from "@/lib/payments/stripe";
import { refundOutcome } from "@/domain/refunds.mjs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyStripeWebhookSignature(rawBody, request.headers.get("stripe-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(rawBody) as {
    id: string;
    type: string;
    data?: { object?: {
      id?: string;
      payment_status?: string;
      payment_intent?: string | null;
      amount?: number;
      amount_refunded?: number;
      metadata?: Record<string, string>;
    } };
  };
  const db = getDb();
  const existing = await db.webhookEvent.findUnique({
    where: { provider_providerEventId: { provider: "stripe", providerEventId: event.id } }
  });
  if (existing) return Response.json({ received: true, duplicate: true });

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const orderId = session?.metadata?.orderId;
    if (orderId && session?.payment_status === "paid") {
      await db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } } }
        });
        if (!order) throw new Error(`Order ${orderId} not found`);
        if (order.status !== "PAID") {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.id ?? null,
              paidAt: new Date()
            }
          });
          for (const item of order.items) {
            const entitlement = await tx.entitlement.create({
              data: { orderId: order.id, userId: order.userId, productId: item.productId, status: "ACTIVE" }
            });
            if (item.product.courseId) {
              await tx.enrollment.upsert({
                where: { userId_courseId: { userId: order.userId, courseId: item.product.courseId } },
                update: { entitlementId: entitlement.id },
                create: {
                  userId: order.userId,
                  courseId: item.product.courseId,
                  entitlementId: entitlement.id
                }
              });
            }
          }
        }
        await tx.webhookEvent.create({
          data: { provider: "stripe", providerEventId: event.id, eventType: event.type }
        });
      });
    } else {
      await db.webhookEvent.create({
        data: { provider: "stripe", providerEventId: event.id, eventType: event.type }
      });
    }
  } else if (event.type === "charge.refunded") {
    const charge = event.data?.object;
    const paymentIntentId = typeof charge?.payment_intent === "string" ? charge.payment_intent : null;
    if (paymentIntentId && Number.isInteger(charge?.amount_refunded)) {
      await db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { providerPaymentId: paymentIntentId },
          include: { entitlements: { include: { enrollment: { include: { certificate: true } } } } }
        });
        if (!order) throw new Error(`Order for payment ${paymentIntentId} not found`);
        const outcome = refundOutcome({ netCents: order.netCents, amountRefundedCents: charge?.amount_refunded ?? 0 });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: outcome.status,
            refundedCents: outcome.refundedCents,
            refundedAt: outcome.refundedCents > 0 ? new Date() : null
          }
        });
        if (outcome.revokeEntitlements) {
          const revokedAt = new Date();
          await tx.entitlement.updateMany({
            where: { orderId: order.id, status: "ACTIVE" },
            data: { status: "REVOKED", revokedAt }
          });
          for (const entitlement of order.entitlements) {
            if (entitlement.enrollment?.certificate && !entitlement.enrollment.certificate.revokedAt) {
              await tx.certificate.update({
                where: { id: entitlement.enrollment.certificate.id },
                data: { revokedAt }
              });
            }
          }
        }
        await tx.webhookEvent.create({
          data: { provider: "stripe", providerEventId: event.id, eventType: event.type }
        });
      });
    } else {
      await db.webhookEvent.create({
        data: { provider: "stripe", providerEventId: event.id, eventType: event.type }
      });
    }
  } else {
    await db.webhookEvent.create({
      data: { provider: "stripe", providerEventId: event.id, eventType: event.type }
    });
  }
  return Response.json({ received: true });
}
