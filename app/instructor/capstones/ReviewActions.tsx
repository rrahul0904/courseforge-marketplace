"use client";

import { useState } from "react";

export default function ReviewActions({ submissionId }: { submissionId: string }) {
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function review(decision: "CHANGES_REQUESTED" | "APPROVED") {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/instructor/capstones/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, feedback })
      });
      const payload = await response.json();
      if (!response.ok) {
        const detail = typeof payload.error === "string" ? payload.error : "Unable to save faculty review.";
        setMessage(detail);
        return;
      }
      setMessage(decision === "APPROVED" ? "Revision approved." : "Changes requested.");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return <div>
    <label>
      Faculty feedback
      <textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        minLength={10}
        maxLength={4000}
        rows={4}
        style={{ width: "100%", marginTop: 8 }}
        placeholder="Give concrete feedback tied to this exact revision."
      />
    </label>
    <div className="actions">
      <button className="button secondary" type="button" disabled={saving || feedback.trim().length < 10} onClick={() => review("CHANGES_REQUESTED")}>Request changes</button>
      <button className="button" type="button" disabled={saving || feedback.trim().length < 10} onClick={() => review("APPROVED")}>Approve revision</button>
    </div>
    {message ? <p className="muted">{message}</p> : null}
  </div>;
}
