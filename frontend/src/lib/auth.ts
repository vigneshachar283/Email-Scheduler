"use client";

import type { User } from "@/types";

export function saveSession(token: string, user: User) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
}

export function getSessionUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}
