import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { transitionSession } from "@/lib/session-service";
import { SESSION_STATUSES } from "@/lib/types";

const schema = z.object({ status: z.enum(SESSION_STATUSES) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    const body = schema.parse(await request.json());
    return transitionSession(requireActor(user), (await context.params).id, body.status);
  });
}
