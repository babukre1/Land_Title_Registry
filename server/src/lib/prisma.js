import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireDatabaseEnv } from "../config/env.js";

let prisma;

export function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: requireDatabaseEnv() });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) await prisma.$disconnect();
  prisma = undefined;
}
