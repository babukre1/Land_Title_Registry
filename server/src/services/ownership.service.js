import { Prisma } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";

const STAFF_ROLES = new Set(["CLERK", "REGISTRAR", "ADMIN"]);

export function validateOwnershipShares(owners) {
  if (!Array.isArray(owners) || owners.length === 0) {
    throw Object.assign(new Error("At least one owner is required"), { status: 422 });
  }
  const ownerIds = owners.map((owner) => owner.ownerId).filter((ownerId) => ownerId !== undefined);
  if (new Set(ownerIds).size !== ownerIds.length) throw Object.assign(new Error("Each owner may appear only once"), { status: 422 });

  const total = owners.reduce((sum, owner) => {
    const share = new Prisma.Decimal(owner.sharePercent);
    if (share.lte(0) || share.gt(100)) throw Object.assign(new Error("Each ownership share must be greater than 0 and no more than 100"), { status: 422 });
    return sum.plus(share);
  }, new Prisma.Decimal(0));

  if (!total.equals(100)) throw Object.assign(new Error(`Approved ownership shares must total exactly 100%; received ${total.toFixed(2)}%`), { status: 422 });
  return true;
}

export async function getLinkedOwner(userId, database = getPrisma()) {
  const owner = await database.owner.findUnique({ where: { userId }, select: { id: true, ownerType: true, fullName: true, companyName: true } });
  if (!owner) throw Object.assign(new Error("Your account is not linked to a verified owner record"), { status: 403 });
  return owner;
}

async function assertOwnershipAccess(parcelId, actor, database) {
  const parcel = await database.parcel.findUnique({
    where: { id: parcelId },
    select: { id: true, status: true, history: { where: { eventType: "REGISTRATION" }, select: { id: true }, take: 1 }, owners: { select: { ownerId: true } } },
  });
  if (!parcel || parcel.history.length === 0) throw Object.assign(new Error("Official parcel ownership not found"), { status: 404 });
  if (STAFF_ROLES.has(actor.role)) return parcel;
  if (actor.role !== "OWNER") throw Object.assign(new Error("You do not have permission to view ownership information"), { status: 403 });
  const owner = await getLinkedOwner(actor.id, database);
  if (!parcel.owners.some(({ ownerId }) => ownerId === owner.id)) throw Object.assign(new Error("You do not have permission to view this parcel's ownership"), { status: 403 });
  return parcel;
}

export async function getCurrentOwners(parcelId, actor, database = getPrisma()) {
  await assertOwnershipAccess(parcelId, actor, database);
  const owners = await database.parcelOwner.findMany({
    where: { parcelId }, orderBy: { ownerId: "asc" },
    select: { sharePercent: true, owner: { select: { id: true, ownerType: true, fullName: true, companyName: true } } },
  });
  validateOwnershipShares(owners.map(({ owner, sharePercent }) => ({ ownerId: owner.id, sharePercent })));
  return owners.map(({ owner, sharePercent }) => ({ ...owner, displayName: owner.fullName || owner.companyName, sharePercent: sharePercent.toFixed(2) }));
}

export async function getOwnershipHistory(parcelId, actor, database = getPrisma()) {
  await assertOwnershipAccess(parcelId, actor, database);
  return database.ownershipHistory.findMany({
    where: { parcelId }, orderBy: [{ effectiveAt: "asc" }, { id: "asc" }],
    select: { id: true, eventType: true, effectiveAt: true, price: true, ownershipSnapshot: true, correctedEntryId: true, createdAt: true, approvedBy: { select: { id: true, fullName: true } } },
  });
}

export async function getParcelsOwnedByUser(userId, query, database = getPrisma()) {
  const owner = await getLinkedOwner(userId, database);
  const where = { owners: { some: { ownerId: owner.id } }, history: { some: { eventType: "REGISTRATION" } } };
  const select = {
    id: true, parcelNumber: true, areaName: true, areaM2: true, landUse: true, status: true,
    district: { select: { id: true, name: true, regionName: true } },
    owners: { where: { ownerId: owner.id }, select: { sharePercent: true } },
  };
  const [parcels, total] = await Promise.all([
    database.parcel.findMany({ where, select, orderBy: { parcelNumber: "asc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    database.parcel.count({ where }),
  ]);
  return { parcels: parcels.map(({ owners, ...parcel }) => ({ ...parcel, ownershipShare: owners[0].sharePercent.toFixed(2) })), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function getParcelOwnedByUser(userId, parcelId, database = getPrisma()) {
  const owner = await getLinkedOwner(userId, database);
  const parcel = await database.parcel.findFirst({
    where: { id: parcelId, owners: { some: { ownerId: owner.id } }, history: { some: { eventType: "REGISTRATION" } } },
    select: { id: true, parcelNumber: true, areaName: true, areaM2: true, landUse: true, status: true, district: { select: { id: true, name: true, regionName: true } }, owners: { where: { ownerId: owner.id }, select: { sharePercent: true } } },
  });
  if (!parcel) throw Object.assign(new Error("Parcel not found in your current ownership"), { status: 404 });
  const { owners, ...data } = parcel;
  return { ...data, ownershipShare: owners[0].sharePercent.toFixed(2) };
}
