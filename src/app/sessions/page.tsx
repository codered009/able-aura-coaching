import Link from "next/link";
import { requirePageUser } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listSessions } from "@/lib/session-service";
import { can } from "@/lib/permissions";
import { format } from "date-fns";

export default async function SessionsPage() {
  const user = await requirePageUser();
  const sessions = await listSessions(user);

  return (
    <AppShell user={user}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-teal-950">Sessions</h1>
          <p className="mt-1 text-ink/60">
            Draft → scheduled → live → paused → ended. Students need an active enrolment and subscription.
          </p>
        </div>
        {can(user, "sessions.create") && (
          <Link href="/sessions/new">
            <Button>New session</Button>
          </Link>
        )}
      </div>
      <div className="mt-6 grid gap-3">
        {sessions.length === 0 && <Card>No sessions visible to this role yet.</Card>}
        {sessions.map((session) => (
          <Card key={session.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{session.title}</p>
              <p className="text-sm text-ink/55">
                {session.course.name} · {session.mainTrainer.name} ·{" "}
                {format(session.startTime, "d MMM, h:mm a")} · code {session.joinCode}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={session.status === "live" ? "green" : session.status === "ended" ? "slate" : "amber"}>
                {session.status}
              </Badge>
              <Link href={`/sessions/${session.id}/live`}>
                <Button size="sm" variant="outline">
                  Room
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
