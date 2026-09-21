import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "courseforge_session";
export type AppRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export type SessionActor = {
  sub: string;
  email: string;
  name?: string;
  role: AppRole;
  exp: number;
};

const roleRank: Record<AppRole, number> = {
  STUDENT: 1,
  INSTRUCTOR: 2,
  ADMIN: 3
};

function secret() {
  const value = process.env.COURSEFORGE_SESSION_SECRET;
  if (!value || value.length < 32) return null;
  return value;
}

function sign(encodedPayload: string, value: string) {
  return createHmac("sha256", value).update(encodedPayload).digest("base64url");
}

export function issueSessionToken(actor: Omit<SessionActor, "exp">, ttlSeconds = 60 * 60 * 12) {
  const value = secret();
  if (!value) throw new Error("COURSEFORGE_SESSION_SECRET must be configured with at least 32 characters");
  const payload: SessionActor = { ...actor, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, value)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionActor | null {
  const value = secret();
  if (!value || !token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = sign(encodedPayload, value);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionActor;
    if (!payload.sub || !payload.email || !payload.role || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!(payload.role in roleRank)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentActor() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireRole(minimumRole: AppRole, returnTo: string) {
  const actor = await getCurrentActor();
  if (!actor) redirect(`/auth/sign-in?next=${encodeURIComponent(returnTo)}`);
  if (roleRank[actor.role] < roleRank[minimumRole]) redirect("/forbidden");
  return actor;
}
