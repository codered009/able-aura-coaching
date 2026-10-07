import { jsonHandler, requireActor } from "@/lib/api-route";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    return db.exercise.findMany({
      where: { isActive: true },
      include: { poseTemplates: { orderBy: { version: "desc" }, take: 1 } },
      orderBy: { name: "asc" },
    });
  });
}
