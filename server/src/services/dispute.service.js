import { getPrisma } from "../lib/prisma.js";

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
      openedBy: { select: { id: true, fullName: true } },
      parties: { select: { id: true, ownerId: true, displayName: true, partyRole: true } },
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
  return { ...dispute, proposedGeometry: candidateGeometry?.geometry ?? null, conflicts };
}
