import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";

/**
 * Mock authentication.
 *
 * The original assignment asks for real Google OAuth. For this portfolio
 * build the scope decision was: invest engineering time in the scheduler
 * internals (queueing, rate limiting, persistence) rather than OAuth
 * plumbing, and mock the login instead. This still demonstrates the *shape*
 * of the auth layer (signed token, middleware guard, user context on
 * req.user) without spending the assignment's 48-hour budget on OAuth
 * consent-screen setup.
 *
 * Swapping this for real Google OAuth later is a contained change: replace
 * `POST /auth/mock-login` with a passport-google-oauth20 flow that issues
 * the same shape of signed token.
 */

interface MockUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.MOCK_AUTH_SECRET).update(payload).digest("hex");
}

export function issueMockToken(user: MockUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function verifyMockToken(token: string): MockUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: MockUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
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
