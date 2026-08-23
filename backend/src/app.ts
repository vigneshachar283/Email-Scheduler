import express from "express";
import cors from "cors";
import "express-async-errors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { senderRouter } from "./routes/senders";
import { emailsRouter } from "./routes/emails";
import passport from "passport";
import "./config/passport";

export const app = express();


app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(passport.initialize());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/senders", senderRouter);
app.use("/emails", emailsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(err.status ?? 500).json({ error: "internal_error", message: err.message });
});
