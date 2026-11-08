import { getPrisma } from "../lib/prisma.js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { deleteObject, loadObject, storeObject } from "./object-storage.service.js";

function httpError(message, status = 409) { return Object.assign(new Error(message), { status }); }
function assertSignature(file) {
  const bytes = file.buffer;
  const valid = bytes.subarray(0, 5).toString() === "%PDF-" || (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid) throw httpError("The evidence content does not match its allowed file type", 422);
}

export async function listDisputes({ status, q, page, limit }) {
  const prisma = getPrisma();
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { parcels: { some: { parcel: { parcelNumber: { contains: q, mode: "insensitive" } } } } } : {}),
  };
  const [disputes, total] = await Promise.all([
    prisma.dispute.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
      select: { id: true, description: true, status: true, createdAt: true, openedBy: { select: { id: true, fullName: true } }, parcels: { select: { parcel: { select: { id: true, parcelNumber: true, status: true } } } }, candidate: { select: { proposedAreaM2: true } } },
    }),
    prisma.dispute.count({ where }),
  ]);
  return { disputes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getDispute(id) {
  const prisma = getPrisma();
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    select: {
      id: true, description: true, status: true, resolution: true, resolvedAt: true, createdAt: true,
      openedBy: { select: { id: true, fullName: true } }, resolvedBy: { select: { id: true, fullName: true } },
      parties: { select: { id: true, ownerId: true, displayName: true, partyRole: true } },
      parcels: { select: { parcel: { select: { id: true, parcelNumber: true, status: true } } } },
      documents: { orderBy: { createdAt: "asc" }, select: { document: { select: { id: true, originalName: true, mimeType: true, fileSize: true, createdAt: true } } } },
      candidate: { select: { id: true, areaName: true, landUse: true, proposedAreaM2: true, ownerSnapshot: true, status: true, reason: true, createdAt: true } },
    },
  });
  if (!dispute) throw Object.assign(new Error("Dispute not found"), { status: 404 });
  const [candidateGeometry] = dispute.candidate ? await prisma.$queryRaw`
    SELECT ST_AsGeoJSON(proposed_geometry)::json AS geometry FROM parcel_candidates WHERE id = ${dispute.candidate.id}
  ` : [null];
  const conflicts = await prisma.$queryRaw`
    SELECT p.id AS "parcelId", p.parcel_number AS "parcelNumber", p.status,
           cc.overlap_area_m2 AS "overlapAreaM2", ST_AsGeoJSON(p.geometry)::json AS geometry,
           ST_AsGeoJSON(ST_Intersection(p.geometry, pc.proposed_geometry))::json AS "intersectionGeometry"
    FROM dispute_parcels dp
    JOIN parcels p ON p.id = dp.parcel_id
    LEFT JOIN parcel_candidates pc ON pc.dispute_id = dp.dispute_id
    LEFT JOIN candidate_conflicts cc ON cc.candidate_id = pc.id AND cc.parcel_id = p.id
    WHERE dp.dispute_id = ${id}
    ORDER BY p.parcel_number
  `;
  return { ...dispute, documents: dispute.documents.map(({ document }) => document), proposedGeometry: candidateGeometry?.geometry ?? null, conflicts };
}

export async function openManualDispute(input, actor) {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const parcels = await transaction.parcel.findMany({ where: { id: { in: input.parcelIds } }, select: { id: true, parcelNumber: true, owners: { select: { ownerId: true, owner: { select: { fullName: true, companyName: true } } } } } });
    if (parcels.length !== input.parcelIds.length) throw httpError("One or more parcels were not found", 404);
    const dispute = await transaction.dispute.create({ data: { description: input.description, openedById: actor.id, parcels: { create: parcels.map((parcel) => ({ parcelId: parcel.id })) } }, select: { id: true } });
    const parties = parcels.flatMap((parcel) => parcel.owners.map(({ ownerId, owner }) => ({ disputeId: dispute.id, ownerId, displayName: owner.fullName || owner.companyName, partyRole: "REGISTERED_OWNER", recordedById: actor.id })));
    if (parties.length) await transaction.disputeParty.createMany({ data: parties, skipDuplicates: true });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "DISPUTE_OPENED", entityType: "Dispute", entityId: String(dispute.id), details: { parcelIds: parcels.map(({ id }) => id) } } });
    return dispute.id;
  }).then((id) => getDispute(id));
}

