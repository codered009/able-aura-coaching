import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { childIdsForParent } from "@/lib/session-service";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    if (actor.role === "parent") {
      return db.student.findMany({
        where: { OR: [{ fathersId: actor.id }, { mothersId: actor.id }] },
        include: {
          father: { select: { id: true, name: true, phone: true } },
          mother: { select: { id: true, name: true, phone: true } },
          enrollments: { include: { course: true } },
          subscriptions: { include: { pendingPayments: true, payments: true } },
          consents: { where: { revokedAt: null }, orderBy: { grantedAt: "desc" }, take: 1 },
        },
        orderBy: { name: "asc" },
      });
    }
    if (actor.role === "student" && actor.studentId) {
      return db.student.findMany({
        where: { id: actor.studentId },
        include: {
          enrollments: { include: { course: true } },
          consents: { where: { revokedAt: null }, take: 1 },
        },
      });
    }
    return db.student.findMany({
      include: {
        father: { select: { id: true, name: true, phone: true } },
        mother: { select: { id: true, name: true, phone: true } },
        enrollments: { include: { course: true } },
        subscriptions: true,
        consents: { where: { revokedAt: null }, orderBy: { grantedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    });
  });
}

const schema = z.object({
  name: z.string().min(2),
  dateOfBirth: z.string(),
  disabilityNotes: z.string().optional(),
  baselinePosture: z.string().optional(),
  fathersId: z.string().optional(),
  mothersId: z.string().optional(),
});

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "children.manage_own");
    const body = schema.parse(await request.json());
    const fathersId = actor.role === "parent" ? actor.id : body.fathersId;
    const mothersId = actor.role === "parent" ? actor.id : body.mothersId;
    const student = await db.student.create({
      data: {
        name: body.name,
        dateOfBirth: new Date(body.dateOfBirth),
        disabilityNotes: body.disabilityNotes,
        baselinePosture: body.baselinePosture,
        fathersId: fathersId ?? null,
        mothersId: mothersId ?? null,
      },
    });
    await writeAudit({
      actorId: actor.id,
      action: "student.create",
      entityType: "student",
      entityId: student.id,
    });
    return student;
  });
}

export async function PATCH(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "children.manage_own");
    const body = schema
      .partial()
      .extend({ id: z.string() })
      .parse(await request.json());
    if (actor.role === "parent") {
      const children = await childIdsForParent(actor.id);
      if (!children.includes(body.id)) {
        const error = new Error("You can only edit your own children.");
        error.name = "ForbiddenError";
        throw error;
      }
    }
    return db.student.update({
      where: { id: body.id },
      data: {
        name: body.name,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        disabilityNotes: body.disabilityNotes,
        baselinePosture: body.baselinePosture,
      },
    });
  });
}
