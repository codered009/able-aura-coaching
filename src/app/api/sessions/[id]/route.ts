import { jsonHandler, requireActor } from "@/lib/api-route";
import { getSession } from "@/lib/session-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    return getSession((await context.params).id);
  });
}
