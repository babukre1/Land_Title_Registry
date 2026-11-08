import { getPrisma } from "../lib/prisma.js";

/** Returns only statistics appropriate for the verified user's role. */
export async function getDashboardSummary(user, database = getPrisma()) {
  if (user.role === "OWNER") {
    const owner = await database.owner.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!owner) return { ownedParcels: 0, pendingTransfers: 0, currentCertificates: 0, analytics: { parcelsByStatus: [], parcelsByDistrict: [] } };
    const [ownedParcels, pendingTransfers, currentCertificates] = await Promise.all([
      database.parcel.count({ where: { owners: { some: { ownerId: owner.id } } } }),
      database.transfer.count({ where: { buyerOwnerId: owner.id, status: { notIn: ["APPROVED", "CANCELLED", "REJECTED"] } } }),
      database.certificate.count({ where: { status: "CURRENT", parcel: { owners: { some: { ownerId: owner.id } } } } }),
    ]);
    const owned = await database.parcel.findMany({ where: { owners: { some: { ownerId: owner.id } } }, select: { status: true, district: { select: { name: true } } } });
    const countBy = (key) => Object.entries(owned.reduce((counts, item) => { const label = key(item); counts[label] = (counts[label] || 0) + 1; return counts; }, {})).map(([label, value]) => ({ label, value }));
    return { ownedParcels, pendingTransfers, currentCertificates, analytics: { parcelsByStatus: countBy((item) => item.status), parcelsByDistrict: countBy((item) => item.district.name) } };
  }

  const common = await Promise.all([
    database.parcel.count({ where: { status: "REGISTERED" } }),
    database.parcel.count({ where: { status: "PENDING_SURVEY" } }),
    database.owner.count(),
    database.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);
  const summary = { registeredParcels: common[0], pendingSurveys: common[1], owners: common[2], openDisputes: common[3] };

  if (user.role === "SURVEYOR") {
    const [assignedPending, verifiedSurveys, returnedSurveys] = await Promise.all([
      database.survey.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] }, OR: [{ surveyorId: user.id }, { surveyorId: null }] } }),
      database.survey.count({ where: { surveyorId: user.id, status: "VERIFIED" } }),
      database.parcel.count({ where: { status: "RETURNED_FOR_CORRECTION" } }),
    ]);
    const analytics = await getParcelAnalytics(database);
    return { pendingSurveys: assignedPending, verifiedSurveys, returnedSurveys, analytics };
  }

  if (user.role === "ADMIN") {
    const [users, districts, totalParcels] = await Promise.all([database.user.count(), database.district.count(), database.parcel.count()]);
    return { ...summary, users, districts, totalParcels, analytics: await getParcelAnalytics(database) };
  }

  return { ...summary, analytics: await getParcelAnalytics(database) };
}

async function getParcelAnalytics(database) {
  const [statusRows, districtRows] = await Promise.all([
    database.parcel.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    database.district.findMany({ orderBy: { name: "asc" }, select: { name: true, _count: { select: { parcels: true } } } }),
  ]);
  return {
    parcelsByStatus: statusRows.map((row) => ({ label: row.status, value: row._count._all })),
    parcelsByDistrict: districtRows.map((row) => ({ label: row.name, value: row._count.parcels })),
  };
}
