import { requirePageUser } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { childIdsForParent } from "@/lib/session-service";
import { parseJson } from "@/lib/utils";
import { format } from "date-fns";

export default async function ReportsPage() {
  const user = await requirePageUser();
  const children = user.role === "parent" ? await childIdsForParent(user.id) : [];
  const reports = await db.progressReport.findMany({
    where:
      user.role === "parent"
        ? { studentId: { in: children } }
        : user.role === "student" && user.studentId
          ? { studentId: user.studentId }
          : {},
    include: {
      student: true,
      course: true,
      session: true,
      author: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={user}>
      <h1 className="font-serif text-4xl text-teal-950">Progress reports</h1>
      <p className="mt-2 text-ink/60">
        Generated when a session ends. Linked to student, course, enrolment, and the live session.
      </p>
      <div className="mt-6 grid gap-4">
        {reports.length === 0 && <Card>No reports yet.</Card>}
        {reports.map((report) => {
          const metrics = parseJson<{
            attendanceMinutes?: number;
            aiEventCounts?: Record<string, number>;
            formConsistency?: number;
          }>(report.metricsJson, {});
          return (
            <Card key={report.id}>
              <p className="font-semibold">
                {report.student.name}
                {report.course ? ` · ${report.course.name}` : ""}
              </p>
              <p className="text-sm text-ink/55">
                {format(report.createdAt, "d MMM yyyy")}
                {report.session ? ` · ${report.session.title}` : ""}
                {report.author ? ` · ${report.author.name}` : ""}
              </p>
              <p className="mt-2 text-sm">
                Attendance {metrics.attendanceMinutes ?? "—"} min · form{" "}
                {metrics.formConsistency != null
                  ? `${Math.round(metrics.formConsistency * 100)}%`
                  : "—"}
              </p>
              {report.trainerNotes && <p className="mt-2 text-sm">{report.trainerNotes}</p>}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
