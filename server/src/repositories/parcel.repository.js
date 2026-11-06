import { getPrisma } from "../lib/prisma.js";

const parcelListSelect = {
  id: true, parcelNumber: true, areaName: true, landUse: true, areaM2: true,
  status: true, createdAt: true,
  district: { select: { id: true, name: true, code: true, regionName: true, regionCode: true } },
  owners: { select: { sharePercent: true, owner: { select: { id: true, ownerType: true, fullName: true, companyName: true } } } },
  surveys: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true, status: true, notes: true, cannotVerifyReason: true, verifiedAt: true, createdAt: true, surveyor: { select: { id: true, fullName: true } }, reportDocument: { select: { id: true, originalName: true, mimeType: true, fileSize: true } } } },
};

export async function findParcels(query, user, database = getPrisma()) {
  let ownerId;
  if (user.role === "OWNER") ownerId = (await database.owner.findUnique({ where: { userId: user.id }, select: { id: true } }))?.id ?? -1;
  const where = {
    ...(query.q ? { parcelNumber: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.districtId ? { districtId: query.districtId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.landUse ? { landUse: query.landUse } : {}),
    ...(query.ownerName ? { owners: { some: { owner: { OR: [{ fullName: { contains: query.ownerName, mode: "insensitive" } }, { companyName: { contains: query.ownerName, mode: "insensitive" } }] } } } } : {}),
    ...(ownerId !== undefined ? { owners: { some: { ownerId } } } : {}),
  };
  const [parcels, total] = await Promise.all([
    database.parcel.findMany({ where, select: parcelListSelect, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    database.parcel.count({ where }),
  ]);
  return { parcels, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function findParcelById(id, user, database = getPrisma()) {
  let ownerId;
  if (user.role === "OWNER") ownerId = (await database.owner.findUnique({ where: { userId: user.id }, select: { id: true } }))?.id ?? -1;
  const parcel = await database.parcel.findFirst({ where: { id, ...(ownerId !== undefined ? { owners: { some: { ownerId } } } : {}) }, select: parcelListSelect });
  if (!parcel) return null;
  const [geometry] = await database.$queryRaw`SELECT ST_AsGeoJSON(geometry)::json AS geometry FROM parcels WHERE id = ${id}`;
  return { ...parcel, geometry: geometry?.geometry ?? null };
}
