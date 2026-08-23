import { Router } from "express";
import passport from "passport";
import { issueAppToken, requireAuth } from "../middleware/auth";

export const authRouter = Router();


authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);


authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/login`,
  }),
  (req, res) => {
    const googleUser = req.user as {
      id: string;
      name: string;
      email: string;
      avatarUrl: string;
    };

    const token = issueAppToken(googleUser);

    
    res.redirect(
      `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/auth/callback?token=${encodeURIComponent(token)}`
    );
  }
);

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});