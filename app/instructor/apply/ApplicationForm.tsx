"use client";

import { FormEvent, useState } from "react";

export default function ApplicationForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/instructors/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.get("slug"),
        headline: form.get("headline"),
        bio: form.get("bio"),
        websiteUrl: form.get("websiteUrl"),
        expertise: String(form.get("expertise") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
        applicationNote: form.get("applicationNote")
      })
    });
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(typeof payload.error === "string" ? payload.error : "Application could not be submitted.");
      return;
    }
    setMessage("Application submitted. An administrator must approve it before payout onboarding or publishing.");
    window.location.reload();
  }

  return <form className="panel" onSubmit={submit}>
    <div className="list">
      <label>Public instructor slug<input name="slug" required placeholder="maya-chen" /></label>
      <label>Headline<input name="headline" required minLength={10} placeholder="Staff AI engineer and educator" /></label>
      <label>Bio<textarea name="bio" required minLength={50} rows={6} /></label>
      <label>Website<input name="websiteUrl" type="url" placeholder="https://…" /></label>
      <label>Expertise, comma-separated<input name="expertise" required placeholder="AI agents, evaluation, reliability" /></label>
      <label>Application note<textarea name="applicationNote" rows={4} /></label>
    </div>
    <button className="button" disabled={loading} type="submit">{loading ? "Submitting…" : "Apply to teach"}</button>
    {message ? <p className="muted">{message}</p> : null}
  </form>;
}
