CREATE UNIQUE INDEX "payments_one_paid_per_transfer"
ON "payments" ("transfer_id")
WHERE "status" = 'PAID';

ALTER TABLE "encumbrances"
ADD CONSTRAINT "encumbrance_lifting_evidence_required"
CHECK ("status" <> 'LIFTED' OR "lifting_document_id" IS NOT NULL);

ALTER TABLE "disputes"
ADD CONSTRAINT "dispute_resolution_fields"
CHECK (
  ("status" <> 'RESOLVED' AND "resolved_at" IS NULL AND "resolved_by_id" IS NULL)
  OR
  ("status" = 'RESOLVED' AND "resolved_at" IS NOT NULL AND "resolved_by_id" IS NOT NULL AND nullif(trim("resolution"), '') IS NOT NULL)
);
