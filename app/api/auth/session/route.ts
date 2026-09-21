import { getCurrentActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getCurrentActor();
  return Response.json({ authenticated: Boolean(actor), actor });
}
