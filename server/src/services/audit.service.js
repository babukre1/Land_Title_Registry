import { getPrisma } from "../lib/prisma.js";

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
