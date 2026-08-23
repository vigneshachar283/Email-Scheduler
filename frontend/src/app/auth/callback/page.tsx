"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession } from "@/lib/auth";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      router.replace("/login");
      return;
    }

  
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      const user = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        avatarUrl: payload.avatarUrl,
      };

      saveSession(token, user);
      router.replace("/dashboard");
    } catch (error) {
      console.error("Invalid token:", error);
      router.replace("/login");
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-gray-500">Completing sign in...</p>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}