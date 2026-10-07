import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { childIdsForParent } from "@/lib/session-service";

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    const body = z
      .object({
        studentId: z.string(),
        camera: z.boolean(),
        recording: z.boolean(),
        aiProcessing: z.boolean(),
      })
      .parse(await request.json());
    if (actor.role === "parent") {
      const children = await childIdsForParent(actor.id);
      if (!children.includes(body.studentId)) {
        const error = new Error("You can only grant consent for your child.");
        error.name = "ForbiddenError";
        throw error;
      }
    } else if (actor.role !== "admin") {
      const error = new Error("Only a parent or admin can update consent.");
      error.name = "ForbiddenError";
      throw error;
    }
    await db.parentalConsent.updateMany({
      where: { studentId: body.studentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const consent = await db.parentalConsent.create({
      data: { ...body, grantedById: actor.id },
    });
    await writeAudit({
      actorId: actor.id,
      action: "consent.update",
      entityType: "parental_consent",
      entityId: consent.id,
      metadata: body,
    });
    return consent;
  });
}
