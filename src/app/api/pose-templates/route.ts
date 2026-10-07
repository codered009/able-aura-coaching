import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "pose.manage");
    return db.poseTemplate.findMany({
      include: { exercise: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "pose.manage");
    const body = z
      .object({
        exerciseId: z.string(),
        rulesJson: z.string(),
        modelData: z.string().optional(),
        createdFromUpload: z.boolean().optional(),
      })
      .parse(await request.json());
    const latest = await db.poseTemplate.findFirst({
      where: { exerciseId: body.exerciseId },
      orderBy: { version: "desc" },
    });
    const template = await db.poseTemplate.create({
      data: {
        exerciseId: body.exerciseId,
        version: (latest?.version ?? 0) + 1,
        rulesJson: body.rulesJson,
        modelData: body.modelData,
        createdFromUpload: body.createdFromUpload ?? false,
      },
    });
    await writeAudit({
      actorId: actor.id,
      action: "pose_template.create",
      entityType: "pose_template",
      entityId: template.id,
    });
    return template;
  });
}
