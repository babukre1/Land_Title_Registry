/** Queues a simulated SMS for the in-app outbox; no external SMS provider is contacted. */
/** Queues a simulated SMS in the supplied transaction and returns the outbox row; no external provider is contacted. */
export async function queueSms(database, { recipientPhone, message }) {
  return database.smsOutbox.create({ data: { recipientPhone, message, status: "PENDING" } });
}
