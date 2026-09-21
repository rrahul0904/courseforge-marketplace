import { requireRole } from "@/lib/auth/session";

export default async function Studio(){
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  return <main className="page"><div className="eyebrow">Instructor Studio</div><h1>Build, publish and grow your teaching business.</h1><p className="muted">Signed in as {actor.email}</p><div className="grid"><div className="card"><span className="badge">Draft</span><h3>AI Agents: Production Lab</h3><p className="muted">12 lessons · 3 quizzes · 1 project</p><strong>72% publishing readiness</strong></div><div className="card"><h3>Revenue</h3><div className="price">$8,420</div><p className="muted">Gross sales this month</p><p>Instructor share: $7,157</p></div><div className="card"><h3>Learner outcomes</h3><div className="price">68%</div><p className="muted">Completion rate</p><p>4.8 average rating</p></div></div></main>
}
