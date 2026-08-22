"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("express-async-errors");
const env_1 = require("./config/env");
const auth_1 = require("./routes/auth");
const senders_1 = require("./routes/senders");
const emails_1 = require("./routes/emails");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({ origin: env_1.env.CORS_ORIGIN, credentials: true }));
exports.app.use(express_1.default.json());
exports.app.get("/health", (_req, res) => res.json({ status: "ok" }));
exports.app.use("/auth", auth_1.authRouter);
exports.app.use("/senders", senders_1.senderRouter);
exports.app.use("/emails", emails_1.emailsRouter);
// Centralized error handler — catches anything thrown/rejected in route handlers
exports.app.use((err, _req, res, _next) => {
    console.error("[error]", err);
    res.status(err.status ?? 500).json({ error: "internal_error", message: err.message });
});
//# sourceMappingURL=app.js.map