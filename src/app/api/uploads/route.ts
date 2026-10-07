import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    requireActor(user);
    return db.trainingVideoUpload.findMany({
      include: {
        uploader: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "uploads.create");
    const form = await request.formData();
    const exerciseId = String(form.get("exerciseId") ?? "");
    const notes = String(form.get("notes") ?? "");
    const file = form.get("file");
    if (!exerciseId) throw new Error("Choose an exercise.");
    if (!(file instanceof File)) throw new Error("Attach a training video.");

    const dir = path.join(process.cwd(), "data", "uploads");
    await mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const dest = path.join(dir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buffer);

    const upload = await db.trainingVideoUpload.create({
      data: {
        uploaderId: actor.id,
        exerciseId,
        videoUrl: `/api/uploads/file/${safeName}`,
        status: "pending",
        notes: notes || null,
      },
    });
    await writeAudit({
      actorId: actor.id,
      action: "upload.create",
      entityType: "training_video_upload",
      entityId: upload.id,
      metadata: { exerciseId, bytes: buffer.length },
    });
    return upload;
  });
}
