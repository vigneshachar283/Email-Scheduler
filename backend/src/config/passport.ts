import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        name: profile.displayName || "Google User",
        email: profile.emails?.[0]?.value || "",
        avatarUrl: profile.photos?.[0]?.value || "",
      };

      if (!user.email) {
        return done(new Error("Google account did not provide an email"));
      }

      return done(null, user);
    }
  )
);

export default passport;