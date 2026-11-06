import { getPrisma } from "../lib/prisma.js";
import { findParcelById, findParcels } from "../repositories/parcel.repository.js";
import { calculateAreaM2, findParcelOverlaps, normalizePolygon, validatePolygon } from "./geometry.service.js";
import { validateOwnershipShares } from "./ownership.service.js";

const REGISTRATION_LOCK_KEY = 8092026;

function areaWarning(areaM2) {
  if (areaM2 < 20) return "AREA_BELOW_20_M2";
  if (areaM2 > 1_000_000) return "AREA_ABOVE_1000000_M2";
  return null;
}

function publicConflicts(conflicts) {
  return conflicts.map(({ id, parcelId, parcelNumber, status, overlapAreaM2, geometry, intersectionGeometry }) => ({
    parcelId: parcelId ?? id, parcelNumber, status, overlapAreaM2: Number(overlapAreaM2), geometry, intersectionGeometry,
  }));
}

async function loadRegistrationReferences(transaction, districtId, ownerShares) {
  const district = await transaction.district.findUnique({ where: { id: districtId }, select: { id: true, code: true, regionCode: true } });
  if (!district) throw Object.assign(new Error("District not found"), { status: 404 });
  const ownerIds = [...new Set(ownerShares.map(({ ownerId }) => ownerId))];
  if (ownerIds.length !== ownerShares.length) throw Object.assign(new Error("Each owner may appear only once"), { status: 422 });
  const owners = await transaction.owner.findMany({ where: { id: { in: ownerIds } }, select: { id: true, ownerType: true, fullName: true, companyName: true } });
  if (owners.length !== ownerIds.length) throw Object.assign(new Error("One or more selected owners do not exist"), { status: 422 });
  return { district, owners };
}

async function inspectProposal(input, database) {
  const geometry = normalizePolygon(input.geometry);
  validateOwnershipShares(input.owners);
  const validation = await validatePolygon(geometry, database);
  if (!validation.isValid) throw Object.assign(new Error(`Invalid parcel geometry: ${validation.reason}`), { status: 422 });
  const areaM2 = await calculateAreaM2(geometry, database);
  if (!Number.isFinite(areaM2) || areaM2 <= 0) throw Object.assign(new Error("Parcel area must be greater than zero"), { status: 422 });
  const conflicts = await findParcelOverlaps(geometry, null, database);
  return { geometry, areaM2, warning: areaWarning(areaM2), conflicts };
}

export async function previewParcel(input) {
  const prisma = getPrisma();
  await loadRegistrationReferences(prisma, input.districtId, input.owners);
  const result = await inspectProposal(input, prisma);
  return { valid: true, areaM2: result.areaM2, areaWarning: result.warning, hasOverlap: result.conflicts.length > 0, conflicts: publicConflicts(result.conflicts) };
}

async function existingRegistrationResult(transaction, idempotencyKey) {
  const parcel = await transaction.parcel.findUnique({ where: { registrationKey: idempotencyKey }, select: { id: true } });
  if (parcel) return { conflict: false, repeated: true, parcelId: parcel.id };
  const candidate = await transaction.parcelCandidate.findUnique({ where: { idempotencyKey }, select: { id: true, disputeId: true, proposedAreaM2: true } });
  if (!candidate) return null;
  const conflicts = await transaction.$queryRaw`
    SELECT p.id AS "parcelId", p.parcel_number AS "parcelNumber", p.status,
           cc.overlap_area_m2 AS "overlapAreaM2", ST_AsGeoJSON(p.geometry)::json AS geometry,
           ST_AsGeoJSON(ST_Intersection(p.geometry, pc.proposed_geometry))::json AS "intersectionGeometry"
    FROM candidate_conflicts cc JOIN parcels p ON p.id = cc.parcel_id
    JOIN parcel_candidates pc ON pc.id = cc.candidate_id WHERE cc.candidate_id = ${candidate.id}
  `;
  return { conflict: true, repeated: true, disputeId: candidate.disputeId, proposedAreaM2: Number(candidate.proposedAreaM2), conflicts: publicConflicts(conflicts) };
}

