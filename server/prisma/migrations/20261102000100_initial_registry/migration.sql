-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- PostGIS is required before geometry columns and GiST indexes are created.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "LandUse" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'FARM');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('PENDING_SURVEY', 'VERIFIED', 'REGISTERED', 'RETURNED_FOR_CORRECTION', 'DISPUTED');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'CANNOT_VERIFY');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('SALE', 'INHERITANCE', 'GIFT', 'COURT_ORDER');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('AWAITING_OWNER_CONSENT', 'AWAITING_BUYER_ACCEPTANCE', 'CLERK_REVIEW', 'AWAITING_PAYMENT', 'REGISTRAR_REVIEW', 'APPROVED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "OwnershipEventType" AS ENUM ('REGISTRATION', 'SALE', 'INHERITANCE', 'GIFT', 'COURT_ORDER', 'CORRECTION');

-- CreateEnum
CREATE TYPE "EncumbranceType" AS ENUM ('MORTGAGE', 'COURT_HOLD');

-- CreateEnum
CREATE TYPE "EncumbranceStatus" AS ENUM ('ACTIVE', 'LIFTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('CURRENT', 'SUPERSEDED', 'INVALID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EVC_PLUS', 'ZAAD', 'EDAHAB');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'BLOCKED', 'ACCEPTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "role_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "region_name" VARCHAR(100) NOT NULL,
    "region_code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" SERIAL NOT NULL,
    "owner_type" "OwnerType" NOT NULL,
    "full_name" VARCHAR(150),
    "company_name" VARCHAR(200),
    "identity_number" VARCHAR(80),
    "registration_number" VARCHAR(80),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "address" VARCHAR(300),
    "user_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" SERIAL NOT NULL,
    "parcel_number" VARCHAR(40) NOT NULL,
    "district_id" INTEGER NOT NULL,
    "area_name" VARCHAR(150) NOT NULL,
    "land_use" "LandUse" NOT NULL,
    "geometry" geometry(Polygon,4326) NOT NULL,
    "area_m2" DECIMAL(14,2) NOT NULL,
    "status" "ParcelStatus" NOT NULL DEFAULT 'PENDING_SURVEY',
    "created_by_id" INTEGER NOT NULL,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_owners" (
    "id" SERIAL NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "share_percent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parcel_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" SERIAL NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "surveyor_id" INTEGER NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'PENDING',
    "report_document_id" INTEGER,
    "notes" TEXT,
    "cannot_verify_reason" TEXT,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" SERIAL NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "initiated_by_id" INTEGER NOT NULL,
    "buyer_owner_id" INTEGER NOT NULL,
    "transfer_type" "TransferType" NOT NULL,
    "declared_price" DECIMAL(14,2),
    "status" "TransferStatus" NOT NULL DEFAULT 'AWAITING_OWNER_CONSENT',
    "buyer_accepted_at" TIMESTAMPTZ(3),
    "clerk_reviewed_by_id" INTEGER,
    "clerk_reviewed_at" TIMESTAMPTZ(3),
    "registrar_approved_by_id" INTEGER,
    "registrar_approved_at" TIMESTAMPTZ(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_consents" (
    "id" SERIAL NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "consent_status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ownership_history" (
    "id" SERIAL NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "transfer_id" INTEGER,
    "event_type" "OwnershipEventType" NOT NULL,
    "effective_at" TIMESTAMPTZ(3) NOT NULL,
    "price" DECIMAL(14,2),
    "approved_by_id" INTEGER NOT NULL,
    "corrected_entry_id" INTEGER,
    "ownership_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ownership_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encumbrances" (
    "id" SERIAL NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "type" "EncumbranceType" NOT NULL,
    "status" "EncumbranceStatus" NOT NULL DEFAULT 'ACTIVE',
    "bank_name" VARCHAR(200),
    "mortgage_amount" DECIMAL(14,2),
    "court_case_number" VARCHAR(100),
    "created_by_id" INTEGER NOT NULL,
    "lifted_by_id" INTEGER,
    "lifting_reason" TEXT,
    "lifting_document_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifted_at" TIMESTAMPTZ(3),

    CONSTRAINT "encumbrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "opened_by_id" INTEGER NOT NULL,
    "resolved_by_id" INTEGER,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_parcels" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "parcel_id" INTEGER NOT NULL,

    CONSTRAINT "dispute_parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_documents" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "document_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_candidates" (
    "id" SERIAL NOT NULL,
    "proposed_number" VARCHAR(40),
    "district_id" INTEGER NOT NULL,
    "area_name" VARCHAR(150) NOT NULL,
    "proposed_geometry" geometry(Polygon,4326) NOT NULL,
    "proposed_area_m2" DECIMAL(14,2) NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcel_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_conflicts" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "overlap_area_m2" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" SERIAL NOT NULL,
    "certificate_number" VARCHAR(80) NOT NULL,
    "parcel_id" INTEGER NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'CURRENT',
    "issued_by_id" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ(3) NOT NULL,
    "superseded_at" TIMESTAMPTZ(3),
    "verification_token" VARCHAR(128) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "certificate_snapshot" JSONB NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_settings" (
    "id" SERIAL NOT NULL,
    "percentage_rate" DECIMAL(5,2) NOT NULL,
    "minimum_fee" DECIMAL(12,2) NOT NULL,
    "updated_by_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fee_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference_number" VARCHAR(100) NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "details" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_outbox" (
    "id" SERIAL NOT NULL,
    "recipient_phone" VARCHAR(30) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),

    CONSTRAINT "sms_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "districts_region_code_code_key" ON "districts"("region_code", "code");

-- CreateIndex
CREATE UNIQUE INDEX "owners_identity_number_key" ON "owners"("identity_number");

-- CreateIndex
CREATE UNIQUE INDEX "owners_registration_number_key" ON "owners"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "owners_user_id_key" ON "owners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_parcel_number_key" ON "parcels"("parcel_number");

-- CreateIndex
CREATE INDEX "parcels_district_id_status_idx" ON "parcels"("district_id", "status");

-- CreateIndex
CREATE INDEX "parcels_geometry_idx" ON "parcels" USING GIST ("geometry");

-- CreateIndex
CREATE INDEX "parcel_owners_owner_id_idx" ON "parcel_owners"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_owners_parcel_id_owner_id_key" ON "parcel_owners"("parcel_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_stored_name_key" ON "documents"("stored_name");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_id_idx" ON "documents"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "surveys_parcel_id_status_idx" ON "surveys"("parcel_id", "status");

-- CreateIndex
CREATE INDEX "surveys_surveyor_id_status_idx" ON "surveys"("surveyor_id", "status");

-- CreateIndex
CREATE INDEX "transfers_parcel_id_status_idx" ON "transfers"("parcel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_consents_transfer_id_owner_id_key" ON "transfer_consents"("transfer_id", "owner_id");

-- CreateIndex
CREATE INDEX "ownership_history_parcel_id_effective_at_idx" ON "ownership_history"("parcel_id", "effective_at");

-- CreateIndex
CREATE INDEX "encumbrances_parcel_id_status_idx" ON "encumbrances"("parcel_id", "status");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_parcels_dispute_id_parcel_id_key" ON "dispute_parcels"("dispute_id", "parcel_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_documents_dispute_id_document_id_key" ON "dispute_documents"("dispute_id", "document_id");

-- CreateIndex
CREATE INDEX "parcel_candidates_proposed_geometry_idx" ON "parcel_candidates" USING GIST ("proposed_geometry");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_conflicts_candidate_id_parcel_id_key" ON "candidate_conflicts"("candidate_id", "parcel_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "certificates"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_token_key" ON "certificates"("verification_token");

-- CreateIndex
CREATE INDEX "certificates_parcel_id_status_idx" ON "certificates"("parcel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_number_key" ON "payments"("reference_number");

-- CreateIndex
CREATE INDEX "payments_transfer_id_status_idx" ON "payments"("transfer_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "sms_outbox_status_created_at_idx" ON "sms_outbox"("status", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_owners" ADD CONSTRAINT "parcel_owners_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_owners" ADD CONSTRAINT "parcel_owners_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_surveyor_id_fkey" FOREIGN KEY ("surveyor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_report_document_id_fkey" FOREIGN KEY ("report_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_buyer_owner_id_fkey" FOREIGN KEY ("buyer_owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_clerk_reviewed_by_id_fkey" FOREIGN KEY ("clerk_reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_registrar_approved_by_id_fkey" FOREIGN KEY ("registrar_approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_consents" ADD CONSTRAINT "transfer_consents_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_consents" ADD CONSTRAINT "transfer_consents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_corrected_entry_id_fkey" FOREIGN KEY ("corrected_entry_id") REFERENCES "ownership_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_lifted_by_id_fkey" FOREIGN KEY ("lifted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_lifting_document_id_fkey" FOREIGN KEY ("lifting_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_parcels" ADD CONSTRAINT "dispute_parcels_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_parcels" ADD CONSTRAINT "dispute_parcels_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_documents" ADD CONSTRAINT "dispute_documents_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_documents" ADD CONSTRAINT "dispute_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_candidates" ADD CONSTRAINT "parcel_candidates_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_candidates" ADD CONSTRAINT "parcel_candidates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_conflicts" ADD CONSTRAINT "candidate_conflicts_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "parcel_candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_conflicts" ADD CONSTRAINT "candidate_conflicts_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_settings" ADD CONSTRAINT "fee_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain integrity that is clearer and safer at the database boundary.
ALTER TABLE "roles" ADD CONSTRAINT "roles_name_allowed" CHECK ("name" IN ('OWNER', 'CLERK', 'SURVEYOR', 'REGISTRAR', 'ADMIN'));
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized" CHECK ("email" = lower(trim("email")));
ALTER TABLE "owners" ADD CONSTRAINT "owners_type_fields" CHECK (
  ("owner_type" = 'PERSON' AND "full_name" IS NOT NULL AND "identity_number" IS NOT NULL AND "company_name" IS NULL AND "registration_number" IS NULL)
  OR
  ("owner_type" = 'COMPANY' AND "company_name" IS NOT NULL AND "registration_number" IS NOT NULL AND "full_name" IS NULL AND "identity_number" IS NULL)
);
ALTER TABLE "parcel_owners" ADD CONSTRAINT "parcel_owner_share_range" CHECK ("share_percent" > 0 AND "share_percent" <= 100);
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_positive_area" CHECK ("area_m2" > 0);
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_valid_polygon" CHECK (
  ST_SRID("geometry") = 4326
  AND GeometryType("geometry") = 'POLYGON'
  AND ST_IsValid("geometry")
  AND ST_NPoints(ST_ExteriorRing("geometry")) - 1 >= 3
);
ALTER TABLE "parcel_candidates" ADD CONSTRAINT "candidate_positive_area" CHECK ("proposed_area_m2" > 0);
ALTER TABLE "parcel_candidates" ADD CONSTRAINT "candidate_valid_polygon" CHECK (
  ST_SRID("proposed_geometry") = 4326
  AND GeometryType("proposed_geometry") = 'POLYGON'
  AND ST_IsValid("proposed_geometry")
  AND ST_NPoints(ST_ExteriorRing("proposed_geometry")) - 1 >= 3
);
ALTER TABLE "transfers" ADD CONSTRAINT "transfer_cancellation_reason" CHECK ("status" <> 'CANCELLED' OR nullif(trim("cancellation_reason"), '') IS NOT NULL);
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrance_type_fields" CHECK (
  ("type" = 'MORTGAGE' AND "bank_name" IS NOT NULL AND "mortgage_amount" > 0)
  OR ("type" = 'COURT_HOLD' AND "court_case_number" IS NOT NULL)
);
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrance_lifting_fields" CHECK (
  ("status" = 'ACTIVE' AND "lifted_at" IS NULL)
  OR ("status" = 'LIFTED' AND "lifted_at" IS NOT NULL AND "lifted_by_id" IS NOT NULL AND nullif(trim("lifting_reason"), '') IS NOT NULL)
);

-- Exactly one non-final transfer may exist for a parcel at a time.
CREATE UNIQUE INDEX "transfers_one_open_per_parcel" ON "transfers" ("parcel_id")
WHERE "status" NOT IN ('APPROVED', 'CANCELLED', 'REJECTED');

-- Only one certificate may be current for a parcel.
CREATE UNIQUE INDEX "certificates_one_current_per_parcel" ON "certificates" ("parcel_id")
WHERE "status" = 'CURRENT';

-- Legal ownership and audit records are append-only. Corrections are new rows.
CREATE OR REPLACE FUNCTION prevent_append_only_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; UPDATE and DELETE are prohibited', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ownership_history_append_only
BEFORE UPDATE OR DELETE ON "ownership_history"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_changes();

CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_changes();

-- A later boundary-change service may set this transaction-local flag only after
-- completing its registrar approval and overlap checks.
CREATE OR REPLACE FUNCTION protect_registered_parcel_boundary() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('REGISTERED', 'DISPUTED')
     AND (NEW.geometry IS DISTINCT FROM OLD.geometry OR NEW.area_m2 IS DISTINCT FROM OLD.area_m2)
     AND coalesce(current_setting('app.boundary_change_approved', true), 'false') <> 'true' THEN
    RAISE EXCEPTION 'Registered parcel geometry and area require the approved boundary-change workflow'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registered_parcel_boundary_guard
BEFORE UPDATE ON "parcels"
FOR EACH ROW EXECUTE FUNCTION protect_registered_parcel_boundary();
