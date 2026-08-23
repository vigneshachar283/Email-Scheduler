"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_1 = require("../middleware/auth");
exports.authRouter = (0, express_1.Router)();
// Redirect the user to Google's login/consent screen
exports.authRouter.get("/google", passport_1.default.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
}));
// Google redirects the user here after successful authentication
exports.authRouter.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/login`,
}), (req, res) => {
    const googleUser = req.user;
    const token = (0, auth_1.issueAppToken)(googleUser);
    // Send the user back to the frontend with the app token.
    res.redirect(`${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/auth/callback?token=${encodeURIComponent(token)}`);
});
exports.authRouter.get("/me", auth_1.requireAuth, (req, res) => {
    res.json({ user: req.user });
});
//# sourceMappingURL=auth.js.map