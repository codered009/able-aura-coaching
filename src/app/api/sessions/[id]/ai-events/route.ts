import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { recordAiEvent, reviewAiEvent } from "@/lib/session-service";

const createSchema = z.object({
  studentId: z.string(),
  exerciseId: z.string(),
  severity: z.enum(["low", "moderate", "high"]),
  issueType: z.string(),
  suggestedCue: z.string(),
  metricsJson: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    const body = createSchema.parse(await request.json());
    return recordAiEvent(requireActor(user), {
      sessionId: (await context.params).id,
      ...body,
    });
  });
}

export async function PATCH(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const body = z.object({ eventId: z.string() }).parse(await request.json());
    return reviewAiEvent(requireActor(user), body.eventId);
  });
}
