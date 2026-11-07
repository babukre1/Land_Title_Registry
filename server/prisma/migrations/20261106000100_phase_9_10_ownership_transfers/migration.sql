ALTER TABLE "transfers"
  ADD COLUMN "seller_snapshot" JSONB,
  ADD COLUMN "buyer_rejected_at" TIMESTAMPTZ(3),
  ADD COLUMN "clerk_review_notes" TEXT,
  ADD COLUMN "rejection_reason" TEXT;

UPDATE "transfers" t
SET "seller_snapshot" = jsonb_build_object(
  'owners', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'ownerId', po.owner_id,
      'name', COALESCE(o.full_name, o.company_name),
      'sharePercent', to_char(po.share_percent, 'FM999990.00')
    ) ORDER BY po.owner_id)
    FROM parcel_owners po JOIN owners o ON o.id = po.owner_id
    WHERE po.parcel_id = t.parcel_id
  ), '[]'::jsonb)
)
WHERE "seller_snapshot" IS NULL;

ALTER TABLE "transfers" ALTER COLUMN "seller_snapshot" SET NOT NULL;

CREATE TABLE "transfer_documents" (
  "id" SERIAL NOT NULL,
  "transfer_id" INTEGER NOT NULL,
  "document_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transfer_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transfer_documents_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "transfer_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "transfer_documents_transfer_id_document_id_key" ON "transfer_documents"("transfer_id", "document_id");
CREATE INDEX "transfer_documents_transfer_id_idx" ON "transfer_documents"("transfer_id");
CREATE UNIQUE INDEX "ownership_history_transfer_id_key" ON "ownership_history"("transfer_id") WHERE "transfer_id" IS NOT NULL;

ALTER TABLE "transfers" ADD CONSTRAINT "transfers_final_reason_check" CHECK (
  ("status" <> 'CANCELLED' OR nullif(trim("cancellation_reason"), '') IS NOT NULL)
  AND ("status" <> 'REJECTED' OR nullif(trim("rejection_reason"), '') IS NOT NULL)
);
