import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { CourseDecision, InstructorDecision } from "./AdminActions";

export default async function Admin() {
  const actor = await requireRole("ADMIN", "/admin");
  const db = getDb();
  const [instructors, courses, payoutAggregate] = await Promise.all([
    db.instructorProfile.findMany({
      where: { status: { in: ["APPLIED", "UNDER_REVIEW"] } },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    }),
    db.course.findMany({
      where: { status: "IN_REVIEW" },
      include: {
        instructor: { include: { user: true } },
        sections: { include: { lessons: true } },
        products: { include: { prices: true } }
      },
      orderBy: { updatedAt: "asc" }
    }),
    db.payout.aggregate({
      where: { status: { in: ["PENDING", "HELD"] } },
      _sum: { amountCents: true },
      _count: { _all: true }
    })
  ]);

  return <main className="page">
    <div className="eyebrow">Platform administration</div>
    <h1>Marketplace control plane</h1>
    <p className="muted">Administrator: {actor.email}</p>
    <div className="grid">
      <div className="card"><h3>Course review queue</h3><div className="price">{courses.length}</div><p className="muted">Courses awaiting moderation</p></div>
      <div className="card"><h3>Instructor queue</h3><div className="price">{instructors.length}</div><p className="muted">Applications awaiting decision</p></div>
      <div className="card"><h3>Payouts pending/held</h3><div className="price">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((payoutAggregate._sum.amountCents ?? 0) / 100)}</div><p className="muted">{payoutAggregate._count._all} payout records</p></div>
    </div>

    <section className="section">
      <h2>Instructor applications</h2>
      <div className="list">{instructors.length ? instructors.map((profile) => <div className="panel" key={profile.id}>
        <div className="row"><span>{profile.user.name ?? profile.user.email}</span><span className="badge">{profile.status}</span></div>
        <p>{profile.headline}</p>
        <p className="muted">{profile.bio}</p>
        <p className="muted">Expertise: {profile.expertise.join(", ")}</p>
        <InstructorDecision id={profile.id} />
      </div>) : <p className="muted">No instructor applications waiting.</p>}</div>
    </section>

    <section className="section">
      <h2>Course review queue</h2>
      <div className="list">{courses.length ? courses.map((course) => {
        const lessonCount = course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
        const checkoutPrices = course.products.flatMap((product) => product.prices).filter((price) => price.active && price.providerPriceId).length;
        return <div className="panel" key={course.id}>
          <div className="row"><span><strong>{course.title}</strong> · {course.instructor.user.name ?? course.instructor.slug}</span><span className="badge">{course.status}</span></div>
          <p className="muted">{course.sections.length} sections · {lessonCount} lessons · {checkoutPrices} provider checkout prices</p>
          <CourseDecision id={course.id} />
        </div>;
      }) : <p className="muted">No courses waiting for review.</p>}</div>
    </section>
  </main>;
}
