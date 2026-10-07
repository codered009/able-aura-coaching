import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { childIdsForParent } from "@/lib/session-service";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    return db.enrollment.findMany({
      include: { student: true, course: true },
      orderBy: { enrolledAt: "desc" },
    });
  });
}

const schema = z.object({
  studentId: z.string(),
  courseId: z.string(),
});

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    const body = schema.parse(await request.json());
    if (actor.role === "parent") {
      assertCan(actor, "enrollments.request");
      const children = await childIdsForParent(actor.id);
      if (!children.includes(body.studentId)) {
        const error = new Error("You can only request enrolment for your child.");
        error.name = "ForbiddenError";
        throw error;
      }
    } else {
      assertCan(actor, "enrollments.admin");
    }
    const status = actor.role === "parent" ? "requested" : "active";
    const enrollment = await db.enrollment.upsert({
      where: { studentId_courseId: { studentId: body.studentId, courseId: body.courseId } },
      update: { status },
      create: { ...body, status },
    });
    await writeAudit({
      actorId: actor.id,
      action: actor.role === "parent" ? "enrollment.request" : "enrollment.create",
      entityType: "enrollment",
      entityId: enrollment.id,
    });
    return enrollment;
  });
}

export async function PATCH(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "enrollments.admin");
    const body = z
      .object({ id: z.string(), status: z.enum(["active", "requested", "withdrawn", "completed"]) })
      .parse(await request.json());
    return db.enrollment.update({ where: { id: body.id }, data: { status: body.status } });
  });
}
