import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { db } from "@/lib/db";
import { canViewStudentReport, childIdsForParent } from "@/lib/session-service";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId") ?? undefined;
    const where =
      actor.role === "parent"
        ? { studentId: { in: await childIdsForParent(actor.id) } }
        : actor.role === "student"
          ? { studentId: actor.studentId ?? "__none__" }
          : studentId
            ? { studentId }
            : {};
    return db.progressReport.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
        session: { select: { id: true, title: true, startTime: true } },
        course: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function PATCH(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    const body = z
      .object({ id: z.string(), trainerNotes: z.string() })
      .parse(await request.json());
    const report = await db.progressReport.findUnique({ where: { id: body.id } });
    if (!report) throw new Error("Report not found.");
    if (!(await canViewStudentReport(actor, report.studentId))) {
      const error = new Error("You cannot edit this report.");
      error.name = "ForbiddenError";
      throw error;
    }
    const updated = await db.progressReport.update({
      where: { id: body.id },
      data: { trainerNotes: body.trainerNotes, authorId: actor.id },
    });
    await writeAudit({
      actorId: actor.id,
      action: "report.update",
      entityType: "progress_report",
      entityId: updated.id,
    });
    return updated;
  });
}
