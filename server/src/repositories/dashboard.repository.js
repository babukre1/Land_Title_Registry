import { getPrisma } from "../lib/prisma.js";

/** Returns only statistics appropriate for the verified user's role. */
export async function getDashboardSummary(user, database = getPrisma()) {
  if (user.role === "OWNER") {
    const owner = await database.owner.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!owner) return { ownedParcels: 0, pendingTransfers: 0, currentCertificates: 0, analytics: { parcelsByStatus: [], parcelsByDistrict: [] } };
    const [ownedParcels, pendingTransfers, currentCertificates, shares, recentActivity] = await Promise.all([
      database.parcel.count({ where: { owners: { some: { ownerId: owner.id } } } }),
      database.transfer.count({ where: { buyerOwnerId: owner.id, status: { notIn: ["APPROVED", "CANCELLED", "REJECTED"] } } }),
      database.certificate.count({ where: { status: "CURRENT", parcel: { owners: { some: { ownerId: owner.id } } } } }),
      database.parcelOwner.findMany({ where: { ownerId: owner.id }, select: { sharePercent: true } }),
      database.ownershipHistory.findMany({ where: { parcel: { owners: { some: { ownerId: owner.id } } } }, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, eventType: true, effectiveAt: true, parcel: { select: { parcelNumber: true } } } }),
    ]);
    const owned = await database.parcel.findMany({ where: { owners: { some: { ownerId: owner.id } } }, select: { status: true, district: { select: { name: true } } } });
    const countBy = (key) => Object.entries(owned.reduce((counts, item) => { const label = key(item); counts[label] = (counts[label] || 0) + 1; return counts; }, {})).map(([label, value]) => ({ label, value }));
    return { ownedParcels, ownershipShares: shares.reduce((total, item) => total + Number(item.sharePercent), 0), pendingTransfers, currentCertificates, recentActivity, analytics: { parcelsByStatus: countBy((item) => item.status), parcelsByDistrict: countBy((item) => item.district.name) } };
  }

  const common = await Promise.all([
    database.parcel.count({ where: { status: "REGISTERED" } }),
    database.parcel.count({ where: { status: "PENDING_SURVEY" } }),
    database.owner.count(),
    database.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);
  const summary = { registeredParcels: common[0], pendingSurveys: common[1], owners: common[2], openDisputes: common[3] };

  if (user.role === "SURVEYOR") {
    const [assignedPending, inProgressSurveys, verifiedSurveys, returnedSurveys] = await Promise.all([
      database.survey.count({ where: { status: "PENDING", OR: [{ surveyorId: user.id }, { surveyorId: null }] } }),
      database.survey.count({ where: { status: "IN_PROGRESS", surveyorId: user.id } }),
      database.survey.count({ where: { surveyorId: user.id, status: "VERIFIED" } }),
      database.parcel.count({ where: { status: "RETURNED_FOR_CORRECTION" } }),
    ]);
    const analytics = await getParcelAnalytics(database);
    return { pendingSurveys: assignedPending, inProgressSurveys, verifiedSurveys, returnedSurveys, analytics };
  }

  if (user.role === "ADMIN") {
    const [users, roles, districts, feeSettings, totalParcels, recentSystemActivity] = await Promise.all([database.user.count(), database.role.count(), database.district.count(), database.feeSetting.count(), database.parcel.count(), database.auditLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, action: true, createdAt: true, user: { select: { fullName: true } } } })]);
    return { ...summary, users, roles, districts, feeSettings, totalParcels, recentActivity: recentSystemActivity, analytics: await getParcelAnalytics(database) };
  }
  if (user.role === "REGISTRAR") {
    const [pendingRegistrationApprovals, pendingTransferApprovals, activeEncumbrances, certificateIssuanceTasks] = await Promise.all([
      database.parcel.count({ where: { status: "VERIFIED" } }), database.transfer.count({ where: { status: "REGISTRAR_REVIEW" } }), database.encumbrance.count({ where: { status: "ACTIVE" } }), database.parcel.count({ where: { status: "REGISTERED", certificates: { none: { status: "CURRENT" } } } }),
    ]);
    return { ...summary, pendingRegistrationApprovals, pendingTransferApprovals, activeEncumbrances, certificateIssuanceTasks, analytics: await getParcelAnalytics(database) };
  }
  if (user.role === "CLERK") {
    const [pendingRegistrations, registrationTasks] = await Promise.all([database.parcel.count({ where: { status: { in: ["PENDING_SURVEY", "RETURNED_FOR_CORRECTION"] } } }), database.survey.count({ where: { status: { in: ["PENDING", "CANNOT_VERIFY"] } } })]);
    return { ...summary, pendingRegistrations, registrationTasks, analytics: await getParcelAnalytics(database) };
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
