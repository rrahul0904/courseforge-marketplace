"use client";

import { FormEvent, useState } from "react";

type Cohort = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  events: Array<{ id: string; title: string; type: string; startsAt: string; endsAt: string }>;
};

export default function CohortManager({ courseId, cohorts }: { courseId: string; cohorts: Cohort[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState(cohorts[0]?.id ?? "");

  async function request(path: string, body: unknown) {
    setMessage(null);
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = typeof payload.error === "string" ? payload.error : "Request failed.";
      setMessage(detail);
      return null;
    }
    return payload;
  }

  async function createCohort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(String(form.get("startsAt"))).toISOString();
    const endsAt = new Date(String(form.get("endsAt"))).toISOString();
    const payload = await request(`/api/instructor/courses/${courseId}/cohorts`, {
      name: form.get("name"),
      slug: form.get("slug"),
      startsAt,
      endsAt,
      enrollmentOpensAt: form.get("enrollmentOpensAt") ? new Date(String(form.get("enrollmentOpensAt"))).toISOString() : undefined,
      enrollmentClosesAt: form.get("enrollmentClosesAt") ? new Date(String(form.get("enrollmentClosesAt"))).toISOString() : undefined,
      capacity: form.get("capacity") ? Number(form.get("capacity")) : undefined
    });
    if (payload) window.location.reload();
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCohortId) return;
    const form = new FormData(event.currentTarget);
    const payload = await request(`/api/instructor/cohorts/${selectedCohortId}/events`, {
      type: form.get("type"),
      title: form.get("title"),
      startsAt: new Date(String(form.get("startsAt"))).toISOString(),
      endsAt: new Date(String(form.get("endsAt"))).toISOString(),
      joinUrl: form.get("joinUrl") || undefined,
      recordingUrl: form.get("recordingUrl") || undefined
    });
    if (payload) window.location.reload();
  }

  async function transition(cohortId: string, status: string) {
    const payload = await request(`/api/instructor/cohorts/${cohortId}/status`, { status });
    if (payload) window.location.reload();
  }

  function transitions(status: string) {
    if (status === "DRAFT") return ["OPEN", "CANCELLED"];
    if (status === "OPEN") return ["CLOSED", "IN_PROGRESS", "CANCELLED"];
    if (status === "CLOSED") return ["OPEN", "IN_PROGRESS", "CANCELLED"];
    if (status === "IN_PROGRESS") return ["COMPLETED", "CANCELLED"];
    return [];
  }

  return <div className="list">
    <form className="panel" onSubmit={createCohort}>
      <h3>Create cohort</h3>
      <label>Name<input name="name" required minLength={2} placeholder="Spring build cohort" /></label>
      <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="spring-build-2027" /></label>
      <label>Starts<input name="startsAt" type="datetime-local" required /></label>
      <label>Ends<input name="endsAt" type="datetime-local" required /></label>
      <label>Enrollment opens<input name="enrollmentOpensAt" type="datetime-local" /></label>
      <label>Enrollment closes<input name="enrollmentClosesAt" type="datetime-local" /></label>
      <label>Capacity<input name="capacity" type="number" min="1" max="10000" /></label>
      <button className="button secondary" type="submit">Create draft cohort</button>
    </form>

    {cohorts.length ? <form className="panel" onSubmit={createEvent}>
      <h3>Add cohort event</h3>
      <label>Cohort<select value={selectedCohortId} onChange={(event) => setSelectedCohortId(event.target.value)}>{cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select></label>
      <label>Event type<select name="type" defaultValue="LIVE_SESSION"><option>LIVE_SESSION</option><option>BUILD_LAB</option><option>OFFICE_HOUR</option><option>WORKSHOP</option><option>CAPSTONE_REVIEW</option><option>NETWORKING</option></select></label>
      <label>Title<input name="title" required minLength={2} /></label>
      <label>Starts<input name="startsAt" type="datetime-local" required /></label>
      <label>Ends<input name="endsAt" type="datetime-local" required /></label>
      <label>Join URL<input name="joinUrl" type="url" placeholder="https://..." /></label>
      <label>Recording URL<input name="recordingUrl" type="url" placeholder="Optional; can remain blank" /></label>
      <button className="button secondary" type="submit">Add event</button>
    </form> : null}

    {cohorts.map((cohort) => <div className="panel" key={cohort.id}>
      <span className="badge">{cohort.status}</span>
      <h3>{cohort.name}</h3>
      <p className="muted">{new Date(cohort.startsAt).toLocaleString()} – {new Date(cohort.endsAt).toLocaleString()}{cohort.capacity ? ` · capacity ${cohort.capacity}` : ""}</p>
      <div className="list">{cohort.events.length ? cohort.events.map((item) => <div className="row" key={item.id}><span>{item.title}</span><span className="muted">{item.type.replaceAll("_", " ")} · {new Date(item.startsAt).toLocaleString()}</span></div>) : <p className="muted">No events yet. Add one before opening enrollment.</p>}</div>
      {transitions(cohort.status).length ? <div className="actions">{transitions(cohort.status).map((status) => <button key={status} className="button secondary" type="button" onClick={() => transition(cohort.id, status)}>{status.replaceAll("_", " ")}</button>)}</div> : null}
    </div>)}

    {message ? <div className="panel"><p className="muted">{message}</p></div> : null}
  </div>;
}
