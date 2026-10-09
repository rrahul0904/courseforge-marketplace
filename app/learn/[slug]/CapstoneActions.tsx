"use client";

import { useState } from "react";

export default function CapstoneActions({
  courseId,
  latestStatus,
  latestRevision
}: {
  courseId: string;
  latestStatus: string | null;
  latestRevision: number | null;
}) {
  const [artifactUrl, setArtifactUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = latestStatus === null || latestStatus === "CHANGES_REQUESTED" || latestStatus === "DRAFT";

  async function submitCapstone() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/learning/capstones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, artifactUrl, summary })
      });
      const payload = await response.json();
      if (!response.ok) {
        const detail = typeof payload.error === "string" ? payload.error : "Unable to submit capstone.";
        setMessage(detail);
        return;
      }
      setMessage(`Revision ${payload.submission.revision} submitted for faculty review.`);
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="panel">
    <h2>Capstone studio</h2>
    <p className="muted">
      {latestRevision ? `Latest revision ${latestRevision} · ${latestStatus}` : "No capstone submitted yet."}
    </p>
    {canSubmit ? <>
      <label>
        Artifact URL
        <input
          type="url"
          value={artifactUrl}
          onChange={(event) => setArtifactUrl(event.target.value)}
          placeholder="https://your-original-artifact.example"
          style={{ width: "100%", marginTop: 8 }}
        />
      </label>
      <label style={{ display: "block", marginTop: 12 }}>
        What you built and what changed
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          minLength={20}
          maxLength={4000}
          rows={5}
          style={{ width: "100%", marginTop: 8 }}
        />
      </label>
      <button
        className="button"
        type="button"
        disabled={submitting || !artifactUrl || summary.trim().length < 20}
        onClick={submitCapstone}
      >
        {submitting ? "Submitting…" : latestStatus === "CHANGES_REQUESTED" ? "Submit next revision" : "Submit capstone"}
      </button>
    </> : <p>
      {latestStatus === "APPROVED"
        ? "Faculty approved this revision. Keep this evidence unchanged for certification."
        : "This revision is awaiting faculty review."}
    </p>}
    {message ? <p className="muted">{message}</p> : null}
  </div>;
}
