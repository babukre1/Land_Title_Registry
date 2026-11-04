import { getPrisma } from "../lib/prisma.js";

export function listDistricts(database = getPrisma()) {
  return database.district.findMany({
    orderBy: [{ regionName: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, regionName: true, regionCode: true },
  });
}
