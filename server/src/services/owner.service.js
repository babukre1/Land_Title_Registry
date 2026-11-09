import bcrypt from "bcrypt";
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

/** Creates one legal owner identity, optional linked login, and audit events atomically. */
export async function createOwner(input, actor) {
  const prisma = getPrisma();
  const common = { phone: cleanOptional(input.phone), email: cleanOptional(input.email)?.toLowerCase() || null, address: cleanOptional(input.address) };
  const data = input.ownerType === "PERSON"
    ? { ...common, ownerType: "PERSON", fullName: input.fullName.trim(), identityNumber: normalizeIdentifier(input.identityNumber) }
    : { ...common, ownerType: "COMPANY", companyName: input.companyName.trim(), registrationNumber: normalizeIdentifier(input.registrationNumber) };
  const passwordHash = input.loginPassword ? await bcrypt.hash(input.loginPassword, 12) : null;
  try {
    return await prisma.$transaction(async (transaction) => {
      let user = null;
      if (input.loginPassword) {
        const role = await transaction.role.findUnique({ where: { name: "OWNER" }, select: { id: true } });
        if (!role) throw Object.assign(new Error("OWNER role is not configured"), { status: 500 });
        user = await transaction.user.create({ data: { fullName: data.fullName || data.companyName, email: data.email, phone: data.phone, passwordHash, roleId: role.id } });
      }
      const owner = await transaction.owner.create({ data: { ...data, ...(user ? { userId: user.id } : {}) } });
      await transaction.auditLog.createMany({ data: [
        { userId: actor.id, action: "OWNER_CREATED", entityType: "Owner", entityId: String(owner.id), details: { ownerType: owner.ownerType, displayName: owner.fullName || owner.companyName, loginCreated: Boolean(user) } },
        ...(user ? [{ userId: actor.id, action: "USER_CREATED", entityType: "User", entityId: String(user.id), details: { role: "OWNER", linkedOwnerId: owner.id } }] : []),
      ] });
      return owner;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw Object.assign(new Error("An owner with that identity, registration number, or login email already exists"), { status: 409 });
    throw error;
  }
}
