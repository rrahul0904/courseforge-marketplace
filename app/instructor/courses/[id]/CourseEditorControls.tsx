"use client";

import { FormEvent, useState } from "react";

type Section = { id: string; title: string; lessons: { id: string; title: string; type: string }[] };

export default function CourseEditorControls({
  courseId,
  status,
  sections,
  priceId,
  providerPriceId,
  payoutReady
}: {
  courseId: string;
  status: string;
  sections: Section[];
  priceId?: string;
  providerPriceId?: string | null;
  payoutReady: boolean;
}) {
  const [message, setMessage] = useState("");
  const draft = status === "DRAFT";

  async function request(path: string, body?: unknown) {
    setMessage("");
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (response.redirected) {
      window.location.href = response.url;
      return null;
    }
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.gaps?.length ? `${payload.error}: ${payload.gaps.join(", ")}` : payload.error ?? "Request failed.");
      return null;
    }
    return payload;
  }

  async function addSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await request(`/api/instructor/courses/${courseId}/sections`, { title: form.get("title") });
    if (payload) window.location.reload();
  }

  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await request(`/api/instructor/courses/${courseId}/lessons`, {
      sectionId: form.get("sectionId"),
      title: form.get("title"),
      type: form.get("type"),
      durationSeconds: Number(form.get("durationSeconds") || 0),
      contentText: form.get("contentText") || undefined
    });
    if (payload) window.location.reload();
  }

  async function mapPrice() {
    if (!priceId) return;
    const payload = await request(`/api/instructor/prices/${priceId}/stripe`);
    if (payload) window.location.reload();
  }

  async function submitReview() {
    const payload = await request(`/api/instructor/courses/${courseId}/submit`);
    if (payload) window.location.reload();
  }

  return <div className="list">
    {draft ? <form className="panel" onSubmit={addSection}>
      <h3>Add section</h3>
      <label>Section title<input name="title" required minLength={2} /></label>
      <button className="button secondary" type="submit">Add section</button>
    </form> : null}

    {draft && sections.length ? <form className="panel" onSubmit={addLesson}>
      <h3>Add lesson</h3>
      <label>Section<select name="sectionId">{sections.map((section) => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label>
      <label>Lesson title<input name="title" required minLength={2} /></label>
      <label>Type<select name="type" defaultValue="VIDEO"><option>VIDEO</option><option>TEXT</option><option>PDF</option><option>QUIZ</option><option>ASSIGNMENT</option><option>LIVE</option></select></label>
      <label>Duration seconds<input name="durationSeconds" type="number" min="0" defaultValue="0" /></label>
      <label>Text content<textarea name="contentText" rows={5} /></label>
      <button className="button secondary" type="submit">Add lesson</button>
    </form> : null}

    <div className="panel">
      <h3>Commerce readiness</h3>
      <p>Stripe payout account: <strong>{payoutReady ? "Ready" : "Not ready"}</strong></p>
      <p>Provider checkout price: <strong>{providerPriceId ? providerPriceId : "Not created"}</strong></p>
      {!providerPriceId && priceId ? <button className="button secondary" type="button" onClick={mapPrice} disabled={!payoutReady}>Create Stripe checkout price</button> : null}
    </div>

    {draft ? <div className="panel">
      <h3>Submit for marketplace review</h3>
      <p className="muted">Submission requires a substantive description, at least one section, one lesson, and an active price. Publication later requires live payout readiness and a provider-backed checkout price.</p>
      <button className="button" type="button" onClick={submitReview}>Submit for review</button>
    </div> : null}

    {message ? <div className="panel"><p className="muted">{message}</p></div> : null}
  </div>;
}
