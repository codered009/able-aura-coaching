import { requirePageAction } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { format } from "date-fns";

export default async function AuditPage() {
  const user = await requirePageAction("audit.view");
  const logs = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
  return (
    <AppShell user={user}>
      <h1 className="font-serif text-4xl text-teal-950">Audit log</h1>
      <p className="mt-2 text-ink/60">
        Private audio, AI review, recording access, session lifecycle, and consent changes.
      </p>
      <div className="mt-6 grid gap-2">
        {logs.map((log) => (
          <Card key={log.id} className="py-3">
            <p className="text-sm font-semibold">{log.action}</p>
            <p className="text-xs text-ink/55">
              {log.actor?.name ?? "system"} · {log.entityType} {log.entityId} ·{" "}
              {format(log.createdAt, "d MMM, HH:mm")}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
