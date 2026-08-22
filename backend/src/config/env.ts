import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string(),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_PASSWORD: z.string().optional(),

  // Worker tuning — all configurable, nothing hardcoded per assignment spec
  WORKER_CONCURRENCY: z.string().default("5"),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.string().default("2000"),
  MAX_EMAILS_PER_HOUR_GLOBAL: z.string().default("500"),

  // Mock auth (real Google OAuth intentionally out of scope for this portfolio build)
  MOCK_AUTH_SECRET: z.string().default("dev-secret-change-me"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  PORT: Number(parsed.data.PORT),
  DATABASE_URL: parsed.data.DATABASE_URL,
  REDIS_HOST: parsed.data.REDIS_HOST,
  REDIS_PORT: Number(parsed.data.REDIS_PORT),
  REDIS_PASSWORD: parsed.data.REDIS_PASSWORD,
  WORKER_CONCURRENCY: Number(parsed.data.WORKER_CONCURRENCY),
  MIN_DELAY_BETWEEN_EMAILS_MS: Number(parsed.data.MIN_DELAY_BETWEEN_EMAILS_MS),
  MAX_EMAILS_PER_HOUR_GLOBAL: Number(parsed.data.MAX_EMAILS_PER_HOUR_GLOBAL),
  MOCK_AUTH_SECRET: parsed.data.MOCK_AUTH_SECRET,
  CORS_ORIGIN: parsed.data.CORS_ORIGIN,
};