export async function startDisputeReview(id, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const dispute = await transaction.dispute.findUnique({ where: { id }, select: { status: true } });
    if (!dispute) throw httpError("Dispute not found", 404);
    if (dispute.status !== "OPEN") throw httpError("Only an open dispute can enter review");
    await transaction.dispute.update({ where: { id }, data: { status: "UNDER_REVIEW" } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "DISPUTE_REVIEW_STARTED", entityType: "Dispute", entityId: String(id) } });
  });
  return getDispute(id);
}

export async function resolveDispute(id, input, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT id FROM disputes WHERE id=${id} FOR UPDATE`;
    const dispute = await transaction.dispute.findUnique({ where: { id }, select: { status: true, parcels: { select: { parcelId: true } } } });
    if (!dispute) throw httpError("Dispute not found", 404);
    if (!['OPEN', 'UNDER_REVIEW'].includes(dispute.status)) throw httpError("This dispute is already resolved");
    const linkedIds = new Set(dispute.parcels.map(({ parcelId }) => parcelId));
    if (input.boundaryChangeParcelIds.some((parcelId) => !linkedIds.has(parcelId))) throw httpError("Boundary review parcels must belong to this dispute", 422);
    for (const parcelId of input.boundaryChangeParcelIds) {
      const existing = await transaction.survey.findFirst({ where: { parcelId, status: { in: ["PENDING", "IN_PROGRESS"] } }, select: { id: true } });
      if (!existing) await transaction.survey.create({ data: { parcelId, status: "PENDING", boundaryCorrection: true, notes: `Boundary correction required by resolved dispute DIS-${String(id).padStart(5, "0")}.` } });
      await transaction.parcel.update({ where: { id: parcelId }, data: { status: "DISPUTED" } });
    }
    await transaction.dispute.update({ where: { id }, data: { status: "RESOLVED", resolution: input.resolution, resolvedById: actor.id, resolvedAt: new Date() } });
    if (input.candidateDecision) await transaction.parcelCandidate.updateMany({ where: { disputeId: id }, data: { status: input.candidateDecision, reason: input.resolution } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "DISPUTE_RESOLVED", entityType: "Dispute", entityId: String(id), details: { boundaryChangeParcelIds: input.boundaryChangeParcelIds, candidateDecision: input.candidateDecision || null } } });
  });
  return getDispute(id);
}

export async function saveDisputeEvidence(id, file, actor) {
  if (!file) throw httpError("An evidence file is required", 422);
  assertSignature(file);
  const prisma = getPrisma();
  const dispute = await prisma.dispute.findUnique({ where: { id }, select: { status: true } });
  if (!dispute) throw httpError("Dispute not found", 404);
  if (dispute.status === "RESOLVED") throw httpError("Resolved disputes do not accept new evidence");
  const extension = file.mimetype === "application/pdf" ? ".pdf" : file.mimetype === "image/png" ? ".png" : ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const filePath = await storeObject({ category: "dispute-evidence", storedName, buffer: file.buffer, mimeType: file.mimetype });
  try {
    return await prisma.$transaction(async (transaction) => {
      const document = await transaction.document.create({ data: { originalName: path.basename(file.originalname).slice(0, 255), storedName, mimeType: file.mimetype, filePath, fileSize: file.size, uploadedById: actor.id } });
      await transaction.disputeDocument.create({ data: { disputeId: id, documentId: document.id } });
      await transaction.auditLog.create({ data: { userId: actor.id, action: "DISPUTE_EVIDENCE_UPLOADED", entityType: "Dispute", entityId: String(id), details: { documentId: document.id } } });
      return { id: document.id, originalName: document.originalName, mimeType: document.mimeType, fileSize: document.fileSize };
    });
  } catch (error) { await deleteObject(filePath).catch(() => {}); throw error; }
}

export async function getDisputeEvidence(id, documentId) {
  const prisma = getPrisma();
  const link = await prisma.disputeDocument.findUnique({ where: { disputeId_documentId: { disputeId: id, documentId } }, select: { document: { select: { originalName: true, mimeType: true, filePath: true } } } });
  if (!link) throw httpError("Dispute evidence not found", 404);
  const stored = await loadObject(link.document.filePath);
  return { ...link.document, buffer: stored || await readFile(link.document.filePath) };
}
