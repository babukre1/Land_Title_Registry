import { getPrisma } from "../lib/prisma.js";

export const ownerSelect = {
  id: true, ownerType: true, fullName: true, companyName: true,
  identityNumber: true, registrationNumber: true, phone: true, email: true,
  address: true, userId: true, createdAt: true, updatedAt: true,
};

export async function findOwners({ q, page, limit, sort }, database = getPrisma()) {
  const where = q ? { OR: [
    { fullName: { contains: q, mode: "insensitive" } },
    { companyName: { contains: q, mode: "insensitive" } },
    { identityNumber: { contains: q.toUpperCase() } },
    { registrationNumber: { contains: q.toUpperCase() } },
  ] } : {};
  const [owners, total] = await Promise.all([
    database.owner.findMany({ where, skip: (page - 1) * limit, take: limit, select: ownerSelect, orderBy: sort === "newest" ? { createdAt: "desc" } : [{ fullName: "asc" }, { companyName: "asc" }] }),
    database.owner.count({ where }),
  ]);
  return { owners, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export function findOwnerById(id, database = getPrisma()) {
  return database.owner.findUnique({ where: { id }, select: { ...ownerSelect, parcelOwners: { select: { sharePercent: true, parcel: { select: { id: true, parcelNumber: true, status: true, areaM2: true } } } } } });
}
