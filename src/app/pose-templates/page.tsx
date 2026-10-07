import { requirePageAction } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export default async function PoseTemplatesPage() {
  const user = await requirePageAction("pose.manage");
  const templates = await db.poseTemplate.findMany({
    include: { exercise: true },
    orderBy: [{ exerciseId: "asc" }, { version: "desc" }],
  });
  return (
    <AppShell user={user}>
      <h1 className="font-serif text-4xl text-teal-950">Pose templates</h1>
      <p className="mt-2 text-ink/60">
        Admin-only. Versioned rules for the eight Priority-1 movements. Devices run MediaPipe on
        device; cloud inference is on-demand only.
      </p>
      <div className="mt-6 grid gap-3">
        {templates.map((template) => {
          const rules = parseJson<Record<string, unknown>>(template.rulesJson, {});
          return (
            <Card key={template.id}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{template.exercise.name}</p>
                <Badge>v{template.version}</Badge>
              </div>
              <p className="mt-2 text-xs text-ink/50">
                Engine {String(rules.engine ?? "on_device")} · cloud {String(rules.cloudFallback ?? "on_demand")}
              </p>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
