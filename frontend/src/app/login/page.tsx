"use client";

import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

const handleGoogleLogin = () => {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  window.location.href = `${API_BASE}/auth/google`;
};

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xl font-semibold mb-3">
            ES
          </div>

          <h1 className="text-lg font-semibold text-gray-900">
            Email Scheduler
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Sign in to manage your campaigns
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 transition disabled:opacity-60"
        >
          {loading ? "Redirecting to Google..." : "Sign in with Google"}
        </button>

        <p className="text-[11px] text-center text-gray-400 pt-3">
          Securely sign in using your Google account.
        </p>
      </div>
    </main>
  );
}