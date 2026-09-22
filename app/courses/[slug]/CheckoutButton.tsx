"use client";

import { useState } from "react";

export default function CheckoutButton({ priceId, referralToken }: { priceId: string; referralToken?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function checkout() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, referralToken })
      });
      if (response.redirected) {
        window.location.href = response.url;
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload.checkoutUrl) {
        setState("error");
        setMessage(payload.error ?? "Checkout is unavailable.");
        return;
      }
      window.location.href = payload.checkoutUrl;
    } catch {
      setState("error");
      setMessage("Checkout could not be started.");
    }
  }

  return <div>
    <button className="button" type="button" onClick={checkout} disabled={state === "loading"}>
      {state === "loading" ? "Starting checkout…" : "Buy course"}
    </button>
    {state === "error" ? <p className="muted">{message}</p> : null}
  </div>;
}
