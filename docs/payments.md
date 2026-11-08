# Mock mobile-money payments

The payment workflow is implemented as a judge-safe simulation. It does not contact a real mobile-money provider and must never be presented as real settlement.

An administrator configures the active percentage rate and minimum fee from **Admin settings**. Updating the fee appends a new effective setting and an audit entry; it does not rewrite prior settings. The server calculates the authoritative fee with exact decimal arithmetic as the greater of the configured percentage of the declared transfer value and the minimum fee.

Only the intended buyer can submit the mock payment after seller consent, buyer acceptance, document upload, and clerk approval. `POST /api/transfers/:id/payment` accepts the simulated provider, payer phone, and confirmation reference. Under a transaction lock it creates one `PAID` payment, advances the transfer from `AWAITING_PAYMENT` to `REGISTRAR_REVIEW`, records an audit event, and queues an SMS notification in the outbox. Repeating the same successful action returns the existing receipt instead of charging twice. The database also enforces at most one paid record per transfer.

The registrar still rechecks payment, ownership, consent, documents, disputes, and encumbrances at final approval. A browser cannot skip those server-side gates.
