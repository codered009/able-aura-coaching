import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "audit.view");
    return db.auditLog.findMany({
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  });
}
