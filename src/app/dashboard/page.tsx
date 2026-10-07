import Link from "next/link";
import { requirePageUser } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { childIdsForParent } from "@/lib/session-service";
import { can } from "@/lib/permissions";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const children = user.role === "parent" ? await childIdsForParent(user.id) : [];
  const sessions = await db.session.findMany({
    where:
      user.role === "parent"
        ? { course: { enrollments: { some: { studentId: { in: children } } } } }
        : user.role === "main_trainer"
          ? { mainTrainerId: user.id }
          : user.role === "student" && user.studentId
            ? { course: { enrollments: { some: { studentId: user.studentId } } } }
            : {},
    include: { course: true, currentExercise: true },
    orderBy: { startTime: "desc" },
    take: 6,
  });
  const reports = await db.progressReport.count({
    where:
      user.role === "parent"
        ? { studentId: { in: children } }
        : user.role === "student" && user.studentId
          ? { studentId: user.studentId }
          : {},
  });

  return (
    <AppShell user={user}>
      <p className="text-sm font-semibold uppercase tracking-wide text-terracotta">
        {user.role.replaceAll("_", " ")}
      </p>
      <h1 className="mt-1 font-serif text-4xl text-teal-950">Namaste, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 max-w-2xl text-ink/65">
        {user.role === "student"
          ? "Join with your class code. Your trainers can see your camera. The posture helper never talks to you."
          : user.role === "parent"
            ? "Manage consent, enrolment requests, and see reports for your child. In class you observe the main trainer only."
            : "Run the live room, watch AI badges, and open private audio when a child needs a quiet correction."}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-ink/50">Upcoming & recent sessions</p>
          <p className="mt-1 font-serif text-3xl">{sessions.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink/50">Progress reports</p>
          <p className="mt-1 font-serif text-3xl">{reports}</p>
        </Card>
        <Card>
          <p className="text-sm text-ink/50">Priority-1 movements</p>
          <p className="mt-1 font-serif text-3xl">8</p>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {can(user, "sessions.create") && (
          <Link href="/sessions/new">
            <Button>Schedule a session</Button>
          </Link>
        )}
        <Link href={user.role === "student" ? "/join" : "/sessions"}>
          <Button variant="outline">Open sessions</Button>
        </Link>
      </div>

      <h2 className="mt-10 font-serif text-2xl">Sessions</h2>
      <div className="mt-3 grid gap-3">
        {sessions.length === 0 && <Card>No sessions yet for this desk.</Card>}
        {sessions.map((session) => (
          <Card key={session.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{session.title}</p>
              <p className="text-sm text-ink/55">
                {session.course.name}
                {session.currentExercise ? ` · ${session.currentExercise.name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={session.status === "live" ? "green" : "slate"}>{session.status}</Badge>
              <Link href={`/sessions/${session.id}/live`}>
                <Button size="sm">Enter room</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
