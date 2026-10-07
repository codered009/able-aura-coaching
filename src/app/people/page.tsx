import { requirePageAction } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function PeoplePage() {
  const user = await requirePageAction("users.manage");
  const people = await db.user.findMany({
    orderBy: { name: "asc" },
    include: { linkedStudent: { select: { name: true } } },
  });
  return (
    <AppShell user={user}>
      <h1 className="font-serif text-4xl text-teal-950">People</h1>
      <p className="mt-2 text-ink/60">
        Existing Able Aura users table — role, phone, email, person_entity_id. Only admin can edit.
      </p>
      <div className="mt-6 grid gap-3">
        {people.map((person) => (
          <Card key={person.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{person.name}</p>
              <p className="text-sm text-ink/55">
                {person.phone}
                {person.email ? ` · ${person.email}` : ""}
                {person.linkedStudent ? ` · student ${person.linkedStudent.name}` : ""}
              </p>
            </div>
            <Badge>{person.role.replaceAll("_", " ")}</Badge>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
