import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { setCurrentExercise } from "@/lib/session-service";

const schema = z.object({ exerciseId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    const body = schema.parse(await request.json());
    return setCurrentExercise(requireActor(user), (await context.params).id, body.exerciseId);
  });
}
