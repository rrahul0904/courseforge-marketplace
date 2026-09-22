import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { persistedPayoutReadiness } from "@/domain/payout-readiness.mjs";

export default async function Studio() {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const profile = await getDb().instructorProfile.findUnique({
    where: { userId: actor.sub },
    include: {
      courses: {
        include: {
          sections: { include: { lessons: true } },
          products: { include: { prices: true } },
          _count: { select: { enrollments: true } }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!profile) {
    return <main className="page">
      <div className="eyebrow">Instructor Studio</div>
      <h1>Instructor profile required.</h1>
      <Link className="button" href="/instructor/apply">Apply to teach</Link>
    </main>;
  }

  const payoutReady = persistedPayoutReadiness(profile);
  return <main className="page">
    <div className="eyebrow">Instructor Studio</div>
    <h1>Build, publish and grow your teaching business.</h1>
    <p className="muted">Signed in as {actor.email} · Instructor status {profile.status}</p>
    <div className="actions">
      <Link className="button" href="/instructor/courses/new">Create course</Link>
      <Link className="button secondary" href="/instructor/payouts">{payoutReady ? "Payouts ready" : "Finish payout setup"}</Link>
    </div>
    <div className="section">
      <div className="grid">{profile.courses.length ? profile.courses.map((course) => {
        const lessons = course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
        const activePrice = course.products.flatMap((product) => product.prices).find((price) => price.active);
        return <Link className="card" href={`/instructor/courses/${course.id}`} key={course.id}>
          <span className="badge">{course.status}</span>
          <h3>{course.title}</h3>
          <p className="muted">{course.sections.length} sections · {lessons} lessons · {course._count.enrollments} learners</p>
          <p>{activePrice ? new Intl.NumberFormat("en-US", { style: "currency", currency: activePrice.currency }).format(activePrice.amountCents / 100) : "No price"}</p>
          <p className="muted">{activePrice?.providerPriceId ? "Stripe checkout price ready" : "Provider price not created"}</p>
        </Link>;
      }) : <div className="panel"><h3>No courses yet.</h3><p className="muted">Create your first draft and build its curriculum before marketplace review.</p></div>}</div>
    </div>
  </main>;
}
