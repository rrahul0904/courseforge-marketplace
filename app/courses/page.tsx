import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Courses() {
  const courses = await getDb().course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      instructor: { include: { user: true } },
      reviews: true,
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
    },
    orderBy: { publishedAt: "desc" }
  });

  return <main className="page">
    <div className="eyebrow">Marketplace</div>
    <h1>Explore courses</h1>
    <p className="muted">Only moderated, published courses are listed. Checkout remains fail-closed unless the course price and instructor payout account are provider-ready.</p>
    {courses.length === 0 ? <div className="panel"><h3>No published courses yet.</h3><p className="muted">The review queue is the source of truth for marketplace publication.</p></div> :
      <div className="grid">{courses.map((course) => {
        const ratings = course.reviews.map((review) => review.rating);
        const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
        const price = course.products.flatMap((product) => product.prices)[0];
        return <Link key={course.slug} href={`/courses/${course.slug}`} className="card">
          <span className="badge">{course.level}</span>
          <h3>{course.title}</h3>
          <p className="muted">{course.subtitle ?? course.description.slice(0, 130)}</p>
          <p>{course.instructor.user.name ?? course.instructor.slug}</p>
          <p>{average ? `★ ${average.toFixed(1)} · ` : ""}{course._count.enrollments.toLocaleString()} learners</p>
          <div className="price">{price ? new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amountCents / 100) : "Unavailable"}</div>
        </Link>;
      })}</div>}
  </main>;
}
