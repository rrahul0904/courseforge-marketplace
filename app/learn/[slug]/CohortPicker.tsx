"use client";

import { useState } from "react";

export default function CohortPicker({
  cohorts
}: {
  cohorts: Array<{ id: string; name: string; startsAt: string; endsAt: string; capacity: number | null }>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function reserve(cohortId: string) {
    setSavingId(cohortId);
    setMessage(null);
    try {
      const response = await fetch(`/api/learning/cohorts/${cohortId}/reserve`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        const reason = payload.reason ? ` (${String(payload.reason).replaceAll("_", " ").toLowerCase()})` : "";
        setMessage(`${payload.error ?? "Unable to reserve cohort."}${reason}`);
        return;
      }
      setMessage(payload.replay ? "This cohort seat was already reserved." : "Cohort seat reserved.");
      window.location.reload();
    } finally {
      setSavingId(null);
    }
  }

  return <div className="panel">
    <h2>Choose your cohort</h2>
    <p className="muted">Your course entitlement is active. Reserve one available cohort to unlock its learning space and live schedule.</p>
    <div className="list">
      {cohorts.length ? cohorts.map((cohort) => <div className="row" key={cohort.id}>
        <div>
          <strong>{cohort.name}</strong>
          <div className="muted">{new Date(cohort.startsAt).toLocaleDateString()} – {new Date(cohort.endsAt).toLocaleDateString()}{cohort.capacity ? ` · capacity ${cohort.capacity}` : ""}</div>
        </div>
        <button className="button" type="button" disabled={savingId !== null} onClick={() => reserve(cohort.id)}>
          {savingId === cohort.id ? "Reserving…" : "Reserve seat"}
        </button>
      </div>) : <p className="muted">No cohort is currently open for reservation.</p>}
    </div>
    {message ? <p className="muted">{message}</p> : null}
  </div>;
}
