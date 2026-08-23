import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// Passport already uses Express.User for req.user.
// Extend that type instead of creating a separate AuthRequest type.
declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function issueAppToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function verifyAppToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : undefined;

  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing bearer token",
    });
  }

  const user = verifyAppToken(token);

  if (!user) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid or expired token",
    });
  }

  req.user = user;
  next();
}

export {};