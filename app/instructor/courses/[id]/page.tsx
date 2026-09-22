import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { persistedPayoutReadiness } from "@/domain/payout-readiness.mjs";
import CourseEditorControls from "./CourseEditorControls";

export default async function InstructorCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("INSTRUCTOR", "/instructor/studio");
  const { id } = await params;
  const db = getDb();
  const profile = await db.instructorProfile.findUnique({ where: { userId: actor.sub } });
  if (!profile) notFound();

  const course = await db.course.findFirst({
    where: { id, instructorId: profile.id },
    include: {
      sections: { include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } },
      products: { include: { prices: { orderBy: { createdAt: "asc" } } } }
    }
  });
  if (!course) notFound();

  const price = course.products.flatMap((product) => product.prices).find((item) => item.active);
  return <main className="page">
    <div className="eyebrow">Course editor · {course.status}</div>
    <h1>{course.title}</h1>
    <p className="muted">{course.description}</p>
    <div className="panel">
      <div className="row"><span>Category</span><strong>{course.category}</strong></div>
      <div className="row"><span>Level</span><strong>{course.level}</strong></div>
      <div className="row"><span>Sections</span><strong>{course.sections.length}</strong></div>
      <div className="row"><span>Lessons</span><strong>{course.sections.reduce((sum, section) => sum + section.lessons.length, 0)}</strong></div>
      <div className="row"><span>Price</span><strong>{price ? new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amountCents / 100) : "Missing"}</strong></div>
    </div>
    <div className="section">
      <h2>Curriculum</h2>
      <div className="list">{course.sections.map((section) => <div className="panel" key={section.id}>
        <h3>{section.position}. {section.title}</h3>
        {section.lessons.length ? section.lessons.map((lesson) => <div className="row" key={lesson.id}><span>{lesson.position}. {lesson.title}</span><span className="muted">{lesson.type}</span></div>) : <p className="muted">No lessons yet.</p>}
      </div>)}</div>
    </div>
    <CourseEditorControls
      courseId={course.id}
      status={course.status}
      sections={course.sections.map((section) => ({ id: section.id, title: section.title, lessons: section.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, type: lesson.type })) }))}
      priceId={price?.id}
      providerPriceId={price?.providerPriceId}
      payoutReady={persistedPayoutReadiness(profile)}
    />
  </main>;
}
