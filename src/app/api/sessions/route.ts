import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { createSession, listSessions } from "@/lib/session-service";

const createSchema = z.object({
  title: z.string().min(3),
  courseId: z.string().min(1),
  startTime: z.string().min(1),
  mainTrainerId: z.string().optional(),
  enrollmentId: z.string().nullable().optional(),
  currentExerciseId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => listSessions(requireActor(user)));
}

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const body = createSchema.parse(await request.json());
    return createSession(requireActor(user), body);
  });
}
