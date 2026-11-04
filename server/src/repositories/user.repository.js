import { getPrisma } from "../lib/prisma.js";

const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true, description: true } },
};

export function findUserForLogin(email) {
  return getPrisma().user.findUnique({
    where: { email },
    include: { role: true },
  });
}

export function findActiveUserById(id) {
  return getPrisma().user.findFirst({
    where: { id, isActive: true },
    select: safeUserSelect,
  });
}

export function listSafeUsers({ skip, take }) {
  return getPrisma().user.findMany({
    skip,
    take,
    orderBy: { createdAt: "desc" },
    select: safeUserSelect,
  });
}

export function countUsers() {
  return getPrisma().user.count();
}

export function findSafeUserById(id) {
  return getPrisma().user.findUnique({ where: { id }, select: safeUserSelect });
}

export function updateUserStatus(id, isActive) {
  return getPrisma().user.update({
    where: { id },
    data: { isActive },
    select: safeUserSelect,
  });
}

export function toSafeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    ...(user.phone !== undefined ? { phone: user.phone } : {}),
    role: user.role.name,
    ...(user.role.description ? { roleDescription: user.role.description } : {}),
    ...(user.isActive !== undefined ? { isActive: user.isActive } : {}),
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    ...(user.updatedAt ? { updatedAt: user.updatedAt } : {}),
  };
}
