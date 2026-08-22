import type { EmailJobRow } from "@/types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  rows: EmailJobRow[];
  loading: boolean;
  mode: "scheduled" | "sent";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailTable({ rows, loading, mode }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 mb-3" />
        <p className="text-sm font-medium text-gray-700">
          {mode === "scheduled" ? "No scheduled emails yet" : "No emails sent yet"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {mode === "scheduled"
            ? "Compose a new campaign to see it here."
            : "Sent and failed emails will show up here."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th className="py-2.5 px-6 font-medium">Recipient</th>
            <th className="py-2.5 px-6 font-medium">Subject</th>
            <th className="py-2.5 px-6 font-medium">{mode === "scheduled" ? "Scheduled for" : "Sent at"}</th>
            <th className="py-2.5 px-6 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
              <td className="py-3 px-6 text-gray-800">{row.recipientEmail}</td>
              <td className="py-3 px-6 text-gray-600 max-w-xs truncate">{row.subject}</td>
              <td className="py-3 px-6 text-gray-500">
                {formatDate(mode === "scheduled" ? row.scheduledFor : row.sentAt)}
              </td>
              <td className="py-3 px-6">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
