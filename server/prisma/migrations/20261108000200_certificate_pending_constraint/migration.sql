-- A failed or concurrent PDF job must not create several recoverable pending
-- certificate records for the same parcel.
CREATE UNIQUE INDEX "certificates_one_pending_per_parcel" ON "certificates" ("parcel_id")
WHERE "status" = 'PENDING_GENERATION';
