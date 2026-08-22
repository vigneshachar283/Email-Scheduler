"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
exports.redisConnection = new ioredis_1.default({
    host: env_1.env.REDIS_HOST,
    port: env_1.env.REDIS_PORT,
    password: env_1.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});
exports.redisConnection.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
});
//# sourceMappingURL=connection.js.map