import { requireRole } from "@/lib/auth/session";

export default async function Admin(){
  const actor = await requireRole("ADMIN", "/admin");
  return <main className="page"><div className="eyebrow">Platform administration</div><h1>Marketplace control plane</h1><p className="muted">Administrator: {actor.email}</p><div className="grid"><div className="card"><h3>Course review queue</h3><div className="price">14</div><p className="muted">3 require policy review</p></div><div className="card"><h3>Payouts pending</h3><div className="price">$21,480</div><p className="muted">Across 42 instructors</p></div><div className="card"><h3>Refund rate</h3><div className="price">2.7%</div><p className="muted">Rolling 30 days</p></div></div></main>
}
