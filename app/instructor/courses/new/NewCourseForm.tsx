"use client";

import { FormEvent, useState } from "react";

export default function NewCourseForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("priceDollars"));
    const response = await fetch("/api/instructor/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        slug: form.get("slug"),
        subtitle: form.get("subtitle") || undefined,
        description: form.get("description"),
        category: form.get("category"),
        level: form.get("level"),
        amountCents: Math.round(amount * 100),
        currency: "USD"
      })
    });
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Course could not be created.");
      return;
    }
    window.location.href = `/instructor/courses/${payload.course.id}`;
  }

  return <form className="panel" onSubmit={submit}>
    <div className="list">
      <label>Title<input name="title" required minLength={5} /></label>
      <label>Slug<input name="slug" required placeholder="production-ai-agents" /></label>
      <label>Subtitle<input name="subtitle" /></label>
      <label>Description<textarea name="description" required minLength={20} rows={8} /></label>
      <label>Category<input name="category" required /></label>
      <label>Level<select name="level" defaultValue="Intermediate"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
      <label>Price (USD)<input name="priceDollars" type="number" min="1" max="5000" step="0.01" required /></label>
    </div>
    <button className="button" disabled={loading} type="submit">{loading ? "Creating…" : "Create draft course"}</button>
    {error ? <p className="muted">{error}</p> : null}
  </form>;
}
