"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { EmailTable } from "@/components/EmailTable";
import { ComposeModal } from "@/components/ComposeModal";
import type { User, EmailJobRow } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [rows, setRows] = useState<EmailJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser) {
      router.replace("/login");
      return;
    }
    setUser(sessionUser);
  }, [router]);

  const loadData = useCallback(async (which: "scheduled" | "sent") => {
    setLoading(true);
    try {
      const res = which === "scheduled" ? await api.scheduledEmails() : await api.sentEmails();
      setRows(res.items);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData(tab);
  }, [user, tab, loadData]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <Header user={user} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {(["scheduled", "sent"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  tab === t ? "bg-brand-500 text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t === "scheduled" ? "Scheduled Emails" : "Sent Emails"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCompose(true)}
            className="text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg transition"
          >
            + Compose New Email
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmailTable rows={rows} loading={loading} mode={tab} />
        </div>
      </main>

      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} onScheduled={() => loadData("scheduled")} />
      )}
    </div>
  );
}
