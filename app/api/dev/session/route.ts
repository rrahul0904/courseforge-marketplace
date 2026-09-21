import { cookies } from "next/headers";
import { z } from "zod";
import { issueSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const schema = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
  email: z.string().email().default("demo@courseforge.local"),
  name: z.string().min(1).max(120).default("CourseForge Demo")
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.COURSEFORGE_ALLOW_DEV_LOGIN !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const token = issueSessionToken({
    sub: `dev_${parsed.data.role.toLowerCase()}`,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return Response.json({ ok: true, role: parsed.data.role });
}
