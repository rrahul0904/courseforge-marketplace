import test from "node:test";
import assert from "node:assert/strict";
import { issueReferralToken, verifyReferralToken } from "../domain/referral.mjs";

const secret = "courseforge-referral-test-secret-1234567890";

test("signed referral token round-trips instructor and course attribution", () => {
  const token = issueReferralToken({ instructorId: "inst_1", courseId: "course_1", ttlSeconds: 60 }, secret, 1000);
  assert.deepEqual(verifyReferralToken(token, secret, 1020), {
    instructorId: "inst_1",
    courseId: "course_1",
    exp: 1060
  });
});

test("tampered referral attribution is rejected", () => {
  const token = issueReferralToken({ instructorId: "inst_1", courseId: "course_1" }, secret, 1000);
  const [payload, signature] = token.split(".");
  const changed = Buffer.from(JSON.stringify({ instructorId: "inst_2", courseId: "course_1", exp: 2000 })).toString("base64url");
  assert.equal(verifyReferralToken(`${changed}.${signature}`, secret, 1010), null);
  assert.notEqual(changed, payload);
});

test("expired referral tokens are rejected", () => {
  const token = issueReferralToken({ instructorId: "inst_1", courseId: "course_1", ttlSeconds: 10 }, secret, 1000);
  assert.equal(verifyReferralToken(token, secret, 1010), null);
});
