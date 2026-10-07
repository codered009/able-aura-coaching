import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    return db.course.findMany({
      include: { _count: { select: { enrollments: true, sessions: true } } },
      orderBy: { name: "asc" },
    });
  });
}

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "courses.manage");
    const body = z
      .object({ name: z.string().min(3), description: z.string().optional() })
      .parse(await request.json());
    const course = await db.course.create({ data: body });
    await writeAudit({
      actorId: actor.id,
      action: "course.create",
      entityType: "course",
      entityId: course.id,
    });
    return course;
  });
}
