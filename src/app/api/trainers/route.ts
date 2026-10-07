import { jsonHandler, requireActor } from "@/lib/api-route";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    return db.user.findMany({
      where: { role: { in: ["main_trainer", "admin"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  });
}
