import IORedis from "ioredis";
import { env } from "../config/env";

export const redisConnection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  tls: {
    servername: env.REDIS_HOST,
  },
  maxRetriesPerRequest: null,
});


redisConnection.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});