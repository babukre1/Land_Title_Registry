-- AlterTable
ALTER TABLE "districts" ADD COLUMN     "next_parcel_number" INTEGER NOT NULL DEFAULT 1;

-- Continue after existing parcel suffixes without relying on COUNT(*) during registration.
UPDATE "districts" d
SET "next_parcel_number" = COALESCE((
  SELECT MAX(split_part(p."parcel_number", '-', 3)::integer) + 1
  FROM "parcels" p
  WHERE p."district_id" = d."id"
), 1);

ALTER TABLE "districts" ADD CONSTRAINT "districts_next_parcel_number_positive"
CHECK ("next_parcel_number" > 0);

-- AlterTable
ALTER TABLE "parcel_candidates" ADD COLUMN     "dispute_id" INTEGER,
ADD COLUMN     "idempotency_key" VARCHAR(80) NOT NULL,
ADD COLUMN     "land_use" "LandUse" NOT NULL,
ADD COLUMN     "owner_snapshot" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "parcels" ADD COLUMN     "registration_key" VARCHAR(80);

-- AlterTable
ALTER TABLE "surveys" ALTER COLUMN "surveyor_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "dispute_parties" (
    "id" SERIAL NOT NULL,
    "dispute_id" INTEGER NOT NULL,
    "owner_id" INTEGER,
    "display_name" VARCHAR(200) NOT NULL,
    "party_role" VARCHAR(40) NOT NULL,
    "recorded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_parties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dispute_parties_dispute_id_idx" ON "dispute_parties"("dispute_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_parties_dispute_id_owner_id_party_role_key" ON "dispute_parties"("dispute_id", "owner_id", "party_role");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_candidates_idempotency_key_key" ON "parcel_candidates"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_candidates_dispute_id_key" ON "parcel_candidates"("dispute_id");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_registration_key_key" ON "parcels"("registration_key");

-- AddForeignKey
ALTER TABLE "dispute_parties" ADD CONSTRAINT "dispute_parties_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_parties" ADD CONSTRAINT "dispute_parties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_parties" ADD CONSTRAINT "dispute_parties_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_candidates" ADD CONSTRAINT "parcel_candidates_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
