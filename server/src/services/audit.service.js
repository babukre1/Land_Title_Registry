import { getPrisma } from "../lib/prisma.js";

/** Appends immutable actor/action/entity evidence and returns the audit row; validation/database failures propagate. */
export async function writeAuditLog({ userId = null, action, entityType, entityId = null, details = null }, database = getPrisma()) {
  return database.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId === null ? null : String(entityId),
      details,
    },
  });
}
