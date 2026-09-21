import Link from "next/link";
import { courses } from "@/lib/demo-data";

export default function Courses(){
  return <main className="page"><div className="eyebrow">Marketplace</div><h1>Explore courses</h1><p className="muted">The catalogue is public; purchase and learner-access actions fail closed until identity and payment requirements are satisfied.</p><div className="grid">{courses.map(c=><Link key={c.slug} href={`/courses/${c.slug}`} className="card"><span className="badge">{c.level}</span><h3>{c.title}</h3><p className="muted">{c.summary}</p><p>{c.instructor}</p><p>★ {c.rating} · {c.learners.toLocaleString()} learners</p><div className="price">${c.price}</div></Link>)}</div></main>
}
