import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = getDb();
  const certificate = await db.certificate.findUnique({
    where: { verificationCode: code },
    include: { user: true, course: { include: { instructor: { include: { user: true } } } } }
  });
  if (!certificate) notFound();

  const valid = !certificate.revokedAt;
  return <main className="page">
    <div className="eyebrow">CourseForge certificate verification</div>
    <h1>{valid ? "Verified completion" : "Certificate revoked"}</h1>
    <div className="panel">
      <p><strong>Learner:</strong> {certificate.user.name ?? certificate.user.email}</p>
      <p><strong>Course:</strong> {certificate.course.title}</p>
      <p><strong>Instructor:</strong> {certificate.course.instructor.user.name ?? certificate.course.instructor.user.email}</p>
      <p><strong>Issued:</strong> {certificate.issuedAt.toLocaleDateString("en-US")}</p>
      <p><strong>Verification code:</strong> {certificate.verificationCode}</p>
      <p className="muted">Status: {valid ? "VALID" : `REVOKED ${certificate.revokedAt?.toLocaleDateString("en-US")}`}</p>
    </div>
  </main>;
}
