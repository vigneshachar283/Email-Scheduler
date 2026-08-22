"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import type { User } from "@/types";

export function Header({ user }: { user: User }) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
          ES
        </div>
        <span className="font-semibold text-gray-900">Email Scheduler</span>
      </div>

      <div className="flex items-center gap-3">
        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 leading-tight">{user.name}</p>
          <p className="text-xs text-gray-500 leading-tight">{user.email}</p>
        </div>
        <button
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
          className="ml-2 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
