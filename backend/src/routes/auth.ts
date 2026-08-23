import { Router } from "express";
import passport from "passport";
import { issueAppToken, requireAuth } from "../middleware/auth";

export const authRouter = Router();

// Redirect the user to Google's login/consent screen
authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Google redirects the user here after successful authentication
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

    // Send the user back to the frontend with the app token.
    res.redirect(
      `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/auth/callback?token=${encodeURIComponent(token)}`
    );
  }
);

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});