import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";
import { getLinkedOwner } from "./ownership.service.js";
import { deleteObject, loadObject, storeObject } from "./object-storage.service.js";

const STAFF_ROLES = new Set(["CLERK", "REGISTRAR", "ADMIN"]);
const select = {
  id: true, type: true, status: true, bankName: true, mortgageAmount: true, courtCaseNumber: true,
  liftingReason: true, createdAt: true, liftedAt: true,
  createdBy: { select: { id: true, fullName: true } }, liftedBy: { select: { id: true, fullName: true } },
  liftingDocument: { select: { id: true, originalName: true, mimeType: true, fileSize: true } },
  parcel: { select: { id: true, parcelNumber: true } },
};

function httpError(message, status = 409) { return Object.assign(new Error(message), { status }); }
function assertSignature(file) {
  const bytes = file.buffer;
  const valid = bytes.subarray(0, 5).toString() === "%PDF-" || (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid) throw httpError("The evidence content does not match its allowed file type", 422);
}
async function assertAccess(parcelId, actor, database) {
  if (STAFF_ROLES.has(actor.role)) return;
  if (actor.role !== "OWNER") throw httpError("You do not have permission to view these restrictions", 403);
  const owner = await getLinkedOwner(actor.id, database);
  const link = await database.parcelOwner.findFirst({ where: { parcelId, ownerId: owner.id }, select: { id: true } });
  if (!link) throw httpError("You do not have permission to view these restrictions", 403);
}

/** Lists active and lifted restrictions for authorized staff/current owners; throws 403/404 for invalid access. */
export async function listParcelEncumbrances(parcelId, actor) {
  const prisma = getPrisma();
  const parcel = await prisma.parcel.findUnique({ where: { id: parcelId }, select: { id: true } });
  if (!parcel) throw httpError("Parcel not found", 404);
  await assertAccess(parcelId, actor, prisma);
  return prisma.encumbrance.findMany({ where: { parcelId }, select, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
}

/** Creates a registrar-authorized mortgage or court hold on a registered parcel and writes audit evidence. */
export async function createEncumbrance(parcelId, input, actor) {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const parcel = await transaction.parcel.findUnique({ where: { id: parcelId }, select: { id: true, status: true, parcelNumber: true } });
    if (!parcel) throw httpError("Parcel not found", 404);
    if (parcel.status !== "REGISTERED") throw httpError("Only a registered parcel can receive an encumbrance");
    const encumbrance = await transaction.encumbrance.create({ data: {
      parcelId, type: input.type, createdById: actor.id,
      bankName: input.type === "MORTGAGE" ? input.bankName : null,
      mortgageAmount: input.type === "MORTGAGE" ? new Prisma.Decimal(input.mortgageAmount) : null,
      courtCaseNumber: input.type === "COURT_HOLD" ? input.courtCaseNumber : null,
    }, select });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "ENCUMBRANCE_ADDED", entityType: "Encumbrance", entityId: String(encumbrance.id), details: { parcelId, parcelNumber: parcel.parcelNumber, type: input.type } } });
    return encumbrance;
  });
}

/** Lifts—not deletes—an active restriction after validating signed evidence and reason; retains protected history. */
export async function liftEncumbrance(id, reason, file, actor) {
  if (!file) throw httpError("Supporting evidence is required to lift an encumbrance", 422);
  assertSignature(file);
  const prisma = getPrisma();
  const encumbrance = await prisma.encumbrance.findUnique({ where: { id }, select: { id: true, status: true, parcelId: true } });
  if (!encumbrance) throw httpError("Encumbrance not found", 404);
  if (encumbrance.status !== "ACTIVE") throw httpError("This encumbrance has already been lifted");
  const extension = file.mimetype === "application/pdf" ? ".pdf" : file.mimetype === "image/png" ? ".png" : ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const filePath = await storeObject({ category: "encumbrance-evidence", storedName, buffer: file.buffer, mimeType: file.mimetype });
  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM encumbrances WHERE id=${id} FOR UPDATE`;
      const current = await transaction.encumbrance.findUnique({ where: { id }, select: { status: true } });
      if (!current || current.status !== "ACTIVE") throw httpError("This encumbrance is no longer active");
      const document = await transaction.document.create({ data: { originalName: path.basename(file.originalname).slice(0, 255), storedName, mimeType: file.mimetype, filePath, fileSize: file.size, uploadedById: actor.id } });
      const lifted = await transaction.encumbrance.update({ where: { id }, data: { status: "LIFTED", liftedById: actor.id, liftedAt: new Date(), liftingReason: reason, liftingDocumentId: document.id }, select });
      await transaction.auditLog.create({ data: { userId: actor.id, action: "ENCUMBRANCE_LIFTED", entityType: "Encumbrance", entityId: String(id), details: { parcelId: encumbrance.parcelId, reason, evidenceDocumentId: document.id } } });
      return lifted;
    });
  } catch (error) {
    await deleteObject(filePath).catch(() => {});
    throw error;
  }
}

export async function getEncumbranceEvidence(id, actor) {
  const prisma = getPrisma();
  const record = await prisma.encumbrance.findUnique({ where: { id }, select: { parcelId: true, liftingDocument: { select: { originalName: true, mimeType: true, filePath: true } } } });
  if (!record) throw httpError("Encumbrance not found", 404);
  await assertAccess(record.parcelId, actor, prisma);
  if (!record.liftingDocument) throw httpError("Lifting evidence not found", 404);
  const stored = await loadObject(record.liftingDocument.filePath);
  return { ...record.liftingDocument, buffer: stored || await readFile(record.liftingDocument.filePath) };
}
