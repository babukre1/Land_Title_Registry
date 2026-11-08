import { randomBytes } from "node:crypto";
import { getPrisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { validateOwnershipShares, getLinkedOwner } from "./ownership.service.js";
import { generateCertificatePdf } from "./certificate-pdf.service.js";
import { storeObject } from "./object-storage.service.js";

const CERTIFICATE_LOCK_KEY = 8092027;
const STAFF_ROLES = new Set(["CLERK", "REGISTRAR", "ADMIN"]);
const metadataSelect = {
  id: true, certificateNumber: true, parcelId: true, status: true, issuedAt: true, supersededAt: true,
  issuedBy: { select: { id: true, fullName: true } }, parcel: { select: { parcelNumber: true } },
};

function httpError(message, status = 409) { return Object.assign(new Error(message), { status }); }
function verificationUrl(token) { return `${env.PUBLIC_APP_URL || env.CLIENT_URL}/verify/${encodeURIComponent(token)}`; }

async function assertCertificateAccess(certificate, actor, database) {
  if (STAFF_ROLES.has(actor.role)) return;
  if (actor.role !== "OWNER") throw httpError("You do not have permission to access this certificate", 403);
  const owner = await getLinkedOwner(actor.id, database);
  const current = await database.parcelOwner.findFirst({ where: { parcelId: certificate.parcelId, ownerId: owner.id }, select: { id: true } });
  if (!current) throw httpError("You do not have permission to access this certificate", 403);
}

async function createSnapshot(parcelId, registrar, database) {
  const parcel = await database.parcel.findUnique({
    where: { id: parcelId },
    select: {
      id: true, parcelNumber: true, status: true, areaName: true, areaM2: true, landUse: true, approvedAt: true,
      district: { select: { name: true, regionName: true } },
      owners: { orderBy: { ownerId: "asc" }, select: { sharePercent: true, owner: { select: { id: true, ownerType: true, fullName: true, companyName: true } } } },
      history: { orderBy: { effectiveAt: "desc" }, take: 1, select: { id: true, eventType: true } },
      encumbrances: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { type: true, bankName: true, courtCaseNumber: true } },
    },
  });
  if (!parcel) throw httpError("Parcel not found", 404);
  if (parcel.status !== "REGISTERED") throw httpError("Only an officially registered parcel can receive a certificate", 409);
  if (!parcel.history.length) throw httpError("An approved ownership event is required before certificate issuance", 409);
  validateOwnershipShares(parcel.owners.map(({ owner, sharePercent }) => ({ ownerId: owner.id, sharePercent })));
  const [geometry] = await database.$queryRaw`SELECT ST_AsGeoJSON(geometry)::json AS geometry FROM parcels WHERE id = ${parcelId}`;
  if (!geometry?.geometry) throw httpError("Official parcel geometry is unavailable", 409);
  return {
    parcelNumber: parcel.parcelNumber,
    region: parcel.district.regionName,
    district: parcel.district.name,
    areaName: parcel.areaName,
    landUse: parcel.landUse,
    areaM2: parcel.areaM2.toFixed(2),
    geometry: geometry.geometry,
    owners: parcel.owners.map(({ owner, sharePercent }) => ({ name: owner.fullName || owner.companyName, ownerType: owner.ownerType, sharePercent: sharePercent.toFixed(2) })),
    encumbrances: parcel.encumbrances.map((item) => ({ type: item.type, reference: item.courtCaseNumber || item.bankName || null })),
    issuedAt: new Date().toISOString(),
    issuedBy: registrar.fullName,
    ownershipEventId: parcel.history[0].id,
  };
}

async function preparePendingCertificate(parcelId, registrar) {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${CERTIFICATE_LOCK_KEY}, ${parcelId})`;
    const existing = await transaction.certificate.findFirst({ where: { parcelId, status: "PENDING_GENERATION" } });
    if (existing) {
      const latestOwnership = await transaction.ownershipHistory.findFirst({
        where: { parcelId }, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }], select: { id: true },
      });
      if (latestOwnership && existing.certificateSnapshot?.ownershipEventId === latestOwnership.id) return existing;
      await transaction.certificate.update({ where: { id: existing.id }, data: { status: "INVALID" } });
    }
    const snapshot = await createSnapshot(parcelId, registrar, transaction);
    const [number] = await transaction.$queryRaw`
      SELECT COALESCE(MAX(RIGHT(certificate_number, 3)::integer), 0) + 1 AS version
      FROM certificates WHERE parcel_id = ${parcelId} AND certificate_number ~ '[0-9]{3}$'
    `;
    const certificateNumber = `LTC-${snapshot.parcelNumber}-${String(number.version).padStart(3, "0")}`;
    return transaction.certificate.create({ data: {
      certificateNumber, parcelId, status: "PENDING_GENERATION", issuedById: registrar.id,
      issuedAt: new Date(snapshot.issuedAt), verificationToken: randomBytes(32).toString("base64url"),
      filePath: `pending://${certificateNumber}`, certificateSnapshot: snapshot,
    } });
  });
}

