"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const mockAuth_1 = require("../middleware/mockAuth");
const crypto_1 = __importDefault(require("crypto"));
exports.authRouter = (0, express_1.Router)();
/**
 * Mock "Google login". Real flow would redirect to Google's consent screen
 * and land here on callback with a verified profile; here we just accept
 * whatever name/email the frontend sends (its own hardcoded demo user) and
 * issue a signed token, so the rest of the app (header, protected routes)
 * behaves exactly as it would with real OAuth wired in.
 */
exports.authRouter.post("/mock-login", (req, res) => {
    const { name, email } = req.body ?? {};
    const user = {
        id: crypto_1.default.randomUUID(),
        name: name || "Demo User",
        email: email || "demo.user@example.com",
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "Demo User")}`,
    };
    const token = (0, mockAuth_1.issueMockToken)(user);
    res.json({ token, user });
});
exports.authRouter.get("/me", mockAuth_1.requireAuth, (req, res) => {
    res.json({ user: req.user });
});
//# sourceMappingURL=auth.js.map