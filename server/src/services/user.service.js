import { getPrisma } from "../lib/prisma.js";
import { countUsers, findSafeUserById, listSafeUsers, toSafeUser } from "../repositories/user.repository.js";

export async function getUsers({ page, limit }) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([listSafeUsers({ skip, take: limit }), countUsers()]);
  return { users: users.map(toSafeUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getUser(id) {
  const user = await findSafeUserById(id);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  return toSafeUser(user);
}

export async function changeUserStatus({ targetUserId, isActive, actor }) {
  if (targetUserId === actor.id && !isActive) throw Object.assign(new Error("Administrators cannot deactivate their own active session"), { status: 409 });
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.user.findUnique({ where: { id: targetUserId }, include: { role: true } });
    if (!existing) throw Object.assign(new Error("User not found"), { status: 404 });
    const user = await transaction.user.update({ where: { id: targetUserId }, data: { isActive }, include: { role: true } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", entityType: "User", entityId: String(targetUserId), details: { previousStatus: existing.isActive, newStatus: isActive } } });
    return toSafeUser(user);
  });
}
