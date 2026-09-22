import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export default async function LearnCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireRole("STUDENT", "/library");
  const { slug } = await params;
  const db = getDb();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      instructor: true,
      sections: { include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } }
    }
  });
  if (!course) notFound();

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.sub, courseId: course.id } },
    include: { entitlement: true, progress: true }
  });
  const entitlement = enrollment?.entitlement;
  const expired = entitlement?.expiresAt ? entitlement.expiresAt.getTime() <= Date.now() : false;
  if (!enrollment || !entitlement || entitlement.status !== "ACTIVE" || entitlement.revokedAt || expired) {
    redirect(`/courses/${course.slug}?access=required`);
  }

  const completed = new Set(
    enrollment.progress.filter((item) => item.completedAt).map((item) => item.lessonId)
  );

  return <main className="page">
    <div className="eyebrow">Learning workspace</div>
    <h1>{course.title}</h1>
    <p className="muted">Access is backed by entitlement {entitlement.id}.</p>
    <div className="panel">
      {course.sections.map((section) => <section key={section.id}>
        <h2>{section.title}</h2>
        <div className="list">
          {section.lessons.map((lesson) => <div className="row" key={lesson.id}>
            <span>{completed.has(lesson.id) ? "✓" : "○"} {lesson.title}</span>
            <span className="muted">{lesson.type}{lesson.durationSeconds ? ` · ${Math.ceil(lesson.durationSeconds / 60)} min` : ""}</span>
          </div>)}
        </div>
      </section>)}
    </div>
  </main>;
}