/** Serializes registration, rechecks PostGIS overlap, and commits either a parcel or dispute evidence. */
export async function registerParcel(input, actor) {
  const prisma = getPrisma();
  const outcome = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTRATION_LOCK_KEY})`;
    const repeated = await existingRegistrationResult(transaction, input.idempotencyKey);
    if (repeated) return repeated;
    const { district, owners } = await loadRegistrationReferences(transaction, input.districtId, input.owners);
    const inspected = await inspectProposal(input, transaction);
    if (inspected.warning && !input.confirmUnusualArea) throw Object.assign(new Error("Unusual parcel area requires explicit clerk confirmation"), { status: 422, code: inspected.warning });
    const ownerSnapshot = input.owners.map((share) => {
      const owner = owners.find((item) => item.id === share.ownerId);
      return { ownerId: owner.id, displayName: owner.fullName || owner.companyName, sharePercent: Number(share.sharePercent) };
    });

    if (inspected.conflicts.length > 0) {
      const dispute = await transaction.dispute.create({ data: { description: "Proposed parcel overlaps an existing protected parcel claim.", status: "OPEN", openedById: actor.id } });
      const [candidate] = await transaction.$queryRaw`
        INSERT INTO parcel_candidates (proposed_number, district_id, area_name, proposed_geometry, proposed_area_m2, land_use, owner_snapshot, idempotency_key, dispute_id, status, reason, created_by_id, created_at)
        VALUES (NULL, ${input.districtId}, ${input.areaName}, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(inspected.geometry)}), 4326), ${inspected.areaM2}, ${input.landUse}::"LandUse", ${JSON.stringify(ownerSnapshot)}::jsonb, ${input.idempotencyKey}, ${dispute.id}, 'BLOCKED'::"CandidateStatus", 'Overlap exceeds 1 square metre', ${actor.id}, NOW())
        RETURNING id
      `;
      await transaction.candidateConflict.createMany({ data: inspected.conflicts.map((conflict) => ({ candidateId: candidate.id, parcelId: conflict.id, overlapAreaM2: conflict.overlapAreaM2 })) });
      await transaction.disputeParcel.createMany({ data: inspected.conflicts.map((conflict) => ({ disputeId: dispute.id, parcelId: conflict.id })), skipDuplicates: true });
      await transaction.disputeParty.createMany({ data: ownerSnapshot.map((owner) => ({ disputeId: dispute.id, ownerId: owner.ownerId, displayName: owner.displayName, partyRole: "CLAIMANT", recordedById: actor.id })), skipDuplicates: true });
      await transaction.auditLog.create({ data: { userId: actor.id, action: "PARCEL_REGISTRATION_BLOCKED", entityType: "Dispute", entityId: String(dispute.id), details: { candidateId: candidate.id, conflictCount: inspected.conflicts.length, proposedAreaM2: inspected.areaM2 } } });
      return { conflict: true, disputeId: dispute.id, proposedAreaM2: inspected.areaM2, conflicts: publicConflicts(inspected.conflicts) };
    }

    const [counter] = await transaction.$queryRaw`
      UPDATE districts SET next_parcel_number = next_parcel_number + 1
      WHERE id = ${district.id}
      RETURNING next_parcel_number - 1 AS number
    `;
    const parcelNumber = `${district.regionCode}-${district.code}-${String(counter.number).padStart(6, "0")}`;
    const [parcel] = await transaction.$queryRaw`
      INSERT INTO parcels (parcel_number, registration_key, district_id, area_name, land_use, geometry, area_m2, status, created_by_id, created_at, updated_at)
      VALUES (${parcelNumber}, ${input.idempotencyKey}, ${district.id}, ${input.areaName}, ${input.landUse}::"LandUse", ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(inspected.geometry)}), 4326), ${inspected.areaM2}, 'PENDING_SURVEY'::"ParcelStatus", ${actor.id}, NOW(), NOW())
      RETURNING id
    `;
    await transaction.parcelOwner.createMany({ data: input.owners.map((owner) => ({ parcelId: parcel.id, ownerId: owner.ownerId, sharePercent: owner.sharePercent })) });
    await transaction.survey.create({ data: { parcelId: parcel.id, status: "PENDING", notes: "Awaiting surveyor assignment." } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "PARCEL_REGISTERED_PENDING_SURVEY", entityType: "Parcel", entityId: String(parcel.id), details: { parcelNumber, areaM2: inspected.areaM2, ownerCount: input.owners.length } } });
    return { conflict: false, parcelId: parcel.id };
  }, { maxWait: 10_000, timeout: 30_000 });

  if (outcome.conflict) return outcome;
  return { ...outcome, parcel: await findParcelById(outcome.parcelId, actor) };
}

export function listParcels(query, user) { return findParcels(query, user); }

export async function getParcel(id, user) {
  const parcel = await findParcelById(id, user);
  if (!parcel) throw Object.assign(new Error("Parcel not found"), { status: 404 });
  return parcel;
}

export async function getParcelGeoJson(user) {
  const prisma = getPrisma();
  const owner = user.role === "OWNER" ? await prisma.owner.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  const ownerId = user.role === "OWNER" ? owner?.id ?? -1 : null;
  const rows = await prisma.$queryRaw`
    SELECT p.id, p.parcel_number AS "parcelNumber", p.status, p.land_use AS "landUse",
           ST_AsGeoJSON(p.geometry)::json AS geometry
    FROM parcels p
    WHERE (${ownerId}::integer IS NULL OR EXISTS (SELECT 1 FROM parcel_owners po WHERE po.parcel_id = p.id AND po.owner_id = ${ownerId}))
    ORDER BY p.created_at DESC
  `;
  return { type: "FeatureCollection", features: rows.map((row) => ({ type: "Feature", geometry: row.geometry, properties: { id: row.id, parcelNumber: row.parcelNumber, status: row.status, landUse: row.landUse } })) };
}

/** Revalidates an unapproved returned parcel and creates a fresh survey attempt. */
export async function correctReturnedParcel(id, input, actor) {
  const prisma = getPrisma();
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTRATION_LOCK_KEY})`;
    const parcel = await transaction.parcel.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!parcel) throw Object.assign(new Error("Parcel not found"), { status: 404 });
    if (parcel.status !== "RETURNED_FOR_CORRECTION") throw Object.assign(new Error("Only a returned, unapproved parcel can be corrected"), { status: 409 });
    const { district } = await loadRegistrationReferences(transaction, input.districtId, input.owners);
    validateOwnershipShares(input.owners);
    const geometry = normalizePolygon(input.geometry);
    const validation = await validatePolygon(geometry, transaction);
    if (!validation.isValid) throw Object.assign(new Error(`Invalid corrected boundary: ${validation.reason}`), { status: 422 });
    const areaM2 = await calculateAreaM2(geometry, transaction);
    const warning = areaWarning(areaM2);
    if (warning && !input.confirmUnusualArea) throw Object.assign(new Error("Unusual parcel area requires explicit clerk confirmation"), { status: 422 });
    const conflicts = await findParcelOverlaps(geometry, id, transaction);
    if (conflicts.length) throw Object.assign(new Error("Corrected boundary overlaps protected land"), { status: 409, code: "PARCEL_OVERLAP", data: publicConflicts(conflicts) });
    await transaction.$executeRaw`UPDATE parcels SET district_id=${district.id}, area_name=${input.areaName}, land_use=${input.landUse}::"LandUse", geometry=ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),4326), area_m2=${areaM2}, status='PENDING_SURVEY', updated_at=NOW() WHERE id=${id}`;
    await transaction.parcelOwner.deleteMany({ where: { parcelId: id } });
    await transaction.parcelOwner.createMany({ data: input.owners.map((owner) => ({ parcelId: id, ownerId: owner.ownerId, sharePercent: owner.sharePercent })) });
    const survey = await transaction.survey.create({ data: { parcelId: id, status: "PENDING", notes: "Created after clerk correction." } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "PARCEL_CORRECTED_AND_RESUBMITTED", entityType: "Parcel", entityId: String(id), details: { newSurveyId: survey.id, areaM2 } } });
  }, { maxWait: 10000, timeout: 30000 });
  return getParcel(id, actor);
}
