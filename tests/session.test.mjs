import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

test("session signature changes when the payload is tampered", () => {
  const secret = "abcdefghijklmnopqrstuvwxyz1234567890";
  const payload = Buffer.from(JSON.stringify({ sub: "u1", role: "ADMIN" })).toString("base64url");
  const signature = sign(payload, secret);
  const tampered = Buffer.from(JSON.stringify({ sub: "u1", role: "STUDENT" })).toString("base64url");
  assert.notEqual(sign(tampered, secret), signature);
});
