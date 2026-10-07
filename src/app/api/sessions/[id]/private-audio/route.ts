import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { closePrivateAudio, openPrivateAudio } from "@/lib/session-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return jsonHandler(request, async ({ user }) => {
    const body = z.object({ studentId: z.string() }).parse(await request.json());
    return openPrivateAudio(requireActor(user), (await context.params).id, body.studentId);
  });
}

export async function DELETE(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId");
    if (!channelId) throw new Error("channelId is required.");
    return closePrivateAudio(requireActor(user), channelId);
  });
}
