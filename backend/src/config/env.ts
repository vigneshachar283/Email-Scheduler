import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.string().default("4000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_PASSWORD: z.string().optional(),

  // Worker configuration
  WORKER_CONCURRENCY: z.string().default("5"),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.string().default("2000"),
  MAX_EMAILS_PER_HOUR_GLOBAL: z.string().default("500"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default("http://localhost:4000/auth/google/callback"),

  // JWT used after successful OAuth login
  JWT_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = {
  PORT: Number(parsed.data.PORT),
  CORS_ORIGIN: parsed.data.CORS_ORIGIN,

  DATABASE_URL: parsed.data.DATABASE_URL,

  REDIS_HOST: parsed.data.REDIS_HOST,
  REDIS_PORT: Number(parsed.data.REDIS_PORT),
  REDIS_PASSWORD: parsed.data.REDIS_PASSWORD,

  WORKER_CONCURRENCY: Number(parsed.data.WORKER_CONCURRENCY),
  MIN_DELAY_BETWEEN_EMAILS_MS: Number(
    parsed.data.MIN_DELAY_BETWEEN_EMAILS_MS
  ),
  MAX_EMAILS_PER_HOUR_GLOBAL: Number(
    parsed.data.MAX_EMAILS_PER_HOUR_GLOBAL
  ),

  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: parsed.data.GOOGLE_CALLBACK_URL,

  JWT_SECRET: parsed.data.JWT_SECRET,
};