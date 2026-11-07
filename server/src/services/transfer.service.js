import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "../lib/prisma.js";
import { getLinkedOwner, validateOwnershipShares } from "./ownership.service.js";
import { deleteObject, loadObject, storeObject } from "./object-storage.service.js";

const REGISTRY_LOCK_KEY = 8092026;
const FINAL_STATUSES = ["APPROVED", "CANCELLED", "REJECTED"];
const STAFF_ROLES = new Set(["CLERK", "REGISTRAR", "ADMIN"]);
const ownerDisplay = { id: true, ownerType: true, fullName: true, companyName: true };
const transferSelect = {
  id: true, transferType: true, declaredPrice: true, sellerSnapshot: true, status: true, buyerAcceptedAt: true, buyerRejectedAt: true,
  clerkReviewedAt: true, clerkReviewNotes: true, registrarApprovedAt: true, cancellationReason: true, rejectionReason: true, createdAt: true, updatedAt: true,
  parcel: { select: { id: true, parcelNumber: true, areaName: true, areaM2: true, status: true, district: { select: { name: true, regionName: true } } } },
  initiatedBy: { select: { id: true, fullName: true } }, buyerOwner: { select: ownerDisplay },
  clerkReviewedBy: { select: { id: true, fullName: true } }, registrarApprovedBy: { select: { id: true, fullName: true } },
  consents: { orderBy: { ownerId: "asc" }, select: { ownerId: true, consentStatus: true, confirmedAt: true, owner: { select: ownerDisplay } } },
  payments: { orderBy: { createdAt: "desc" }, select: { id: true, amount: true, paymentMethod: true, status: true, referenceNumber: true, paidAt: true, createdAt: true } },
  documents: { orderBy: { createdAt: "asc" }, select: { document: { select: { id: true, originalName: true, mimeType: true, fileSize: true, createdAt: true } } } },
};

