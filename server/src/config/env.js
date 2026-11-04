import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CLIENT_URL: z.url().default("http://localhost:5173"),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = result.data;

export function requireDatabaseEnv() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for database-backed operations. Copy .env.example to .env and provide PostgreSQL credentials.");
  return env.DATABASE_URL;
}

export function requireAuthEnv() {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET is required for authentication and must contain at least 32 characters.");
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for authentication.");
}
