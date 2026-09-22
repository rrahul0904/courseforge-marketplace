import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import CheckoutButton from "./CheckoutButton";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; checkout?: string; access?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const course = await getDb().course.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      instructor: { include: { user: true } },
      reviews: true,
      sections: {
        include: { lessons: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" }
      },
      products: {
        where: { active: true },
        include: {
          prices: {
            where: { active: true, providerPriceId: { not: null } },
            orderBy: { createdAt: "asc" },
            take: 1
          }
        }
      },
      _count: { select: { enrollments: true } }
    }
  });
  if (!course) notFound();

  const price = course.products.flatMap((product) => product.prices)[0];
  const ratings = course.reviews.map((review) => review.rating);
  const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
  const totalSeconds = course.sections.reduce(
    (sum, section) => sum + section.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.durationSeconds ?? 0), 0),
    0
  );

  return <main className="page">
    <div className="courseHero">
      <section>
        <span className="badge">{course.category}</span>
        <h1>{course.title}</h1>
        <p className="muted">{course.subtitle ?? course.description}</p>
        <p>Created by <strong>{course.instructor.user.name ?? course.instructor.slug}</strong></p>
        <p>{average ? `★ ${average.toFixed(1)} · ` : ""}{course._count.enrollments.toLocaleString()} learners · {course.level}</p>
        {query.access === "required" ? <p className="muted">An active entitlement is required to open the learning workspace.</p> : null}
        {query.checkout === "cancelled" ? <p className="muted">Checkout was cancelled. No entitlement was created.</p> : null}
        <div className="panel">
          <h2>Course curriculum</h2>
          <div className="list">{course.sections.map((section) =>
            <div key={section.id}>
              <h3>{section.title}</h3>
              {section.lessons.map((lesson) => <div className="row" key={lesson.id}>
                <span>{lesson.isPreview ? "Preview · " : ""}{lesson.title}</span>
                <span>{lesson.durationSeconds ? `${Math.ceil(lesson.durationSeconds / 60)} min` : lesson.type}</span>
              </div>)}
            </div>
          )}</div>
        </div>
      </section>
      <aside className="panel">
        <div className="price">{price
          ? new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amountCents / 100)
          : "Not for sale"}</div>
        <p className="muted">{totalSeconds ? `${Math.ceil(totalSeconds / 3600)} hours of course material` : "Self-paced course"}</p>
        {price ? <CheckoutButton priceId={price.id} referralToken={query.ref} /> : <p className="muted">No provider-backed checkout price is active.</p>}
        <p className="muted">Access is granted only after CourseForge validates the signed Stripe webhook and creates an entitlement.</p>
      </aside>
    </div>
  </main>;
}
