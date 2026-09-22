import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export default async function LibraryPage() {
  const actor = await requireRole("STUDENT", "/library");
  const enrollments = await getDb().enrollment.findMany({
    where: {
      userId: actor.sub,
      entitlement: { is: { status: "ACTIVE", revokedAt: null } }
    },
    include: {
      entitlement: true,
      progress: true,
      course: {
        include: {
          instructor: true,
          sections: { include: { lessons: true } }
        }
      }
    },
    orderBy: { enrolledAt: "desc" }
  });

  const active = enrollments.filter((enrollment) => {
    const expiresAt = enrollment.entitlement?.expiresAt;
    return !expiresAt || expiresAt.getTime() > Date.now();
  });

  return <main className="page">
    <div className="eyebrow">My learning</div>
    <h1>Your CourseForge library</h1>
    {active.length === 0 ? <div className="panel">
      <h3>No active courses yet.</h3>
      <p className="muted">A course appears here only after a verified payment creates an active entitlement and enrollment.</p>
      <Link className="button" href="/courses">Explore courses</Link>
    </div> : <div className="grid">
      {active.map((enrollment) => {
        const totalLessons = enrollment.course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
        const completedLessons = enrollment.progress.filter((item) => item.completedAt).length;
        const percent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
        return <Link className="card" href={`/learn/${enrollment.course.slug}`} key={enrollment.id}>
          <span className="badge">{enrollment.course.level}</span>
          <h3>{enrollment.course.title}</h3>
          <p className="muted">By {enrollment.course.instructor.userId === actor.sub ? "You" : enrollment.course.instructor.slug}</p>
          <div className="price">{percent}%</div>
          <p className="muted">{completedLessons} of {totalLessons} lessons completed</p>
        </Link>;
      })}
    </div>}
  </main>;
}
