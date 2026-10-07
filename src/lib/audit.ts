import { db } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}
