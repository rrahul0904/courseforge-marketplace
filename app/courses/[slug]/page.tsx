import { getCourse } from "@/lib/demo-data";
import { notFound } from "next/navigation";

export default async function CoursePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const course=getCourse(slug);
  if(!course)notFound();
  return <main className="page"><div className="courseHero"><section><span className="badge">{course.category}</span><h1>{course.title}</h1><p className="muted">{course.summary}</p><p>Created by <strong>{course.instructor}</strong></p><p>★ {course.rating} · {course.learners.toLocaleString()} learners · {course.level}</p><div className="panel"><h2>What you'll learn</h2><div className="list"><div className="row"><span>01 · Foundations and architecture</span><span>42 min</span></div><div className="row"><span>02 · Guided implementation</span><span>68 min</span></div><div className="row"><span>03 · Production project</span><span>95 min</span></div><div className="row"><span>04 · Assessment and certificate</span><span>30 min</span></div></div></div></section><aside className="panel"><div className="price">${course.price}</div><p className="muted">The production checkout endpoint creates the order first, calculates the persisted platform/instructor split, and only grants access after a signed Stripe webhook confirms payment.</p><p className="muted">Seeded database pricing and connected-instructor onboarding are the next infrastructure slice.</p></aside></div></main>
}
