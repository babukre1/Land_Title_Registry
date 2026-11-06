ALTER TABLE "documents" ADD COLUMN "file_size" INTEGER;
UPDATE "documents" SET "file_size" = 0 WHERE "file_size" IS NULL;
ALTER TABLE "documents" ALTER COLUMN "file_size" SET NOT NULL;
ALTER TABLE "documents" ADD CONSTRAINT "documents_file_size_check" CHECK ("file_size" >= 0 AND "file_size" <= 10485760);

ALTER TABLE "surveys"
  ADD COLUMN "verified_geometry" geometry(Polygon,4326),
  ADD COLUMN "verified_area_m2" DECIMAL(14,2);

UPDATE "surveys" s
SET verified_geometry = p.geometry, verified_area_m2 = p.area_m2
FROM "parcels" p
WHERE s.parcel_id = p.id AND s.status = 'VERIFIED';

ALTER TABLE "surveys" ADD CONSTRAINT "survey_verified_boundary_check" CHECK (
  (status <> 'VERIFIED') OR
  (report_document_id IS NOT NULL AND verified_at IS NOT NULL AND verified_geometry IS NOT NULL AND verified_area_m2 > 0)
);

CREATE UNIQUE INDEX "ownership_history_one_registration_per_parcel"
ON "ownership_history" ("parcel_id") WHERE "event_type" = 'REGISTRATION';
