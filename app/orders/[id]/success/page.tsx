import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export default async function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("STUDENT", "/library");
  const { id } = await params;
  const order = await getDb().order.findFirst({
    where: { id, userId: actor.sub },
    include: { entitlements: true }
  });
  if (!order) notFound();

  const paid = order.status === "PAID";
  return <main className="page">
    <div className="eyebrow">Order {order.id}</div>
    <h1>{paid ? "Payment verified." : "Payment confirmation is still processing."}</h1>
    <div className="panel">
      <p>Status: <strong>{order.status}</strong></p>
      <p>Entitlements: <strong>{order.entitlements.length}</strong></p>
      <p className="muted">{paid
        ? "Your verified entitlement has been created from the signed payment webhook."
        : "CourseForge does not grant access from the browser redirect alone. Access appears only after the signed provider webhook marks the order paid."}</p>
      <Link className="button" href="/library">Open library</Link>
    </div>
  </main>;
}