function httpError(message, status = 409, code) { return Object.assign(new Error(message), { status, code }); }
function snapshot(owners) { return { owners: owners.map(({ owner, sharePercent }) => ({ ownerId: owner.id, name: owner.fullName || owner.companyName, sharePercent: new Prisma.Decimal(sharePercent).toFixed(2) })) }; }
function assertSignature(file) {
  const bytes = file.buffer;
  const valid = bytes.subarray(0, 5).toString() === "%PDF-" || (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid) throw httpError("The uploaded content does not match an allowed document format", 422);
}
function serializeTransfer(transfer) {
  const documents = transfer.documents?.map(({ document }) => document) || [];
  const paid = transfer.payments?.some((payment) => payment.status === "PAID") || false;
  const lowPriceWarning = transfer.declaredPrice && new Prisma.Decimal(transfer.declaredPrice).div(transfer.parcel.areaM2).lt(1);
  return { ...transfer, documents, paymentSatisfied: paid, lowPriceWarning, certificateReissueRequired: transfer.status === "APPROVED" };
}
async function loadOfficialParcel(transaction, parcelId) {
  const parcel = await transaction.parcel.findUnique({
    where: { id: parcelId },
    select: { id: true, parcelNumber: true, status: true, areaM2: true,
      history: { where: { eventType: "REGISTRATION" }, select: { id: true }, take: 1 },
      owners: { orderBy: { ownerId: "asc" }, select: { ownerId: true, sharePercent: true, owner: { select: ownerDisplay } } },
      disputeParcels: { where: { dispute: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }, select: { id: true }, take: 1 },
      encumbrances: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });
  if (!parcel) throw httpError("Parcel not found", 404);
  if (parcel.status !== "REGISTERED" || parcel.history.length === 0) throw httpError("Only officially registered parcels may be transferred", 409);
  if (parcel.disputeParcels.length) throw httpError("An open dispute blocks this transfer", 409);
  if (parcel.encumbrances.length) throw httpError("An active encumbrance blocks this transfer", 409);
  validateOwnershipShares(parcel.owners.map(({ ownerId, sharePercent }) => ({ ownerId, sharePercent })));
  return parcel;
}
async function assertParticipant(transfer, actor, database) {
  if (STAFF_ROLES.has(actor.role)) return null;
  if (actor.role !== "OWNER") throw httpError("You do not have permission to view this transfer", 403);
  const owner = await getLinkedOwner(actor.id, database);
  const participants = new Set([transfer.buyerOwnerId, ...(transfer.sellerSnapshot?.owners || []).map((item) => Number(item.ownerId))]);
  if (!participants.has(owner.id) && transfer.initiatedById !== actor.id) throw httpError("You do not have permission to view this transfer", 403);
  return owner;
}

export async function initiateTransfer(input, actor) {
  if (input.transferType !== "SALE") throw httpError("Only whole-parcel SALE transfers are available in Phase 10", 422);
  const prisma = getPrisma();
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTRY_LOCK_KEY})`;
    const seller = await getLinkedOwner(actor.id, transaction);
    const parcel = await loadOfficialParcel(transaction, input.parcelId);
    if (!parcel.owners.some(({ ownerId }) => ownerId === seller.id)) throw httpError("Only a current owner can initiate this transfer", 403);
    if (parcel.owners.length === 1 && parcel.owners[0].ownerId === input.buyerOwnerId) throw httpError("The sole current owner cannot be the buyer", 422);
    const buyer = await transaction.owner.findUnique({ where: { id: input.buyerOwnerId }, select: { id: true } });
    if (!buyer) throw httpError("Buyer owner record not found", 404);
    const existing = await transaction.transfer.findFirst({ where: { parcelId: parcel.id, status: { notIn: FINAL_STATUSES } }, select: { id: true } });
    if (existing) throw httpError("This parcel already has an open transfer", 409);
    const sellerSnapshot = snapshot(parcel.owners);
    const created = await transaction.transfer.create({ data: {
      parcelId: parcel.id, initiatedById: actor.id, buyerOwnerId: buyer.id, transferType: "SALE", declaredPrice: new Prisma.Decimal(input.declaredPrice), sellerSnapshot,
      consents: { create: parcel.owners.map(({ ownerId }) => ({ ownerId })) },
    }, select: { id: true } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "TRANSFER_INITIATED", entityType: "Transfer", entityId: String(created.id), details: { parcelId: parcel.id, buyerOwnerId: buyer.id, type: "SALE" } } });
    return created.id;
  }, { maxWait: 10000, timeout: 30000 });
  return getTransfer(result, actor);
}

export async function listTransfers(query) {
  const prisma = getPrisma();
  const where = { ...(query.status ? { status: query.status } : {}), ...(query.type ? { transferType: query.type } : {}), ...(query.parcelNumber ? { parcel: { parcelNumber: { contains: query.parcelNumber, mode: "insensitive" } } } : {}) };
  const [transfers, total] = await Promise.all([prisma.transfer.findMany({ where, select: transferSelect, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.transfer.count({ where })]);
  return { transfers: transfers.map(serializeTransfer), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function getMyTransfers(actor, query) {
  const prisma = getPrisma(); const owner = await getLinkedOwner(actor.id, prisma);
  const where = { OR: [{ initiatedById: actor.id }, { buyerOwnerId: owner.id }, { consents: { some: { ownerId: owner.id } } }] };
  const [transfers, total] = await Promise.all([prisma.transfer.findMany({ where, select: transferSelect, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.transfer.count({ where })]);
  return { transfers: transfers.map(serializeTransfer), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function getTransfer(id, actor, database = getPrisma()) {
  const base = await database.transfer.findUnique({ where: { id }, select: { id: true, buyerOwnerId: true, initiatedById: true, sellerSnapshot: true } });
  if (!base) throw httpError("Transfer not found", 404);
  const viewerOwner = await assertParticipant(base, actor, database);
  const transfer = await database.transfer.findUnique({ where: { id }, select: transferSelect });
  const timeline = await database.auditLog.findMany({ where: { entityType: "Transfer", entityId: String(id) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { action: true, createdAt: true, details: true, user: { select: { fullName: true } } } });
  return { ...serializeTransfer(transfer), timeline, viewerOwnerId: viewerOwner?.id ?? null };
}

export async function respondToConsent(id, decision, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const owner = await getLinkedOwner(actor.id, transaction);
    const transfer = await transaction.transfer.findUnique({ where: { id }, select: { status: true, consents: { select: { ownerId: true, consentStatus: true } } } });
    if (!transfer) throw httpError("Transfer not found", 404);
    if (transfer.status !== "AWAITING_OWNER_CONSENT") throw httpError("This transfer is not awaiting owner consent");
    const consent = transfer.consents.find((item) => item.ownerId === owner.id);
    if (!consent) throw httpError("You are not a required seller for this transfer", 403);
    if (consent.consentStatus !== "PENDING") throw httpError("Your consent response has already been recorded");
    await transaction.transferConsent.update({ where: { transferId_ownerId: { transferId: id, ownerId: owner.id } }, data: { consentStatus: decision, confirmedAt: new Date() } });
    const action = decision === "CONFIRMED" ? "OWNER_CONSENT_CONFIRMED" : "OWNER_CONSENT_DECLINED";
    if (decision === "DECLINED") await transaction.transfer.update({ where: { id }, data: { status: "REJECTED", rejectionReason: "A required current owner declined consent" } });
    else if (transfer.consents.every((item) => item.ownerId === owner.id || item.consentStatus === "CONFIRMED")) await transaction.transfer.update({ where: { id }, data: { status: "AWAITING_BUYER_ACCEPTANCE" } });
    await transaction.auditLog.create({ data: { userId: actor.id, action, entityType: "Transfer", entityId: String(id), details: { ownerId: owner.id } } });
  });
  return getTransfer(id, actor);
}

export async function respondAsBuyer(id, decision, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const owner = await getLinkedOwner(actor.id, transaction);
    const transfer = await transaction.transfer.findUnique({ where: { id }, select: { status: true, buyerOwnerId: true } });
    if (!transfer) throw httpError("Transfer not found", 404);
    if (transfer.buyerOwnerId !== owner.id) throw httpError("Only the verified buyer may respond", 403);
    if (transfer.status !== "AWAITING_BUYER_ACCEPTANCE") throw httpError("This transfer is not awaiting buyer acceptance");
    await transaction.transfer.update({ where: { id }, data: decision === "ACCEPTED" ? { buyerAcceptedAt: new Date(), status: "CLERK_REVIEW" } : { buyerRejectedAt: new Date(), status: "REJECTED", rejectionReason: "Buyer rejected the transfer" } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: decision === "ACCEPTED" ? "BUYER_ACCEPTED" : "BUYER_REJECTED", entityType: "Transfer", entityId: String(id), details: { buyerOwnerId: owner.id } } });
  });
  return getTransfer(id, actor);
}

export async function saveTransferDocument(id, file, actor) {
  if (!file) throw httpError("A transfer document is required", 422); assertSignature(file);
  const prisma = getPrisma();
  const base = await prisma.transfer.findUnique({ where: { id }, select: { id: true, status: true, buyerOwnerId: true, initiatedById: true, sellerSnapshot: true } });
  if (!base) throw httpError("Transfer not found", 404); await assertParticipant(base, actor, prisma);
  if (FINAL_STATUSES.includes(base.status)) throw httpError("Finalized transfers do not accept documents");
  const extension = file.mimetype === "application/pdf" ? ".pdf" : file.mimetype === "image/png" ? ".png" : ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const filePath = await storeObject({ category: "transfer-documents", storedName, buffer: file.buffer, mimeType: file.mimetype });
  let document;
  try {
    document = await prisma.$transaction(async (transaction) => {
      const created = await transaction.document.create({ data: { originalName: path.basename(file.originalname).slice(0, 255), storedName, mimeType: file.mimetype, filePath, fileSize: file.size, uploadedById: actor.id } });
      await transaction.transferDocument.create({ data: { transferId: id, documentId: created.id } });
      await transaction.auditLog.create({ data: { userId: actor.id, action: "TRANSFER_DOCUMENT_UPLOADED", entityType: "Transfer", entityId: String(id), details: { documentId: created.id, mimeType: file.mimetype, fileSize: file.size } } }); return created;
    });
  } catch (error) {
    await deleteObject(filePath).catch(() => {});
    throw error;
  }
  return { id: document.id, originalName: document.originalName, mimeType: document.mimeType, fileSize: document.fileSize };
}

export async function getTransferDocument(id, documentId, actor) {
  const prisma = getPrisma(); const base = await prisma.transfer.findUnique({ where: { id }, select: { id: true, buyerOwnerId: true, initiatedById: true, sellerSnapshot: true } });
  if (!base) throw httpError("Transfer not found", 404); await assertParticipant(base, actor, prisma);
  const link = await prisma.transferDocument.findUnique({ where: { transferId_documentId: { transferId: id, documentId } }, select: { document: { select: { originalName: true, mimeType: true, filePath: true } } } });
  if (!link) throw httpError("Transfer document not found", 404);
  const stored = await loadObject(link.document.filePath);
  return { ...link.document, buffer: stored || await readFile(link.document.filePath) };
}

export async function reviewTransferDocuments(id, input, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const transfer = await transaction.transfer.findUnique({ where: { id }, select: { status: true, documents: { select: { id: true }, take: 1 } } });
    if (!transfer) throw httpError("Transfer not found", 404); if (transfer.status !== "CLERK_REVIEW") throw httpError("Transfer is not awaiting clerk review");
    if (input.decision === "APPROVED" && transfer.documents.length === 0) throw httpError("At least one supporting document is required", 422);
    await transaction.transfer.update({ where: { id }, data: input.decision === "APPROVED" ? { clerkReviewedById: actor.id, clerkReviewedAt: new Date(), clerkReviewNotes: input.notes, status: "AWAITING_PAYMENT" } : { clerkReviewedById: null, clerkReviewedAt: null, clerkReviewNotes: input.notes } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: input.decision === "APPROVED" ? "CLERK_DOCUMENTS_APPROVED" : "CLERK_DOCUMENTS_RETURNED", entityType: "Transfer", entityId: String(id), details: { notes: input.notes } } });
  }); return getTransfer(id, actor);
}

export async function cancelTransfer(id, reason, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const owner = await getLinkedOwner(actor.id, transaction); const transfer = await transaction.transfer.findUnique({ where: { id }, select: { status: true, initiatedById: true, buyerOwnerId: true } });
    if (!transfer) throw httpError("Transfer not found", 404); if (FINAL_STATUSES.includes(transfer.status)) throw httpError("A finalized transfer cannot be cancelled");
    if (transfer.initiatedById !== actor.id && transfer.buyerOwnerId !== owner.id) throw httpError("Only the initiating seller or buyer may cancel", 403);
    await transaction.transfer.update({ where: { id }, data: { status: "CANCELLED", cancellationReason: reason } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "TRANSFER_CANCELLED", entityType: "Transfer", entityId: String(id), details: { reason } } });
  }); return getTransfer(id, actor);
}

export async function rejectTransfer(id, reason, actor) {
  const prisma = getPrisma(); await prisma.$transaction(async (transaction) => {
    const transfer = await transaction.transfer.findUnique({ where: { id }, select: { status: true } }); if (!transfer) throw httpError("Transfer not found", 404); if (FINAL_STATUSES.includes(transfer.status)) throw httpError("Transfer is already finalized");
    await transaction.transfer.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "REGISTRAR_REJECTED", entityType: "Transfer", entityId: String(id), details: { reason } } });
  }); return getTransfer(id, actor);
}

export async function approveTransfer(id, actor) {
  const prisma = getPrisma(); let repeated = false;
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTRY_LOCK_KEY})`;
    await transaction.$queryRaw`SELECT id FROM transfers WHERE id=${id} FOR UPDATE`;
    const transfer = await transaction.transfer.findUnique({ where: { id }, select: { id: true, parcelId: true, buyerOwnerId: true, transferType: true, declaredPrice: true, sellerSnapshot: true, status: true, buyerAcceptedAt: true, clerkReviewedAt: true, consents: { select: { consentStatus: true } }, payments: { where: { status: "PAID" }, select: { id: true }, take: 1 }, buyerOwner: { select: ownerDisplay } } });
    if (!transfer) throw httpError("Transfer not found", 404);
    if (transfer.status === "APPROVED") { repeated = true; return; }
    if (!transfer.buyerAcceptedAt || !transfer.clerkReviewedAt || transfer.consents.length === 0 || transfer.consents.some(({ consentStatus }) => consentStatus !== "CONFIRMED")) throw httpError("Required consents, buyer acceptance, and clerk review must be complete");
    if (transfer.payments.length === 0) throw httpError("Payment required before approval", 409, "PAYMENT_REQUIRED");
    const parcel = await loadOfficialParcel(transaction, transfer.parcelId);
    const current = snapshot(parcel.owners); const expected = transfer.sellerSnapshot;
    const ownershipKey = (value) => JSON.stringify(value.owners.map(({ ownerId, sharePercent }) => ({ ownerId: Number(ownerId), sharePercent: new Prisma.Decimal(sharePercent).toFixed(2) })).sort((a, b) => a.ownerId - b.ownerId));
    if (ownershipKey(current) !== ownershipKey(expected)) throw httpError("Current ownership no longer matches the required seller snapshot");
    await transaction.parcelOwner.deleteMany({ where: { parcelId: transfer.parcelId } });
    await transaction.parcelOwner.create({ data: { parcelId: transfer.parcelId, ownerId: transfer.buyerOwnerId, sharePercent: new Prisma.Decimal(100) } });
    const ownershipSnapshot = { owners: [{ ownerId: transfer.buyerOwner.id, name: transfer.buyerOwner.fullName || transfer.buyerOwner.companyName, sharePercent: "100.00" }] };
    await transaction.ownershipHistory.create({ data: { parcelId: transfer.parcelId, transferId: id, eventType: "SALE", effectiveAt: new Date(), price: transfer.declaredPrice, approvedById: actor.id, ownershipSnapshot } });
    await transaction.certificate.updateMany({ where: { parcelId: transfer.parcelId, status: "CURRENT" }, data: { status: "SUPERSEDED", supersededAt: new Date() } });
    await transaction.transfer.update({ where: { id }, data: { status: "APPROVED", registrarApprovedById: actor.id, registrarApprovedAt: new Date() } });
    await transaction.auditLog.createMany({ data: [
      { userId: actor.id, action: "REGISTRAR_APPROVED", entityType: "Transfer", entityId: String(id), details: { parcelId: transfer.parcelId } },
      { userId: actor.id, action: "OWNERSHIP_CHANGED", entityType: "Transfer", entityId: String(id), details: ownershipSnapshot },
      { userId: actor.id, action: "CERTIFICATE_REISSUE_REQUIRED", entityType: "Transfer", entityId: String(id), details: { parcelId: transfer.parcelId, generated: false } },
    ] });
  }, { maxWait: 10000, timeout: 30000 });
  return { repeated, transfer: await getTransfer(id, actor) };
}

export async function searchBuyers(query, actor) {
  const prisma = getPrisma(); const linked = await getLinkedOwner(actor.id, prisma);
  return prisma.owner.findMany({ where: { id: { not: linked.id }, ...(query ? { OR: [{ fullName: { contains: query, mode: "insensitive" } }, { companyName: { contains: query, mode: "insensitive" } }] } : {}) }, select: ownerDisplay, orderBy: [{ fullName: "asc" }, { companyName: "asc" }], take: 20 });
}
