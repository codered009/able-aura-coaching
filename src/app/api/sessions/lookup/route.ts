import { jsonHandler, requireActor } from "@/lib/api-route";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    const code = new URL(request.url).searchParams.get("code")?.trim();
    if (!code) throw new Error("Enter a join code.");
    const session = await db.session.findUnique({
      where: { joinCode: code },
      include: {
        course: true,
        mainTrainer: { select: { id: true, name: true } },
        currentExercise: true,
      },
    });
    if (!session) {
      const error = new Error("No session uses that join code.");
      error.name = "NotFoundError";
      throw error;
    }
    return session;
  });
}
