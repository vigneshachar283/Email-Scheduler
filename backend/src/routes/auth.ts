import { Router } from "express";
import { issueMockToken, requireAuth } from "../middleware/mockAuth";
import crypto from "crypto";

export const authRouter = Router();

/**
 * Mock "Google login". Real flow would redirect to Google's consent screen
 * and land here on callback with a verified profile; here we just accept
 * whatever name/email the frontend sends (its own hardcoded demo user) and
 * issue a signed token, so the rest of the app (header, protected routes)
 * behaves exactly as it would with real OAuth wired in.
 */
authRouter.post("/mock-login", (req, res) => {
  const { name, email } = req.body ?? {};
  const user = {
    id: crypto.randomUUID(),
    name: name || "Demo User",
    email: email || "demo.user@example.com",
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "Demo User")}`,
  };
  const token = issueMockToken(user);
  res.json({ token, user });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
