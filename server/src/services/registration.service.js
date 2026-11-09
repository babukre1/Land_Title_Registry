import { getPrisma } from "../lib/prisma.js";
import { findParcelById } from "../repositories/parcel.repository.js";
import { findParcelOverlaps, validatePolygon } from "./geometry.service.js";
import { validateOwnershipShares } from "./ownership.service.js";
import { issueTitleCertificate } from "./certificate.service.js";

const REGISTRY_LOCK_KEY = 8092026;

/** Returns the newest verified parcels/corrections awaiting registrar approval with paginated survey evidence. */
export async function getPendingRegistrations(query) {
  const prisma = getPrisma();
  const where = { status: "VERIFIED", surveys: { some: { status: "VERIFIED", reportDocumentId: { not: null } } } };
  const select = { id: true, parcelNumber: true, areaName: true, areaM2: true, status: true, district: { select: { name: true, regionName: true } }, owners: { select: { sharePercent: true, owner: { select: { id: true, fullName: true, companyName: true } } } }, surveys: { where: { status: "VERIFIED" }, take: 1, orderBy: { verifiedAt: "desc" }, select: { id: true, boundaryCorrection: true, verifiedAt: true, notes: true, surveyor: { select: { id: true, fullName: true } }, reportDocument: { select: { id: true, originalName: true, mimeType: true } } } } };
  const [parcels, total] = await Promise.all([prisma.parcel.findMany({ where, select, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }), prisma.parcel.count({ where })]);
  return { parcels, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

/** Atomically converts a verified application into a registered legal title event. */
export async function approveParcelRegistration(parcelId, registrar) {
  const prisma = getPrisma();
  const outcome = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTRY_LOCK_KEY})`;
    await transaction.$queryRaw`SELECT id FROM parcels WHERE id=${parcelId} FOR UPDATE`;
    const parcel = await transaction.parcel.findUnique({ where: { id: parcelId }, select: { id: true, parcelNumber: true, status: true, approvedById: true, areaM2: true, owners: { select: { sharePercent: true, owner: { select: { id: true, fullName: true, companyName: true } } } }, surveys: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, boundaryCorrection: true, reportDocumentId: true, verifiedAt: true } }, history: { orderBy: [{ effectiveAt: "desc" }, { id: "desc" }], select: { id: true, eventType: true } }, disputeParcels: { where: { dispute: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }, select: { disputeId: true } } } });
    if (!parcel) throw Object.assign(new Error("Parcel not found"), { status: 404 });
    if (parcel.status === "REGISTERED" && parcel.history.length) return { repeated: true, boundaryCorrection: false };
    if (parcel.status !== "VERIFIED") throw Object.assign(new Error("Only a verified parcel can be approved"), { status: 409 });
    const survey = parcel.surveys[0];
    if (!survey || survey.status !== "VERIFIED" || !survey.reportDocumentId || !survey.verifiedAt) throw Object.assign(new Error("A complete verified survey report is required"), { status: 409 });
    if (parcel.disputeParcels.length) throw Object.assign(new Error("An unresolved blocking dispute prevents approval"), { status: 409 });
    const [boundary] = await transaction.$queryRaw`SELECT ST_Equals(p.geometry,s.verified_geometry) AS matches, ST_AsGeoJSON(CASE WHEN s.boundary_correction THEN s.verified_geometry ELSE p.geometry END)::json AS geometry, s.verified_area_m2 AS "verifiedAreaM2" FROM parcels p JOIN surveys s ON s.id=${survey.id} WHERE p.id=${parcelId}`;
    if (!survey.boundaryCorrection && !boundary?.matches) throw Object.assign(new Error("Current parcel boundary does not match the verified survey boundary"), { status: 409 });
    const validation = await validatePolygon(boundary.geometry, transaction);
    if (!validation.isValid) throw Object.assign(new Error(`Invalid verified parcel geometry: ${validation.reason}`), { status: 422 });
    const conflicts = await findParcelOverlaps(boundary.geometry, parcelId, transaction);
    if (conflicts.length) throw Object.assign(new Error("Parcel now overlaps protected land and cannot be approved"), { status: 409 });
    validateOwnershipShares(parcel.owners);
    if (survey.boundaryCorrection && !parcel.history.length) throw Object.assign(new Error("Boundary correction requires an existing registered title"), { status: 409 });
    if (!survey.boundaryCorrection && parcel.history.length) throw Object.assign(new Error("Initial registration history already exists"), { status: 409 });
    const ownershipSnapshot = { owners: parcel.owners.map(({ owner, sharePercent }) => ({ ownerId: owner.id, name: owner.fullName || owner.companyName, sharePercent: sharePercent.toFixed(2) })) };
    const approvedAt = new Date();
    let history;
    if (survey.boundaryCorrection) {
      await transaction.$executeRaw`SELECT set_config('app.boundary_change_approved','true',true)`;
      await transaction.$executeRaw`UPDATE parcels AS p SET geometry=s.verified_geometry, area_m2=s.verified_area_m2, status='REGISTERED', approved_by_id=${registrar.id}, approved_at=${approvedAt}, updated_at=NOW() FROM surveys AS s WHERE p.id=${parcelId} AND s.id=${survey.id}`;
      history = await transaction.ownershipHistory.create({ data: { parcelId, eventType: "CORRECTION", effectiveAt: approvedAt, approvedById: registrar.id, correctedEntryId: parcel.history[0].id, ownershipSnapshot } });
    } else {
      await transaction.parcel.update({ where: { id: parcelId }, data: { status: "REGISTERED", approvedById: registrar.id, approvedAt } });
      history = await transaction.ownershipHistory.create({ data: { parcelId, eventType: "REGISTRATION", effectiveAt: approvedAt, approvedById: registrar.id, ownershipSnapshot } });
    }
    await transaction.auditLog.create({ data: { userId: registrar.id, action: survey.boundaryCorrection ? "BOUNDARY_CORRECTION_APPROVED" : "PARCEL_REGISTRATION_APPROVED", entityType: "Parcel", entityId: String(parcelId), details: { parcelNumber: parcel.parcelNumber, surveyId: survey.id, historyId: history.id } } });
    return { repeated: false, boundaryCorrection: survey.boundaryCorrection };
  }, { maxWait: 10000, timeout: 30000 });
  let certificatePending = false;
  if (outcome.boundaryCorrection) {
    try { await issueTitleCertificate(parcelId, registrar); }
    catch (error) { certificatePending = true; if (process.env.NODE_ENV !== "test") console.error("Boundary certificate replacement remains pending", error); }
  }
  return { repeated: outcome.repeated, certificatePending, parcel: await findParcelById(parcelId, registrar) };
}
