import { Prisma } from "@prisma/client";

export function validateOwnershipShares(owners) {
  if (!Array.isArray(owners) || owners.length === 0) {
    throw Object.assign(new Error("At least one owner is required"), { status: 422 });
  }

  const total = owners.reduce((sum, owner) => {
    const share = new Prisma.Decimal(owner.sharePercent);
    if (share.lte(0) || share.gt(100)) throw Object.assign(new Error("Each ownership share must be greater than 0 and no more than 100"), { status: 422 });
    return sum.plus(share);
  }, new Prisma.Decimal(0));

  if (!total.equals(100)) throw Object.assign(new Error(`Approved ownership shares must total exactly 100%; received ${total.toFixed(2)}%`), { status: 422 });
  return true;
}
