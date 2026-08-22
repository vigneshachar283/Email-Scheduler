import type { EmailStatus } from "@/types";

const STYLES: Record<EmailStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  QUEUED: "bg-blue-50 text-blue-600",
  RESCHEDULED: "bg-amber-50 text-amber-700",
  SENT: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-600",
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}>
      {status}
    </span>
  );
}
