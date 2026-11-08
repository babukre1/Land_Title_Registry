import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed the database.");
if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 8) {
  throw new Error("DEMO_PASSWORD is required for seed accounts and must be at least 8 characters.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const roleData = [
  ["OWNER", "Citizen account linked to an ownership identity."],
  ["CLERK", "Prepares registry and transfer documentation."],
  ["SURVEYOR", "Verifies parcel boundaries and survey evidence."],
  ["REGISTRAR", "Provides legal registration and transfer approvals."],
  ["ADMIN", "Manages accounts and registry configuration."],
];

const userData = [
  ["Aamina Cabdi", "admin@example.com", "+252610000001", "ADMIN"],
  ["Maxamed Nuur", "registrar@example.com", "+252610000002", "REGISTRAR"],
  ["Hodan Warsame", "surveyor@example.com", "+252610000003", "SURVEYOR"],
  ["Cabdiraxmaan Cali", "clerk@example.com", "+252610000004", "CLERK"],
  ["Fadumo Xasan", "owner@example.com", "+252610000005", "OWNER"],
];

async function seedRolesAndUsers(passwordHash) {
  const roles = {};
  for (const [name, description] of roleData) {
    roles[name] = await prisma.role.upsert({ where: { name }, update: { description }, create: { name, description } });
  }
  const users = {};
  for (const [fullName, email, phone, roleName] of userData) {
    users[roleName] = await prisma.user.upsert({
      where: { email },
      update: { fullName, phone, passwordHash, roleId: roles[roleName].id, isActive: true },
      create: { fullName, email, phone, passwordHash, roleId: roles[roleName].id },
    });
  }
  users.BUYER = await prisma.user.upsert({
    where: { email: "buyer@example.com" },
    update: { fullName: "Sahra Maxamed", phone: "+252610000006", passwordHash, roleId: roles.OWNER.id, isActive: true },
    create: { fullName: "Sahra Maxamed", email: "buyer@example.com", phone: "+252610000006", passwordHash, roleId: roles.OWNER.id },
  });
  return users;
}

async function seedDistricts() {
  const data = [
    ["Hodan", "HDN", "Banaadir", "MGQ"],
    ["Wadajir", "WDJ", "Banaadir", "MGQ"],
    ["Hamar Weyne", "HMW", "Banaadir", "MGQ"],
    ["Yaqshid", "YQS", "Banaadir", "MGQ"],
    ["Karaan", "KRN", "Banaadir", "MGQ"],
  ];
  const districts = {};
  for (const [name, code, regionName, regionCode] of data) {
    districts[code] = await prisma.district.upsert({
      where: { regionCode_code: { regionCode, code } },
      update: { name, regionName },
      create: { name, code, regionName, regionCode },
    });
  }
  return districts;
}

async function seedOwners(users) {
  const fadumo = await prisma.owner.upsert({
    where: { identityNumber: "SO-NID-100001" },
    update: { fullName: "Fadumo Xasan", userId: users.OWNER.id },
    create: { ownerType: "PERSON", fullName: "Fadumo Xasan", identityNumber: "SO-NID-100001", phone: "+252610000005", address: "Hodan, Muqdisho", userId: users.OWNER.id },
  });
  const cabdi = await prisma.owner.upsert({
    where: { identityNumber: "SO-NID-100002" },
    update: { fullName: "Cabdiqaadir Axmed" },
    create: { ownerType: "PERSON", fullName: "Cabdiqaadir Axmed", identityNumber: "SO-NID-100002", phone: "+252615550101", address: "Wadajir, Muqdisho" },
  });
  const company = await prisma.owner.upsert({
    where: { registrationNumber: "SO-BRC-2026-0042" },
    update: { companyName: "Hilaac Horumar Ltd" },
    create: { ownerType: "COMPANY", companyName: "Hilaac Horumar Ltd", registrationNumber: "SO-BRC-2026-0042", phone: "+252615550202", email: "registry@hilaac.example.com", address: "Hamar Weyne, Muqdisho" },
  });
  const sahra = await prisma.owner.upsert({
    where: { identityNumber: "SO-NID-100003" },
    update: { fullName: "Sahra Maxamed", userId: users.BUYER.id },
    create: { ownerType: "PERSON", fullName: "Sahra Maxamed", identityNumber: "SO-NID-100003", phone: "+252610000006", address: "Hodan, Muqdisho", userId: users.BUYER.id },
  });
  return { fadumo, cabdi, company, sahra };
}

async function insertParcel({ parcelNumber, districtId, areaName, landUse, geometry, status, createdById, approvedById = null }) {
  await prisma.$executeRaw`
    INSERT INTO parcels (parcel_number, district_id, area_name, land_use, geometry, area_m2, status, created_by_id, approved_by_id, approved_at, created_at, updated_at)
    SELECT ${parcelNumber}, ${districtId}, ${areaName}, ${landUse}::"LandUse",
           geom, ROUND(ST_Area(geom::geography)::numeric, 2), ${status}::"ParcelStatus",
           ${createdById}, ${approvedById}, CASE WHEN ${approvedById}::integer IS NULL THEN NULL ELSE NOW() END, NOW(), NOW()
    FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326) AS geom) shape
    WHERE ST_IsValid(geom)
    ON CONFLICT (parcel_number) DO NOTHING
  `;
  const [parcel] = await prisma.$queryRaw`SELECT id, parcel_number AS "parcelNumber", area_m2 AS "areaM2", status FROM parcels WHERE parcel_number = ${parcelNumber}`;
  if (!parcel) throw new Error(`Unable to seed parcel ${parcelNumber}`);
  return parcel;
}

async function seedParcels(districts, users, owners) {
  const first = await insertParcel({ parcelNumber: "MGQ-HDN-000001", districtId: districts.HDN.id, areaName: "Taleex", landUse: "RESIDENTIAL", geometry: { type: "Polygon", coordinates: [[[45.31800, 2.04100], [45.31850, 2.04100], [45.31850, 2.04145], [45.31800, 2.04145], [45.31800, 2.04100]]] }, status: "REGISTERED", createdById: users.CLERK.id, approvedById: users.REGISTRAR.id });
  const joint = await insertParcel({ parcelNumber: "MGQ-HDN-000002", districtId: districts.HDN.id, areaName: "Soobe", landUse: "COMMERCIAL", geometry: { type: "Polygon", coordinates: [[[45.32000, 2.03900], [45.32055, 2.03900], [45.32055, 2.03940], [45.32000, 2.03940], [45.32000, 2.03900]]] }, status: "REGISTERED", createdById: users.CLERK.id, approvedById: users.REGISTRAR.id });
  const pending = await insertParcel({ parcelNumber: "MGQ-WDJ-000001", districtId: districts.WDJ.id, areaName: "Buulo Xuubey", landUse: "RESIDENTIAL", geometry: { type: "Polygon", coordinates: [[[45.29000, 2.01500], [45.29045, 2.01500], [45.29045, 2.01540], [45.29000, 2.01540], [45.29000, 2.01500]]] }, status: "PENDING_SURVEY", createdById: users.CLERK.id });

  await prisma.$executeRaw`
    UPDATE districts AS d
    SET next_parcel_number = GREATEST(
      d.next_parcel_number,
      COALESCE((
        SELECT MAX(RIGHT(p.parcel_number, 6)::integer) + 1
        FROM parcels p
        WHERE p.district_id = d.id AND p.parcel_number ~ '[0-9]{6}$'
      ), 1)
    )
  `;

  await prisma.parcelOwner.upsert({ where: { parcelId_ownerId: { parcelId: first.id, ownerId: owners.fadumo.id } }, update: { sharePercent: 100 }, create: { parcelId: first.id, ownerId: owners.fadumo.id, sharePercent: 100 } });
  await prisma.parcelOwner.upsert({ where: { parcelId_ownerId: { parcelId: joint.id, ownerId: owners.cabdi.id } }, update: { sharePercent: 60 }, create: { parcelId: joint.id, ownerId: owners.cabdi.id, sharePercent: 60 } });
  await prisma.parcelOwner.upsert({ where: { parcelId_ownerId: { parcelId: joint.id, ownerId: owners.company.id } }, update: { sharePercent: 40 }, create: { parcelId: joint.id, ownerId: owners.company.id, sharePercent: 40 } });

  const survey = await prisma.survey.findFirst({ where: { parcelId: pending.id, surveyorId: users.SURVEYOR.id } });
  if (!survey) await prisma.survey.create({ data: { parcelId: pending.id, surveyorId: users.SURVEYOR.id, status: "PENDING", notes: "Initial boundary verification assigned." } });

  const histories = [
    [first, [{ ownerId: owners.fadumo.id, displayName: "Fadumo Xasan", sharePercent: "100.00" }]],
    [joint, [{ ownerId: owners.cabdi.id, displayName: "Cabdiqaadir Axmed", sharePercent: "60.00" }, { ownerId: owners.company.id, displayName: "Hilaac Horumar Ltd", sharePercent: "40.00" }]],
  ];
  for (const [parcel, snapshot] of histories) {
    await prisma.$executeRaw`
      INSERT INTO ownership_history (parcel_id, event_type, effective_at, approved_by_id, ownership_snapshot, created_at)
      SELECT ${parcel.id}, 'REGISTRATION'::"OwnershipEventType", NOW(), ${users.REGISTRAR.id}, ${JSON.stringify(snapshot)}::jsonb, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM ownership_history WHERE parcel_id = ${parcel.id} AND event_type = 'REGISTRATION')
    `;
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
  const users = await seedRolesAndUsers(passwordHash);
  const districts = await seedDistricts();
  const owners = await seedOwners(users);
  await seedParcels(districts, users, owners);
  const feeSetting = await prisma.feeSetting.findFirst();
  if (!feeSetting) await prisma.feeSetting.create({ data: { percentageRate: 2, minimumFee: 50, updatedById: users.ADMIN.id } });
  console.log("Seed completed: roles, demo seller/buyer users, districts, owners, parcels, survey, history, and fee settings.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
