import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "../lib/prisma.js";
import { calculateAreaM2, findParcelOverlaps, normalizePolygon, validatePolygon } from "./geometry.service.js";
import { deleteObject, loadObject, storeObject } from "./object-storage.service.js";

const REGISTRY_LOCK_KEY = 8092026;
const surveySelect = {
  id: true, status: true, boundaryCorrection: true, notes: true, cannotVerifyReason: true, verifiedAt: true, createdAt: true, updatedAt: true,
  surveyor: { select: { id: true, fullName: true } },
  reportDocument: { select: { id: true, originalName: true, mimeType: true, fileSize: true, createdAt: true } },
  parcel: { select: { id: true, parcelNumber: true, areaName: true, areaM2: true, landUse: true, status: true, district: { select: { id: true, name: true, regionName: true } }, owners: { select: { sharePercent: true, owner: { select: { id: true, fullName: true, companyName: true } } } } } },
};

function assertSignature(file) {
  const bytes = file.buffer;
  const pdf = bytes.subarray(0, 5).toString() === "%PDF-";
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!(pdf || jpeg || png)) throw Object.assign(new Error("The uploaded file content does not match an allowed report format"), { status: 422 });
}

async function geometryForSurvey(id, database) {
  const [row] = await database.$queryRaw`
    SELECT ST_AsGeoJSON(p.geometry)::json AS "currentGeometry",
           ST_AsGeoJSON(s.verified_geometry)::json AS "verifiedGeometry"
    FROM surveys s JOIN parcels p ON p.id = s.parcel_id WHERE s.id = ${id}
  `;
  return row || {};
}

