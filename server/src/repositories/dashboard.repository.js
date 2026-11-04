import { getPrisma } from "../lib/prisma.js";

/** Returns only statistics appropriate for the verified user's role. */
export async function getDashboardSummary(user, database = getPrisma()) {
  if (user.role === "OWNER") {
    const owner = await database.owner.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!owner) return { ownedParcels: 0, pendingTransfers: 0, currentCertificates: 0 };
    const [ownedParcels, pendingTransfers, currentCertificates] = await Promise.all([
      database.parcel.count({ where: { owners: { some: { ownerId: owner.id } } } }),
      database.transfer.count({ where: { buyerOwnerId: owner.id, status: { notIn: ["APPROVED", "CANCELLED", "REJECTED"] } } }),
      database.certificate.count({ where: { status: "CURRENT", parcel: { owners: { some: { ownerId: owner.id } } } } }),
    ]);
    return { ownedParcels, pendingTransfers, currentCertificates };
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
    return { pendingSurveys: assignedPending, verifiedSurveys, returnedSurveys };
  }

  if (user.role === "ADMIN") {
    const [users, districts, totalParcels] = await Promise.all([database.user.count(), database.district.count(), database.parcel.count()]);
    return { ...summary, users, districts, totalParcels };
  }

  return summary;
}
