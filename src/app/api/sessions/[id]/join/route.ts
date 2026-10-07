import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { joinSession, leaveSession } from "@/lib/session-service";

const schema = z.object({
  studentId: z.string().optional(),
  joinCode: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    const body = schema.parse(await request.json().catch(() => ({})));
    return joinSession(requireActor(user), (await context.params).id, body);
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    await leaveSession(requireActor(user), (await context.params).id);
    return { ok: true };
  });
}
