"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Sender } from "@/types";

interface Props {
  onClose: () => void;
  onScheduled: () => void;
}

export function ComposeModal({ onClose, onScheduled }: Props) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [detectedCount, setDetectedCount] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listSenders()
      .then((list) => {
        setSenders(list);
        if (list[0]) setSenderId(list[0].id);
      })
      .catch(() => {
        // No senders configured yet — user needs to run the seed script.
        setSenders([]);
      });
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) {
      setDetectedCount(null);
      return;
    }
    const text = await f.text();
    const matches = text.match(/[^\s,;<>()"']+@[^\s,;<>()"']+\.[^\s,;<>()"']+/g) ?? [];
    setDetectedCount(new Set(matches.map((m) => m.toLowerCase())).size);
  }

  async function handleSubmit() {
    setError(null);

    if (!senderId) {
      setError("Add a sender first (run the backend seed script), then reopen this form.");
      return;
    }
    if (!subject || !body) {
      setError("Subject and body are required.");
      return;
    }
    if (!file) {
      setError("Upload a CSV/text file of recipient emails.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("senderId", senderId);
      formData.append("startTime", new Date(startTime).toISOString());
      formData.append("delayBetweenEmailsMs", String(delayMs));
      formData.append("hourlyLimit", String(hourlyLimit));
      formData.append("recipientsFile", file);

      await api.scheduleCampaign(formData);
      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to schedule campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Compose new email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Sender</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
            >
              {senders.length === 0 && <option value="">No senders configured</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Subject</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Body</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm h-24 resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Recipients (CSV or .txt)</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="mt-1 w-full text-sm text-gray-600"
            />
            {detectedCount !== null && (
              <p className="text-xs text-brand-600 mt-1">{detectedCount} email address(es) detected</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Start time</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Delay (ms)</label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Hourly limit</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            {submitting ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
