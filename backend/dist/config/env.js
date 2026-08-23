"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    
    PORT: zod_1.z.string().default("4000"),
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:3000"),
    
    DATABASE_URL: zod_1.z.string(),
    
    REDIS_HOST: zod_1.z.string().default("127.0.0.1"),
    REDIS_PORT: zod_1.z.string().default("6379"),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    
    WORKER_CONCURRENCY: zod_1.z.string().default("5"),
    MIN_DELAY_BETWEEN_EMAILS_MS: zod_1.z.string().default("2000"),
    MAX_EMAILS_PER_HOUR_GLOBAL: zod_1.z.string().default("500"),
    
    GOOGLE_CLIENT_ID: zod_1.z.string().min(1),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().min(1),
    GOOGLE_CALLBACK_URL: zod_1.z
        .string()
        .default("http://localhost:4000/auth/google/callback"),
    
    JWT_SECRET: zod_1.z.string().min(1),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = {
    PORT: Number(parsed.data.PORT),
    CORS_ORIGIN: parsed.data.CORS_ORIGIN,
    DATABASE_URL: parsed.data.DATABASE_URL,
    REDIS_HOST: parsed.data.REDIS_HOST,
    REDIS_PORT: Number(parsed.data.REDIS_PORT),
    REDIS_PASSWORD: parsed.data.REDIS_PASSWORD,
    WORKER_CONCURRENCY: Number(parsed.data.WORKER_CONCURRENCY),
    MIN_DELAY_BETWEEN_EMAILS_MS: Number(parsed.data.MIN_DELAY_BETWEEN_EMAILS_MS),
    MAX_EMAILS_PER_HOUR_GLOBAL: Number(parsed.data.MAX_EMAILS_PER_HOUR_GLOBAL),
    GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: parsed.data.GOOGLE_CALLBACK_URL,
    JWT_SECRET: parsed.data.JWT_SECRET,
};