export async function issueTitleCertificate(parcelId, registrar) {
  const prisma = getPrisma();
  const pending = await preparePendingCertificate(parcelId, registrar);
  const pdfInput = { certificateNumber: pending.certificateNumber, verificationToken: pending.verificationToken, status: "CURRENT", snapshot: pending.certificateSnapshot, verificationUrl: verificationUrl(pending.verificationToken) };
  const [englishPdf] = await Promise.all([
    generateCertificatePdf({ ...pdfInput, language: "en" }),
    generateCertificatePdf({ ...pdfInput, language: "so" }),
  ]);
  const filePath = await storeObject({ category: "certificates", storedName: `${pending.certificateNumber}.pdf`, buffer: englishPdf, mimeType: "application/pdf" });
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${CERTIFICATE_LOCK_KEY}, ${parcelId})`;
    const currentPending = await transaction.certificate.findUnique({ where: { id: pending.id }, select: { status: true } });
    if (!currentPending || currentPending.status !== "PENDING_GENERATION") throw httpError("Certificate issuance is no longer pending");
    const now = new Date();
    await transaction.certificate.updateMany({ where: { parcelId, status: "CURRENT" }, data: { status: "SUPERSEDED", supersededAt: now } });
    const issued = await transaction.certificate.update({ where: { id: pending.id }, data: { status: "CURRENT", filePath }, select: metadataSelect });
    await transaction.auditLog.create({ data: { userId: registrar.id, action: "TITLE_CERTIFICATE_ISSUED", entityType: "Certificate", entityId: String(issued.id), details: { parcelId, certificateNumber: issued.certificateNumber } } });
    return issued;
  });
}

export async function listParcelCertificates(parcelId, actor) {
  const prisma = getPrisma();
  const parcel = await prisma.parcel.findUnique({ where: { id: parcelId }, select: { id: true } });
  if (!parcel) throw httpError("Parcel not found", 404);
  await assertCertificateAccess({ parcelId }, actor, prisma);
  return prisma.certificate.findMany({ where: { parcelId, status: { not: "PENDING_GENERATION" } }, select: metadataSelect, orderBy: [{ issuedAt: "desc" }, { id: "desc" }] });
}

export async function listCertificates(actor) {
  const prisma = getPrisma();
  let where = { status: { not: "PENDING_GENERATION" } };
  if (actor.role === "OWNER") {
    const owner = await getLinkedOwner(actor.id, prisma);
    where = { ...where, parcel: { owners: { some: { ownerId: owner.id } } } };
  } else if (!STAFF_ROLES.has(actor.role)) throw httpError("You do not have permission to view certificates", 403);
  return prisma.certificate.findMany({ where, select: metadataSelect, orderBy: [{ issuedAt: "desc" }, { id: "desc" }] });
}

export async function getCertificate(id, actor) {
  const prisma = getPrisma();
  const certificate = await prisma.certificate.findUnique({ where: { id }, select: { ...metadataSelect, verificationToken: true, certificateSnapshot: true } });
  if (!certificate || certificate.status === "PENDING_GENERATION") throw httpError("Certificate not found", 404);
  await assertCertificateAccess(certificate, actor, prisma);
  const { verificationToken, ...safeCertificate } = certificate;
  return { ...safeCertificate, verificationUrl: verificationUrl(verificationToken) };
}

export async function downloadCertificate(id, actor, language) {
  const certificate = await getCertificate(id, actor);
  const buffer = await generateCertificatePdf({
    certificateNumber: certificate.certificateNumber,
    status: certificate.status, snapshot: certificate.certificateSnapshot, language,
    verificationUrl: certificate.verificationUrl,
  });
  return { buffer, filename: `${certificate.certificateNumber}-${language}.pdf` };
}

function invalidVerification() { return { status: "INVALID", message: "This certificate could not be verified." }; }

async function publicResult(certificate) {
  if (!certificate || certificate.status === "PENDING_GENERATION" || certificate.status === "INVALID") return invalidVerification();
  const prisma = getPrisma();
  const parcel = await prisma.parcel.findUnique({
    where: { id: certificate.parcelId },
    select: {
      encumbrances: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
      disputeParcels: { where: { dispute: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }, select: { id: true }, take: 1 },
      owners: { orderBy: { ownerId: "asc" }, select: { sharePercent: true, owner: { select: { fullName: true, companyName: true } } } },
    },
  });
  const snapshot = certificate.certificateSnapshot;
  return {
    certificateNumber: certificate.certificateNumber,
    parcelNumber: snapshot.parcelNumber,
    status: certificate.status,
    district: snapshot.district,
    areaM2: snapshot.areaM2,
    owners: snapshot.owners.map((owner) => ({ name: owner.name, sharePercent: owner.sharePercent })),
    ...(certificate.status === "SUPERSEDED" ? { currentOwners: parcel.owners.map(({ owner, sharePercent }) => ({ name: owner.fullName || owner.companyName, sharePercent: sharePercent.toFixed(2) })) } : {}),
    hasActiveEncumbrance: parcel.encumbrances.length > 0,
    hasUnresolvedDispute: parcel.disputeParcels.length > 0,
    issuedAt: certificate.issuedAt,
  };
}

export async function verifyByToken(token) {
  const certificate = await getPrisma().certificate.findUnique({ where: { verificationToken: token } });
  return publicResult(certificate);
}

export async function verifyManually(parcelNumber, certificateNumber) {
  const certificate = await getPrisma().certificate.findFirst({ where: { certificateNumber, parcel: { parcelNumber } } });
  return publicResult(certificate);
}