export async function getPendingSurveys(query) {
  const prisma = getPrisma();
  const where = { ...(query.status ? { status: query.status } : {}), ...(query.districtId ? { parcel: { districtId: query.districtId } } : {}), ...(query.parcelNumber ? { parcel: { parcelNumber: { contains: query.parcelNumber, mode: "insensitive" } } } : {}) };
  const [surveys, total] = await Promise.all([prisma.survey.findMany({ where, select: surveySelect, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.survey.count({ where })]);
  return { surveys, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function getSurvey(id) {
  const prisma = getPrisma();
  const survey = await prisma.survey.findUnique({ where: { id }, select: surveySelect });
  if (!survey) throw Object.assign(new Error("Survey not found"), { status: 404 });
  return { ...survey, ...(await geometryForSurvey(id, prisma)) };
}

/** Validates and privately stores survey evidence; returns document metadata or 404/409/422 for invalid survey/file state. */
export async function saveSurveyReport(id, file, actor) {
  if (!file) throw Object.assign(new Error("A survey report file is required"), { status: 422 });
  assertSignature(file);
  const prisma = getPrisma();
  const survey = await prisma.survey.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!survey) throw Object.assign(new Error("Survey not found"), { status: 404 });
  if (!["PENDING", "IN_PROGRESS"].includes(survey.status)) throw Object.assign(new Error("This survey attempt no longer accepts reports"), { status: 409 });
  const extension = file.mimetype === "application/pdf" ? ".pdf" : file.mimetype === "image/png" ? ".png" : ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const filePath = await storeObject({ category: "survey-reports", storedName, buffer: file.buffer, mimeType: file.mimetype });
  let document;
  try {
    document = await prisma.$transaction(async (transaction) => {
      const created = await transaction.document.create({ data: { originalName: path.basename(file.originalname).slice(0, 255), storedName, mimeType: file.mimetype, filePath, fileSize: file.size, uploadedById: actor.id } });
      await transaction.survey.update({ where: { id }, data: { reportDocumentId: created.id, surveyorId: actor.id, status: "IN_PROGRESS" } });
      await transaction.auditLog.create({ data: { userId: actor.id, action: "SURVEY_REPORT_UPLOADED", entityType: "Survey", entityId: String(id), details: { documentId: created.id, mimeType: file.mimetype, fileSize: file.size } } });
      return created;
    });
  } catch (error) {
    await deleteObject(filePath).catch(() => {});
    throw error;
  }
  return { id: document.id, originalName: document.originalName, mimeType: document.mimeType, fileSize: document.fileSize, createdAt: document.createdAt };
}

export async function getSurveyReport(id) {
  const prisma = getPrisma();
  const survey = await prisma.survey.findUnique({ where: { id }, select: { reportDocument: { select: { originalName: true, mimeType: true, filePath: true } } } });
  if (!survey) throw Object.assign(new Error("Survey not found"), { status: 404 });
  if (!survey.reportDocument) throw Object.assign(new Error("Survey report not found"), { status: 404 });
  const stored = await loadObject(survey.reportDocument.filePath);
  return { ...survey.reportDocument, buffer: stored || await readFile(survey.reportDocument.filePath) };
}

async function preserveAdjustmentConflict(transaction, survey, geometry, areaM2, conflicts, actor) {
  const dispute = await transaction.dispute.create({ data: { description: `Survey boundary adjustment for ${survey.parcel.parcelNumber} overlaps protected land.`, openedById: actor.id } });
  const owners = survey.parcel.owners.map(({ owner, sharePercent }) => ({ ownerId: owner.id, displayName: owner.fullName || owner.companyName, sharePercent: Number(sharePercent) }));
  const [candidate] = await transaction.$queryRaw`
    INSERT INTO parcel_candidates (proposed_number, district_id, area_name, proposed_geometry, proposed_area_m2, land_use, owner_snapshot, idempotency_key, dispute_id, status, reason, created_by_id, created_at)
    VALUES (${survey.parcel.parcelNumber}, ${survey.parcel.districtId}, ${survey.parcel.areaName}, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326), ${areaM2}, ${survey.parcel.landUse}::"LandUse", ${JSON.stringify(owners)}::jsonb, ${`survey-${survey.id}-${randomUUID()}`}, ${dispute.id}, 'BLOCKED', 'Survey adjustment overlap', ${actor.id}, NOW()) RETURNING id
  `;
  await transaction.candidateConflict.createMany({ data: conflicts.map((conflict) => ({ candidateId: candidate.id, parcelId: conflict.id, overlapAreaM2: conflict.overlapAreaM2 })) });
  await transaction.disputeParcel.createMany({ data: [{ disputeId: dispute.id, parcelId: survey.parcel.id }, ...conflicts.map((conflict) => ({ disputeId: dispute.id, parcelId: conflict.id }))], skipDuplicates: true });
  await transaction.auditLog.create({ data: { userId: actor.id, action: "SURVEY_ADJUSTMENT_BLOCKED", entityType: "Survey", entityId: String(survey.id), details: { disputeId: dispute.id, conflictCount: conflicts.length } } });
  return dispute.id;
}

/** Verifies a pending survey and atomically stores the exact approved field boundary. */
/** Verifies field evidence and optional adjusted geometry, rechecks overlap, and returns updated survey/parcel state. */
export async function verifySurvey(id, input, actor) {
  const prisma = getPrisma();
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTRY_LOCK_KEY})`;
    const survey = await transaction.survey.findUnique({ where: { id }, select: { id: true, status: true, boundaryCorrection: true, reportDocumentId: true, parcel: { select: { id: true, districtId: true, parcelNumber: true, areaName: true, landUse: true, status: true, owners: { select: { sharePercent: true, owner: { select: { id: true, fullName: true, companyName: true } } } } } } } });
    if (!survey) throw Object.assign(new Error("Survey not found"), { status: 404 });
    const eligibleParcel = survey.boundaryCorrection ? survey.parcel.status === "DISPUTED" : survey.parcel.status === "PENDING_SURVEY";
    if (!["PENDING", "IN_PROGRESS"].includes(survey.status) || !eligibleParcel) throw Object.assign(new Error("Survey is not eligible for verification"), { status: 409 });
    if (!survey.reportDocumentId) throw Object.assign(new Error("A survey report is required before verification"), { status: 422 });
    const geometry = input.adjustedBoundary ? normalizePolygon(input.adjustedBoundary) : (await geometryForSurvey(id, transaction)).currentGeometry;
    const validation = await validatePolygon(geometry, transaction);
    if (!validation.isValid) throw Object.assign(new Error(`Invalid survey boundary: ${validation.reason}`), { status: 422 });
    const areaM2 = input.adjustedBoundary ? await calculateAreaM2(geometry, transaction) : Number((await transaction.parcel.findUnique({ where: { id: survey.parcel.id }, select: { areaM2: true } })).areaM2);
    const conflicts = await findParcelOverlaps(geometry, survey.parcel.id, transaction);
    if (conflicts.length) return { conflict: true, disputeId: await preserveAdjustmentConflict(transaction, survey, geometry, areaM2, conflicts, actor), conflicts };
    if (survey.boundaryCorrection) await transaction.parcel.update({ where: { id: survey.parcel.id }, data: { status: "VERIFIED" } });
    else await transaction.$executeRaw`UPDATE parcels SET geometry=ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326), area_m2=${areaM2}, status='VERIFIED', updated_at=NOW() WHERE id=${survey.parcel.id}`;
    await transaction.$executeRaw`UPDATE surveys SET status='VERIFIED', surveyor_id=${actor.id}, notes=${input.notes}, verified_at=NOW(), verified_geometry=ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326), verified_area_m2=${areaM2}, updated_at=NOW() WHERE id=${id}`;
    await transaction.auditLog.create({ data: { userId: actor.id, action: "SURVEY_VERIFIED", entityType: "Survey", entityId: String(id), details: { parcelId: survey.parcel.id, boundaryAdjusted: Boolean(input.adjustedBoundary), areaM2 } } });
    return { conflict: false };
  }, { maxWait: 10000, timeout: 30000 });
  if (result.conflict) return result;
  return getSurvey(id);
}

/** Records why a survey cannot be verified and returns the application for clerk correction without deleting attempts. */
export async function returnSurveyToClerk(id, reason, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    const survey = await transaction.survey.findUnique({ where: { id }, select: { status: true, boundaryCorrection: true, parcel: { select: { id: true, status: true } } } });
    if (!survey) throw Object.assign(new Error("Survey not found"), { status: 404 });
    const eligibleParcel = survey.boundaryCorrection ? survey.parcel.status === "DISPUTED" : survey.parcel.status === "PENDING_SURVEY";
    if (!["PENDING", "IN_PROGRESS"].includes(survey.status) || !eligibleParcel) throw Object.assign(new Error("Survey is not eligible to be returned"), { status: 409 });
    await transaction.survey.update({ where: { id }, data: { status: "CANNOT_VERIFY", cannotVerifyReason: reason, surveyorId: actor.id } });
    await transaction.parcel.update({ where: { id: survey.parcel.id }, data: { status: survey.boundaryCorrection ? "DISPUTED" : "RETURNED_FOR_CORRECTION" } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "SURVEY_CANNOT_VERIFY", entityType: "Survey", entityId: String(id), details: { parcelId: survey.parcel.id, reason } } });
  });
  return getSurvey(id);
}
