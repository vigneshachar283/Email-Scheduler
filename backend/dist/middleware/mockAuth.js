"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueMockToken = issueMockToken;
exports.requireAuth = requireAuth;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
function sign(payload) {
    return crypto_1.default.createHmac("sha256", env_1.env.MOCK_AUTH_SECRET).update(payload).digest("hex");
}
function issueMockToken(user) {
    const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
    const signature = sign(payload);
    return `${payload}.${signature}`;
}
function verifyMockToken(token) {
    const [payload, signature] = token.split(".");
    if (!payload || !signature)
        return null;
    if (sign(payload) !== signature)
        return null;
    try {
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    }
    catch {
        return null;
    }
}
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
        return res.status(401).json({ error: "unauthorized", message: "Missing bearer token" });
    }
    const user = verifyMockToken(token);
    if (!user) {
        return res.status(401).json({ error: "unauthorized", message: "Invalid or tampered token" });
    }
    req.user = user;
    next();
}
//# sourceMappingURL=mockAuth.js.map