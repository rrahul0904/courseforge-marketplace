import { requireRole } from "@/lib/auth/session";
import NewCourseForm from "./NewCourseForm";

export default async function NewCoursePage() {
  await requireRole("INSTRUCTOR", "/instructor/courses/new");
  return <main className="page">
    <div className="eyebrow">Instructor Studio</div>
    <h1>Create a new course</h1>
    <p className="muted">New courses begin as drafts and cannot reach the marketplace until content review, provider pricing and payout readiness all pass.</p>
    <NewCourseForm />
  </main>;
}
