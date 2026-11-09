import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";
import { getLinkedOwner } from "./ownership.service.js";
import { queueSms } from "./notification.service.js";

const PAYMENT_LOCK_KEY = 8092028;

function httpError(message, status = 409) { return Object.assign(new Error(message), { status }); }

/** Loads the newest effective fee setting or throws 503 when the registry has no configuration. */
export async function getCurrentFeeSetting(database = getPrisma()) {
  const setting = await database.feeSetting.findFirst({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, percentageRate: true, minimumFee: true, updatedAt: true } });
  if (!setting) throw httpError("Transfer fee settings are unavailable", 503);
  return setting;
}

/** Appends an administrator fee setting and immutable audit entry; returns the new effective setting. */
export async function updateFeeSetting(input, actor) {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const setting = await transaction.feeSetting.create({ data: { percentageRate: new Prisma.Decimal(input.percentageRate), minimumFee: new Prisma.Decimal(input.minimumFee), updatedById: actor.id }, select: { id: true, percentageRate: true, minimumFee: true, updatedAt: true } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "TRANSFER_FEE_UPDATED", entityType: "FeeSetting", entityId: String(setting.id), details: { percentageRate: String(setting.percentageRate), minimumFee: String(setting.minimumFee) } } });
    return setting;
  });
}

/** Returns the exact-decimal maximum of percentage fee and configured minimum fee. */
export function calculateTransferFee(declaredPrice, setting) {
  const percentage = new Prisma.Decimal(declaredPrice).mul(setting.percentageRate).div(100).toDecimalPlaces(2);
  return Prisma.Decimal.max(percentage, setting.minimumFee);
}

/** Simulates a mobile-money confirmation; no external payment provider is contacted. */
export async function payTransferFee(transferId, input, actor) {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${PAYMENT_LOCK_KEY}, ${transferId})`;
    await transaction.$queryRaw`SELECT id FROM transfers WHERE id=${transferId} FOR UPDATE`;
    const owner = await getLinkedOwner(actor.id, transaction);
    const transfer = await transaction.transfer.findUnique({ where: { id: transferId }, select: { id: true, status: true, declaredPrice: true, buyerOwnerId: true, parcel: { select: { parcelNumber: true } }, payments: { where: { status: "PAID" }, take: 1, select: { id: true, amount: true, paymentMethod: true, referenceNumber: true, paidAt: true } } } });
    if (!transfer) throw httpError("Transfer not found", 404);
    if (transfer.buyerOwnerId !== owner.id) throw httpError("Only the verified buyer may pay the transfer fee", 403);
    if (transfer.payments.length) return { repeated: true, payment: transfer.payments[0] };
    if (transfer.status !== "AWAITING_PAYMENT") throw httpError("This transfer is not awaiting payment");
    const setting = await getCurrentFeeSetting(transaction);
    const amount = calculateTransferFee(transfer.declaredPrice, setting);
    const referenceNumber = `MOCK-${input.paymentMethod}-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
    const paidAt = new Date();
    const payment = await transaction.payment.create({ data: { transferId, amount, paymentMethod: input.paymentMethod, status: "PAID", referenceNumber, paidAt }, select: { id: true, amount: true, paymentMethod: true, status: true, referenceNumber: true, paidAt: true } });
    await transaction.transfer.update({ where: { id: transferId }, data: { status: "REGISTRAR_REVIEW" } });
    await queueSms(transaction, { recipientPhone: input.phone, message: `Demo payment ${referenceNumber} confirmed for transfer #${transferId} (${transfer.parcel.parcelNumber}), USD ${amount.toFixed(2)}.` });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "TRANSFER_FEE_PAID", entityType: "Transfer", entityId: String(transferId), details: { paymentId: payment.id, referenceNumber, amount: amount.toFixed(2), paymentMethod: input.paymentMethod, simulated: true } } });
    return { repeated: false, payment };
  }, { maxWait: 10000, timeout: 30000 });
}
