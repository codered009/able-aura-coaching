import { z } from "zod";
import { jsonHandler, requireActor } from "@/lib/api-route";
import { assertCan } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/types";
import { normalizePhone } from "@/lib/auth";

export async function GET(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "users.manage");
    return db.user.findMany({
      orderBy: { name: "asc" },
      include: { linkedStudent: { select: { id: true, name: true } } },
    });
  });
}

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(ROLES),
});

export async function POST(request: Request) {
  return jsonHandler(request, async ({ user }) => {
    const actor = requireActor(user);
    assertCan(actor, "users.manage");
    const body = schema.parse(await request.json());
    const person = await db.personEntity.create({ data: {} });
    const created = await db.user.create({
      data: {
        personEntityId: person.id,
        name: body.name,
        phone: normalizePhone(body.phone),
        email: body.email || null,
        role: body.role,
      },
    });
    await writeAudit({
      actorId: actor.id,
      action: "user.create",
      entityType: "user",
      entityId: created.id,
      metadata: { role: created.role },
    });
    return created;
  });
}
