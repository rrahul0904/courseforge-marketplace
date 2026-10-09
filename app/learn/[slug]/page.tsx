import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { completionPercent } from "@/domain/learning.mjs";
import { cohortLearningSpaceDecision, eventRecordingState } from "@/domain/cohort-learning.mjs";
import LearningActions from "./LearningActions";
import CapstoneActions from "./CapstoneActions";
import CohortPicker from "./CohortPicker";

export default async function LearnCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireRole("STUDENT", "/library");
  const { slug } = await params;
  const db = getDb();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      instructor: true,
      cohorts: {
        select: {
          id: true,
          name: true,
          status: true,
          startsAt: true,
          endsAt: true,
          enrollmentOpensAt: true,
          enrollmentClosesAt: true,
          capacity: true
        },
        orderBy: { startsAt: "asc" }
      },
      sections: { include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } }
    }
  });
  if (!course) notFound();

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.sub, courseId: course.id } },
    include: {
      entitlement: true,
      progress: true,
      cohortSeats: { include: { cohort: { include: { events: { orderBy: { startsAt: "asc" } } } } } },
      capstoneSubmissions: { include: { review: true }, orderBy: { revision: "desc" } }
    }
  });
  const entitlement = enrollment?.entitlement;
  const expired = entitlement?.expiresAt ? entitlement.expiresAt.getTime() <= Date.now() : false;
  if (!enrollment || !entitlement || entitlement.status !== "ACTIVE" || entitlement.revokedAt || expired) {
    redirect(`/courses/${course.slug}?access=required`);
  }

  const eligibleSeats = enrollment.cohortSeats
    .filter((seat) => new Set(["RESERVED", "ACTIVE", "COMPLETED"]).has(seat.status))
    .sort((a, b) => b.cohort.startsAt.getTime() - a.cohort.startsAt.getTime());
  const currentSeat = eligibleSeats[0] ?? null;
  if (course.cohorts.length > 0 && !currentSeat) {
    const now = Date.now();
    const reservable = course.cohorts.filter((cohort) => {
      if (cohort.status !== "OPEN") return false;
      if (cohort.enrollmentOpensAt && cohort.enrollmentOpensAt.getTime() > now) return false;
      if (cohort.enrollmentClosesAt && cohort.enrollmentClosesAt.getTime() <= now) return false;
      return true;
    });
    return <main className="page">
      <div className="eyebrow">Learning workspace</div>
      <h1>{course.title}</h1>
      <p className="muted">Your entitlement is active. A cohort seat is required before live learning content opens.</p>
      <CohortPicker cohorts={reservable.map((cohort) => ({
        id: cohort.id,
        name: cohort.name,
        startsAt: cohort.startsAt.toISOString(),
        endsAt: cohort.endsAt.toISOString(),
        capacity: cohort.capacity
      }))} />
    </main>;
  }
  if (currentSeat) {
    const access = cohortLearningSpaceDecision({ entitlement, seatStatus: currentSeat.status });
    if (!access.allowed) redirect(`/courses/${course.slug}?cohort=required`);
  }

  const completed = new Set(
    enrollment.progress.filter((item) => item.completedAt).map((item) => item.lessonId)
  );
  const lessonIds = course.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id));
  const completedLessons = lessonIds.filter((lessonId) => completed.has(lessonId)).length;
  const progressPercent = completionPercent({ totalLessons: lessonIds.length, completedLessons });
  const latestSubmission = enrollment.capstoneSubmissions[0] ?? null;

  return <main className="page">
    <div className="eyebrow">Learning workspace</div>
    <h1>{course.title}</h1>
    <p className="muted">Access is backed by entitlement {entitlement.id}{currentSeat ? ` · ${currentSeat.cohort.name}` : ""}.</p>

    {currentSeat ? <div className="panel">
      <h2>Cohort schedule</h2>
      <p className="muted">{currentSeat.cohort.name} · {currentSeat.status}</p>
      <div className="list">
        {currentSeat.cohort.events.length ? currentSeat.cohort.events.map((event) => {
          const recordingState = eventRecordingState({ event });
          return <div className="row" key={event.id}>
            <div>
              <strong>{event.title}</strong>
              <div className="muted">{event.type.replaceAll("_", " ")} · {event.startsAt.toLocaleString()}</div>
            </div>
            <div>
              {event.joinUrl && recordingState === "NOT_YET_AVAILABLE" ? <a href={event.joinUrl}>Join live</a> : null}
              {recordingState === "AVAILABLE" && event.recordingUrl ? <a href={event.recordingUrl}>Watch recording</a> : null}
              {recordingState === "NOT_POSTED" ? <span className="muted">Recording not posted</span> : null}
            </div>
          </div>;
        }) : <p className="muted">No cohort events have been scheduled yet.</p>}
      </div>
    </div> : null}

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

    {course.requiresCapstone ? <>
      <div className="panel">
        <h2>Capstone evidence</h2>
        {enrollment.capstoneSubmissions.length ? <div className="list">
          {enrollment.capstoneSubmissions.map((submission) => <div key={submission.id}>
            <strong>Revision {submission.revision} · {submission.status}</strong>
            <p className="muted">{submission.summary}</p>
            {submission.artifactUrl ? <p><a href={submission.artifactUrl}>Open submitted artifact</a></p> : null}
            {submission.review?.feedback ? <p>Faculty feedback: {submission.review.feedback}</p> : null}
          </div>)}
        </div> : <p className="muted">Your capstone history will remain versioned here after each submission.</p>}
      </div>
      <CapstoneActions
        courseId={course.id}
        latestStatus={latestSubmission?.status ?? null}
        latestRevision={latestSubmission?.revision ?? null}
      />
    </> : null}

    <LearningActions courseId={course.id} progressPercent={progressPercent} requiresCapstone={course.requiresCapstone} />
  </main>;
}
