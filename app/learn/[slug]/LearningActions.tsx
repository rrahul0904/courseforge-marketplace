"use client";

import { useState } from "react";

export default function LearningActions({ courseId, progressPercent }: { courseId: string; progressPercent: number }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);

  async function submitReview() {
    setMessage(null);
    const response = await fetch("/api/learning/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, rating, body: body || undefined })
    });
    const payload = await response.json();
    setMessage(response.ok ? "Review saved as a verified learner review." : payload.error ?? "Unable to save review.");
  }

  async function issueCertificate() {
    setMessage(null);
    const response = await fetch("/api/learning/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId })
    });
    const payload = await response.json();
    if (response.ok && payload.certificate?.verificationCode) {
      setCertificateUrl(`/certificates/${payload.certificate.verificationCode}`);
      setMessage("Certificate issued and ready to verify publicly.");
    } else {
      setMessage(payload.error ?? "Unable to issue certificate.");
    }
  }

  return <div className="panel">
    <h2>Course completion</h2>
    <p><strong>{progressPercent}%</strong> complete</p>
    <div className="list">
      <div>
        <h3>Verified review</h3>
        <p className="muted">Available after at least 10% course progress while your entitlement is active.</p>
        <label>Rating <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <br />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Share what was useful" rows={4} style={{width:"100%",marginTop:12}} />
        <button className="button" type="button" onClick={submitReview}>Save review</button>
      </div>
      <div>
        <h3>Completion certificate</h3>
        <p className="muted">Issued only at 100% completion with an active entitlement.</p>
        <button className="button secondary" type="button" onClick={issueCertificate}>Issue certificate</button>
        {certificateUrl ? <p><a href={certificateUrl}>Open certificate verification</a></p> : null}
      </div>
    </div>
    {message ? <p className="muted">{message}</p> : null}
  </div>;
}
