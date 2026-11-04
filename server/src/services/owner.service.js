import { Prisma } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";
import { findOwnerById, findOwners } from "../repositories/owner.repository.js";

function cleanOptional(value) { return value?.trim() || null; }
function normalizeIdentifier(value) { return value.trim().toUpperCase().replace(/\s+/g, "-"); }

export function listOwners(query) { return findOwners(query); }

export async function getOwner(id) {
  const owner = await findOwnerById(id);
  if (!owner) throw Object.assign(new Error("Owner not found"), { status: 404 });
  return owner;
}

/** Creates one legal owner identity and the matching audit event atomically. */
export async function createOwner(input, actor) {
  const prisma = getPrisma();
  const common = { phone: cleanOptional(input.phone), email: cleanOptional(input.email)?.toLowerCase() || null, address: cleanOptional(input.address) };
  const data = input.ownerType === "PERSON"
    ? { ...common, ownerType: "PERSON", fullName: input.fullName.trim(), identityNumber: normalizeIdentifier(input.identityNumber) }
    : { ...common, ownerType: "COMPANY", companyName: input.companyName.trim(), registrationNumber: normalizeIdentifier(input.registrationNumber) };
  try {
    return await prisma.$transaction(async (transaction) => {
      const owner = await transaction.owner.create({ data });
      await transaction.auditLog.create({ data: { userId: actor.id, action: "OWNER_CREATED", entityType: "Owner", entityId: String(owner.id), details: { ownerType: owner.ownerType, displayName: owner.fullName || owner.companyName } } });
      return owner;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw Object.assign(new Error("An owner with that identity or registration number already exists"), { status: 409 });
    throw error;
  }
}
