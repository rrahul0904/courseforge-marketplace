"use client";

import { useState } from "react";

export default function AdminActions() {
  const [message, setMessage] = useState("");

  async function act(path: string, body: unknown) {
    setMessage("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.gaps?.length ? `${payload.error}: ${payload.gaps.join(", ")}` : payload.error ?? "Action failed.");
      return;
    }
    window.location.reload();
  }

  return <>{message ? <p className="muted">{message}</p> : null}<script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} /></>;
}

export function InstructorDecision({ id }: { id: string }) {
  async function decide(decision: "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/admin/instructors/${id}/decision`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision })
    });
    if (response.ok) window.location.reload();
  }
  return <div className="actions"><button className="button" onClick={() => decide("APPROVED")}>Approve</button><button className="button secondary" onClick={() => decide("REJECTED")}>Reject</button></div>;
}

export function CourseDecision({ id }: { id: string }) {
  async function decide(decision: "PUBLISH" | "RETURN_TO_DRAFT") {
    const response = await fetch(`/api/admin/courses/${id}/decision`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision })
    });
    const payload = await response.json();
    if (response.ok) window.location.reload();
    else window.alert(payload.gaps?.length ? `${payload.error}: ${payload.gaps.join(", ")}` : payload.error ?? "Action failed");
  }
  return <div className="actions"><button className="button" onClick={() => decide("PUBLISH")}>Publish</button><button className="button secondary" onClick={() => decide("RETURN_TO_DRAFT")}>Return to draft</button></div>;
}
